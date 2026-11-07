/**
 * Unassisted first-run capture, walkthrough 5: Home -> site -> play -> surface -> debrief -> Journal.
 *
 * Same method as tools/walkthrough-4.mjs (fresh context, real clock, no teleport or state injection,
 * no window.__game reads). Adds a site argument so the same player can dive Titanic (the Home
 * primary) or the Great Blue Hole (picked from the Dive sites list, by its visible mission row).
 *
 * Usage (worktree root, Node on PATH, server already running):
 *   node tools/walkthrough-5.mjs desktop|phone|landscape titanic|bluehole
 * Env: WT_BASE=http://localhost:4731/  WT_CAP_S=540  WT_OUT=.cache/codex/shots/walkthrough-5
 *      WT_SEABED_RISE=1 (optional, not used for the primary runs: answer SEABED CLOSE by rising)
 * Output: <WT_OUT>/<site>-<layout>/NN-label.png, events.json, and the console messages in the events.
 *
 * New in 5 versus 4: a `reticle-no-prompt` event for any frame where the reticle sits on the marker
 * but the guidance slot shows no HOLD/SCANNING prompt (with the slot text, so a seabed warning is
 * visible as the cause); an `idle-20s` event for 20 s with an unchanged guidance card; a Journal
 * step after the debrief (tap the visible Journal control if there is one, else log that none is).
 */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const LAYOUTS = {
  desktop: { viewport: { width: 1280, height: 720 }, touch: false, dpr: 1 },
  phone: { viewport: { width: 390, height: 844 }, touch: true, dpr: 2 },
  landscape: { viewport: { width: 844, height: 390 }, touch: true, dpr: 2 },
};
const SITES = {
  titanic: { mission: 'titanic', viaPrimary: true },
  bluehole: { mission: 'great-blue-hole', viaPrimary: false },
};
const layoutName = process.argv[2];
const siteName = process.argv[3] ?? 'titanic';
const layout = LAYOUTS[layoutName];
const site = SITES[siteName];
if (!layout) throw new Error(`layout must be one of ${Object.keys(LAYOUTS).join(', ')}`);
if (!site) throw new Error(`site must be one of ${Object.keys(SITES).join(', ')}`);

const base = process.env.WT_BASE ?? 'http://localhost:4731/';
const capMs = Number(process.env.WT_CAP_S ?? 540) * 1000;
const seabedRise = process.env.WT_SEABED_RISE === '1';
const outDir = resolve(
  process.env.WT_OUT ?? '.cache/codex/shots/walkthrough-5',
  `${siteName}-${layoutName}`,
);
const { width: W, height: H } = layout.viewport;
const MAX_EXTRA_SHOTS = 200; // attempt 1 capped at 40 and lost the debrief and Journal shots

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
  await page
    .screenshot({ path: `${outDir}/${n}-${label}.png` })
    .catch((e) => note('shot-failed', e.message));
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

if (site.viaPrimary) {
  const primaryText = (await page.locator('.home-primary').innerText()).replace(/\n+/g, ' ');
  note('tap-primary', primaryText);
  await tapOrClick(page.locator('.home-primary'));
} else {
  // Not the primary: open Dive sites, then tap the site's visible mission row.
  note('tap-menu', 'Dive sites');
  await tapOrClick(page.getByRole('button', { name: 'Dive sites', exact: true }).first());
  await page.waitForTimeout(700);
  const row = page.locator(`.mission-item.is-mission[data-mission="${site.mission}"]`).first();
  await row.waitFor({ state: 'attached', timeout: 15000 });
  if (layout.touch && (await page.locator('.home-sites.is-collapsed').count())) {
    note('tap-sheet-grab', 'Show all sites (bottom sheet was collapsed)');
    await tapOrClick(page.locator('.home-sites-grab').first());
    await page.waitForTimeout(600);
  }
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, 'sites-list');
  const rowText = (await row.innerText()).replace(/\n+/g, ' | ');
  const visible = await row.isVisible();
  note('sites-row', `${rowText} visible=${visible}`);
  await tapOrClick(row);
}

// ---- Briefing ----
const begin = page.getByRole('button', { name: /Begin dive/i }).first();
await begin.waitFor({ state: 'visible', timeout: 60000 }).catch(() => note('no-briefing', ''));
await page.waitForTimeout(800);
await shot(page, 'briefing');
note(
  'briefing',
  (
    await page
      .locator('.briefing')
      .innerText()
      .catch(() => '?')
  ).replace(/\n+/g, ' | '),
);
await tapOrClick(begin);
note('begin-dive');

// ---- Dive: a simple rule-based player (same rules as walkthrough 4) ----
const readState = () =>
  page.evaluate(() => {
    const vis = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
    const q = (s) => document.querySelector(s);
    const marker = q('.d-scan-world-marker.is-current');
    const m =
      marker && vis(marker)
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
let prevWording = null;
let guideSince = 0;
let scanStartT = null;
let firstScanT = null;
let debriefT = null;
let idleLogged = 0;
let lastSnapT = -99;
let stickPos = null;
let slider = null;
let scanHeld = false;
let gapLogged = -99;
let gapFrames = 0;
let seabedGapFrames = 0;
let seabedFlips = 0;
let prevSeabed = false;

const surfaceT = Math.min(540, Number(process.env.WT_SURFACE_S ?? 540));
let surfaceStarted = false;

while (now() * 1000 < capMs) {
  const s = await readState();

  if (s.guide !== prevGuide) {
    note('guide', s.guide);
    // Shoot only when the card's wording changes, not when a distance number ticks.
    const wording = s.guide.replace(/\d+/g, '#');
    if (wording !== prevWording) {
      await shot(page, `guide-${String(Math.round(now())).padStart(3, '0')}`, { extra: true });
      prevWording = wording;
    }
    prevGuide = s.guide;
    guideSince = now();
  }
  const seabedUp = /SEABED/.test(s.guide);
  if (seabedUp !== prevSeabed) {
    seabedFlips++;
    prevSeabed = seabedUp;
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
  const timeToSurface = (firstScanT !== null && now() > firstScanT + 90) || now() >= surfaceT;
  if (timeToSurface && !surfaceStarted) {
    surfaceStarted = true;
    await setPoint(1, null);
    await setPoint(2, null);
    await setPoint(3, null);
    for (const k of Object.keys(keys)) await setKey(k, false);
    if (layout.touch) {
      await tapOrClick(page.locator('.tc-btn-pause').first()).catch((e) =>
        note('pause-tap-failed', e.message),
      );
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

  // Dead time: the guidance card has not changed for 20 s (the player keeps trying).
  if (now() - guideSince > 20 && now() - idleLogged > 20) {
    idleLogged = now();
    const buttons = await page
      .locator('button:visible')
      .allInnerTexts()
      .catch(() => []);
    note(
      'idle-20s',
      `guide="${s.guide}" marker=${JSON.stringify(s.m)} buttons=${JSON.stringify(buttons.slice(0, 12))}`,
    );
    await shot(page, `idle-${String(Math.round(now())).padStart(3, '0')}`, { extra: true });
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
  const scanningText = /SCANNING|INTERRUPTED/i.test(s.guide);
  want.w = !scanningText && !s.debrief;
  if (dx !== null) {
    if (dx < -0.06) want.a = true;
    else if (dx > 0.06) want.d = true;
  }
  const inReticle = s.m && dx !== null && Math.abs(dx) < 0.25 && dy !== null && Math.abs(dy) < 0.3;
  const promptShown = /HOLD (G|SCAN)|SCANNING|INTERRUPTED/i.test(s.guide);
  // Evidence for question 1: reticle on the target, no ready-to-scan prompt on screen.
  if (inReticle && !promptShown && !s.debrief) {
    gapFrames++;
    if (seabedUp) seabedGapFrames++;
    if (now() - gapLogged > 5) {
      gapLogged = now();
      note(
        'reticle-no-prompt',
        `guide="${s.guide}" seabedWarning=${seabedUp} scanning=${s.scanning} marker=${JSON.stringify(s.m)}`,
      );
      await shot(page, `gap-${String(Math.round(now())).padStart(3, '0')}`, { extra: true });
    }
  }
  want.g = Boolean(inReticle && /HOLD (G|SCAN)|SCANNING/i.test(s.guide));
  const wantsDepth =
    /Space|Ctrl|rise|sink|RISE|SINK/i.test(s.guide) &&
    !scanningText &&
    s.m &&
    dy !== null &&
    Math.abs(dy) > 0.2;
  if (wantsDepth) {
    if (layout.touch) slider = dy < 0 ? 'up' : 'down';
    else if (dy < 0) want.Space = true;
    else want.Control = true;
  }
  if (seabedRise && /SEABED CLOSE/i.test(s.guide)) {
    if (layout.touch) slider = 'up';
    else want.Space = true;
  }

  if (!layout.touch) {
    for (const k of ['w', 'a', 'd', 'g', 'Space', 'Control']) await setKey(k, want[k]);
  } else {
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
    const sl = await centerOf('.tc-slider');
    if (sl) {
      if (slider) {
        const pos = {
          x: sl.x,
          y: slider === 'up' ? sl.y - sl.b.height * 0.35 : sl.y + sl.b.height * 0.35,
        };
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
note(
  'gap-summary',
  `reticle-on-target-no-prompt frames=${gapFrames} (with seabed warning ${seabedGapFrames}) seabed-slot-flips=${seabedFlips}`,
);

// Final frame and debrief.
await page.waitForTimeout(1200);
await shot(page, debriefT !== null ? 'debrief' : 'end-no-debrief', { extra: true });
const debriefText = await page
  .locator('.mission-debrief')
  .innerText()
  .catch(() => null);
if (debriefText) note('debrief-text', debriefText.replace(/\n+/g, ' | '));

// ---- Journal after the debrief: is it reachable, and what does it show? ----
if (debriefT !== null) {
  const debriefButtons = await page
    .locator('button:visible')
    .allInnerTexts()
    .catch(() => []);
  note('debrief-buttons', JSON.stringify(debriefButtons.slice(0, 14)));
  // The debrief's own "Journal" button (exact case); the HUD "JOURNAL" chip is not the debrief path.
  const journal = page
    .getByRole('button', { name: 'Journal', exact: true })
    .filter({ visible: true })
    .first();
  if (await journal.isVisible().catch(() => false)) {
    note('journal-tap', 'Journal (debrief button)');
    await tapOrClick(journal);
    await page.waitForTimeout(1200);
    await shot(page, 'journal', { extra: true });
    const journalText = await page
      .locator('.field-guide.journal')
      .first()
      .innerText()
      .catch(() => '?');
    note('journal-text', journalText.replace(/\s+/g, ' ').slice(0, 500));
  } else {
    note('journal-not-visible', 'no visible Journal control on the debrief');
    await shot(page, 'no-journal', { extra: true });
  }
}

await writeFile(
  `${outDir}/events.json`,
  JSON.stringify(
    {
      layout: layoutName,
      site: siteName,
      mission: site.mission,
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
        gapFrames,
        seabedGapFrames,
        seabedFlips,
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
