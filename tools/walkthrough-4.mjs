/**
 * Unassisted first-run capture: Home -> Dive -> play -> surface -> debrief, one layout per run.
 *
 * A fresh browser context (empty localStorage) opened at the bare URL, the real clock, and no
 * teleport or state injection. The player reads only what is on screen (guidance card text,
 * the current-objective marker, the edge arrow, the scan reticle) and acts through the same
 * controls a finger or keyboard would use. It never reads window.__game.
 *
 * Usage (worktree root, Node on PATH, server already running):
 *   node tools/walkthrough-4.mjs desktop|phone|landscape
 * Env: WT_BASE=http://localhost:4721/  WT_CAP_S=600  WT_OUT=.cache/codex/shots/walkthrough-4
 * Output: <WT_OUT>/<layout>/NN-label.png, <WT_OUT>/<layout>/events.json
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LAYOUTS = {
  desktop: { viewport: { width: 1280, height: 720 }, touch: false, dpr: 1 },
  phone: { viewport: { width: 390, height: 844 }, touch: true, dpr: 2 },
  landscape: { viewport: { width: 844, height: 390 }, touch: true, dpr: 2 },
};
const layoutName = process.argv[2];
const layout = LAYOUTS[layoutName];
if (!layout) throw new Error(`layout must be one of ${Object.keys(LAYOUTS).join(', ')}`);

const base = process.env.WT_BASE ?? 'http://localhost:4721/';
const capMs = Number(process.env.WT_CAP_S ?? 600) * 1000;
const seabedRise = process.env.WT_SEABED_RISE === '1'; // v2: answer SEABED PROXIMITY by rising
const outDir = resolve(
  process.env.WT_OUT ?? '.cache/codex/shots/walkthrough-4',
  layoutName + (process.env.WT_TAG ? `-${process.env.WT_TAG}` : ''),
);
const { width: W, height: H } = layout.viewport;
const MAX_EXTRA_SHOTS = 30;

await mkdir(outDir, { recursive: true });

const events = [];
let t0 = 0;
const now = () => (Date.now() - t0) / 1000;
const note = (kind, detail = '') => {
  const e = { t: Number(now().toFixed(1)), kind, detail: String(detail).slice(0, 600) };
  events.push(e);
  console.log(`${e.t.toFixed(1).padStart(6)} ${kind} ${e.detail}`.slice(0, 300));
};
let shotN = 0;
let extraShots = 0;
const shot = async (page, label, { extra = false } = {}) => {
  if (extra && extraShots >= MAX_EXTRA_SHOTS) return;
  if (extra) extraShots++;
  const n = String(++shotN).padStart(2, '0');
  await page.screenshot({ path: `${outDir}/${n}-${label}.png` }).catch((e) => note('shot-failed', e.message));
};

const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: layout.viewport,
  hasTouch: layout.touch,
  isMobile: layout.touch,
  deviceScaleFactor: layout.dpr,
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') note('console-error', m.text());
});

// ---- Served provenance (document meta only; no game state) ----
await page.goto(base, { waitUntil: 'domcontentloaded' });
const served = await page.evaluate(() => ({
  sha: document.querySelector('meta[name="golden-sha"]')?.getAttribute('content') ?? null,
  dirty: document.querySelector('meta[name="golden-dirty"]')?.getAttribute('content') ?? null,
  mode: document.querySelector('meta[name="golden-build-mode"]')?.getAttribute('content') ?? null,
}));
note('served', JSON.stringify(served));

// ---- Home: the first thing a player sees ----
await page.locator('.home-primary').waitFor({ state: 'visible', timeout: 180000 });
t0 = Date.now(); // real clock starts when the player can first read Home
await page.waitForTimeout(1000);
await shot(page, 'home');
note('home-visible', (await page.locator('.home-screen').innerText()).replace(/\n+/g, ' | '));

const tapOrClick = async (loc) => {
  if (layout.touch) await loc.tap({ force: true });
  else await loc.click({ force: true });
};

// Player picks the big primary button (the recommended dive).
const primaryText = (await page.locator('.home-primary').innerText()).replace(/\n+/g, ' ');
note('tap-primary', primaryText);
await tapOrClick(page.locator('.home-primary'));

// ---- Briefing ----
const begin = page.getByRole('button', { name: /Begin dive/i }).first();
await begin.waitFor({ state: 'visible', timeout: 60000 }).catch(() => note('no-briefing', ''));
await page.waitForTimeout(800);
await shot(page, 'briefing');
note('briefing', (await page.locator('.briefing').innerText().catch(() => '?')).replace(/\n+/g, ' | '));
await tapOrClick(begin);
note('begin-dive');

// ---- Dive: a simple rule-based player ----
const readState = () =>
  page.evaluate(() => {
    const vis = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
    const q = (s) => document.querySelector(s);
    const marker = q('.d-scan-world-marker.is-current');
    const m = marker && vis(marker)
      ? { x: parseFloat(marker.style.left), y: parseFloat(marker.style.top) }
      : null;
    const edge = q('.d-scan-edge');
    const angle = edge && vis(edge) ? parseFloat(edge.style.getPropertyValue('--direction')) : null;
    const body = document.body.innerText;
    return {
      m,
      angle: Number.isFinite(angle) ? angle : null,
      scanning: vis(q('.scan-reticle')),
      guide: (q('.guidance-slot')?.innerText ?? '').replace(/\s+/g, ' ').trim(),
      debrief: !!q('.mission-debrief'),
      newEntry: /New Journal entry/.test(body),
      interrupted: /INTERRUPTED/i.test(body),
      loading: /Loading the/i.test(body),
    };
  });

// Touch: one CDP session, separate touch ids for stick (1), scan (2), depth slider (3).
const cdp = layout.touch ? await ctx.newCDPSession(page) : null;
const points = new Map();
const sendTouch = async (type) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: [...points].map(([id, p]) => ({ id, x: p.x, y: p.y })),
  });
};
const setPoint = async (id, pos) => {
  if (!pos) {
    if (!points.has(id)) return;
    points.delete(id);
    await sendTouch('touchEnd');
    return;
  }
  const had = points.has(id);
  points.set(id, pos);
  await sendTouch(had ? 'touchMove' : 'touchStart');
};
const centerOf = async (sel) => {
  const b = await page.locator(sel).first().boundingBox();
  return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2, b } : null;
};

const keys = { w: false, a: false, d: false, g: false, Space: false, Control: false };
const setKey = async (k, down) => {
  if (keys[k] === down) return;
  keys[k] = down;
  if (down) await page.keyboard.down(k);
  else await page.keyboard.up(k);
};

let prevGuide = null;
let guideSince = 0;
let scanStartT = null;
let firstScanT = null;
let debriefT = null;
let stuckLogged = 0;
let lastSnapT = -99;
let stickPos = null;
let slider = null;
let scanHeld = false;

const surfaceT = Math.min(540, Number(process.env.WT_SURFACE_S ?? 540));
let surfaceStarted = false;

while (now() * 1000 < capMs) {
  const s = await readState();

  if (s.guide !== prevGuide) {
    note('guide', s.guide);
    prevGuide = s.guide;
    guideSince = now();
    await shot(page, `guide-${String(Math.round(now())).padStart(3, '0')}`, { extra: true });
  }
  if (s.loading) note('loading-text-visible', 'Loading the ... text on screen');
  if (s.scanning && scanStartT === null) {
    scanStartT = now();
    note('scan-start', s.guide);
    await shot(page, 'scan-start', { extra: true });
  }
  if (s.newEntry && firstScanT === null) {
    firstScanT = now();
    note('first-scan', s.guide);
    await shot(page, 'first-scan', { extra: true });
  }
  if (s.interrupted) note('scan-interrupted', s.guide);
  if (s.debrief) {
    debriefT = now();
    note('debrief', s.guide);
    break;
  }

  // Surface when the player has had a fair go after a scan, or at the time limit.
  const timeToSurface =
    (firstScanT !== null && now() > firstScanT + 90) || now() >= surfaceT;
  if (timeToSurface && !surfaceStarted) {
    surfaceStarted = true;
    await setPoint(1, null);
    await setPoint(2, null);
    await setPoint(3, null);
    for (const k of Object.keys(keys)) await setKey(k, false);
    if (layout.touch) {
      await tapOrClick(page.locator('.tc-btn-pause').first()).catch((e) => note('pause-tap-failed', e.message));
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(700);
    const surface = page.getByRole('button', { name: /Surface and debrief/i }).first();
    if (await surface.isVisible().catch(() => false)) {
      note('surface-tap', 'Surface and debrief');
      await shot(page, 'pause-surface', { extra: true });
      await tapOrClick(surface);
    } else {
      note('surface-not-found', 'no "Surface and debrief" button visible');
      await shot(page, 'pause-missing', { extra: true });
    }
    continue;
  }

  // Stuck logging (for the note; the player keeps trying).
  if (now() - guideSince > 45 && now() - stuckLogged > 45) {
    stuckLogged = now();
    const buttons = await page
      .locator('button:visible')
      .allInnerTexts()
      .catch(() => []);
    note('stuck-45s', `guide="${s.guide}" marker=${JSON.stringify(s.m)} buttons=${JSON.stringify(buttons.slice(0, 12))}`);
    await shot(page, `stuck-${String(Math.round(now())).padStart(3, '0')}`, { extra: true });
  }

  if (now() - lastSnapT > 30) {
    lastSnapT = now();
    await shot(page, `dive-${String(Math.round(now())).padStart(3, '0')}s`, { extra: true });
  }

  // ---- Decide inputs from what is on screen ----
  const want = { w: false, a: false, d: false, g: false, Space: false, Control: false };
  let dx = null;
  let dy = null;
  if (s.m) {
    dx = (s.m.x - W / 2) / W;
    dy = (s.m.y - H / 2) / H;
  } else if (s.angle !== null) {
    dx = Math.cos(s.angle);
  }
  // Hold still only while the card says SCANNING; keep turning to hold the reticle on the target.
  const scanningText = /SCANNING|INTERRUPTED/i.test(s.guide);
  want.w = !scanningText && !s.debrief;
  if (dx !== null) {
    if (dx < -0.06) want.a = true;
    else if (dx > 0.06) want.d = true;
  }
  // The card says "HOLD G TO SCAN" once the target is in range; the reticle sits on the marker.
  const inReticle = s.m && dx !== null && Math.abs(dx) < 0.25 && dy !== null && Math.abs(dy) < 0.3;
  want.g = Boolean(inReticle && /HOLD (G|SCAN)|SCANNING/i.test(s.guide));
  // The card names the depth keys; the player presses the one toward the target.
  const wantsDepth = /Space|Ctrl|rise|sink/i.test(s.guide) && !scanningText && s.m && dy !== null && Math.abs(dy) > 0.2;
  if (wantsDepth) {
    if (layout.touch) slider = dy < 0 ? 'up' : 'down';
    else if (dy < 0) want.Space = true;
    else want.Control = true;
  }
  // v2 only: the seabed warning names no action; the RISE slider is the obvious answer.
  if (seabedRise && /SEABED PROXIMITY/i.test(s.guide)) {
    if (layout.touch) slider = 'up';
    else want.Space = true;
  }

  if (!layout.touch) {
    for (const k of ['w', 'a', 'd', 'g', 'Space', 'Control']) await setKey(k, want[k]);
  } else {
    // Stick: forward and turn.
    const sc = await centerOf('.tc-stick');
    if (sc) {
      const turn = (want.d ? 1 : 0) - (want.a ? 1 : 0);
      const fwd = want.w ? -1 : 0;
      if (turn || fwd) {
        const pos = { x: sc.x + turn * sc.b.width * 0.35, y: sc.y + fwd * sc.b.height * 0.35 };
        await setPoint(1, pos);
        stickPos = pos;
      } else if (stickPos) {
        await setPoint(1, null);
        stickPos = null;
      }
    }
    // Scan: hold the scan button while on target.
    const scanBtn = await centerOf('.tc-btn-scan');
    if (scanBtn) {
      if (want.g && !scanHeld) {
        await setPoint(2, { x: scanBtn.x, y: scanBtn.y });
        scanHeld = true;
      } else if (!want.g && scanHeld) {
        await setPoint(2, null);
        scanHeld = false;
      }
    }
    // Depth slider: drag the thumb toward the target's side, release when centred.
    const sl = await centerOf('.tc-slider');
    if (sl) {
      if (slider) {
        const pos = { x: sl.x, y: slider === 'up' ? sl.y - sl.b.height * 0.35 : sl.y + sl.b.height * 0.35 };
        await setPoint(3, pos);
      } else if (points.has(3)) {
        await setPoint(3, null);
      }
      slider = null;
    }
  }

  await page.waitForTimeout(150);
}

if (!debriefT && now() * 1000 >= capMs) note('cap-reached', 'no debrief within the cap');

// Final frame.
await page.waitForTimeout(1200);
await shot(page, debriefT !== null ? 'debrief' : 'end-no-debrief');
const debriefText = await page.locator('.mission-debrief').innerText().catch(() => null);
if (debriefText) note('debrief-text', debriefText.replace(/\n+/g, ' | '));

await writeFile(
  `${outDir}/events.json`,
  JSON.stringify(
    {
      layout: layoutName,
      viewport: layout.viewport,
      touch: layout.touch,
      base,
      served,
      tier: 'not set (bare URL, no ?tier param; the game picks its own tier)',
      fresh_context: true,
      summary: {
        firstScanT,
        scanStartT,
        debriefT,
        totalS: Number(now().toFixed(1)),
        pageErrors,
      },
      events,
    },
    null,
    2,
  ),
);
note('done', `scan=${firstScanT} debrief=${debriefT} errors=${pageErrors.length}`);
await browser.close();
