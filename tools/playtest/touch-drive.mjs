// Phone playtest: a casual visitor plays a whole dive with ONLY real touch input (CDP).
// Usage: node tools/playtest/touch-drive.mjs <outDir> <width> <height> [siteId] [baseUrl] [maxSeconds]
//
// No siteId (or TOUCH_FROM_HOME=1): start on the front page and tap its primary Dive button.
// With a siteId: open `?mission=<site>` and begin from the briefing, as a shared link would.
// The player follows the guidance text and the on-screen marker, steers with the stick,
// changes depth with the RISE/SINK slider, holds SCAN when a scan is offered, taps Continue
// on reveals, answers the completion banner (Keep exploring with TOUCH_FULL=1, which runs
// until everything at the site is found; Surface and debrief otherwise) and stops on the
// debrief or at the time cap. Prints one final JSON line.
// TOUCH_SHOTS=0 disables screenshots; TOUCH_LOG=1 logs guidance changes.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(repoRoot, 'package.json'));
const { chromium } = require('@playwright/test');

const [outDir, wArg, hArg, siteArg, baseArg, maxArg] = process.argv.slice(2);
const W = Number(wArg);
const H = Number(hArg);
const SITE = process.env.TOUCH_FROM_HOME === '1' ? '' : (siteArg ?? '');
const BASE = baseArg ?? 'http://127.0.0.1:4952/';
const MAX_S = Number(maxArg) > 0 ? Number(maxArg) : 300;
const FULL = process.env.TOUCH_FULL === '1';
const SHOTS = process.env.TOUCH_SHOTS !== '0';
const LOG = process.env.TOUCH_LOG === '1';
if (!outDir || !(W > 0) || !(H > 0)) {
  console.error('usage: node touch-drive.mjs <outDir> <width> <height> [siteId] [baseUrl] [sec]');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));

const tag = SITE || 'home';
let shotN = 0;
const shot = async (name) => {
  if (!SHOTS) return;
  shotN += 1;
  await page
    .screenshot({
      path: join(outDir, `${tag}-${W}x${H}-${String(shotN).padStart(2, '0')}-${name}.png`),
    })
    .catch(() => {});
};

// ---- real touch via CDP -----------------------------------------------------
const cdp = await ctx.newCDPSession(page);
const points = new Map(); // finger id -> {id,x,y}
const sendTouch = (type, pts) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: pts.map((p) => ({ id: p.id, x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1 })),
  });
const addTouch = async (id, x, y) => {
  points.set(id, { id, x, y });
  await sendTouch('touchStart', [...points.values()]);
};
const moveTouch = async (id, x, y) => {
  const cur = points.get(id);
  if (!cur) return addTouch(id, x, y);
  if (Math.abs(cur.x - x) < 0.5 && Math.abs(cur.y - y) < 0.5) return;
  cur.x = x;
  cur.y = y;
  await sendTouch('touchMove', [...points.values()]);
};
const removeTouch = async (id) => {
  const p = points.get(id);
  if (!p) return;
  points.delete(id);
  await sendTouch('touchEnd', [p]);
};
const releaseAll = async () => {
  if (!points.size) return;
  const all = [...points.values()];
  points.clear();
  await sendTouch('touchEnd', all);
};
/** Tap the centre of a visible element with a real touch; false when it is not on screen. */
const tapEl = async (selector, text) => {
  const box = await page.evaluate(
    ([sel, txt]) => {
      const els = [...document.querySelectorAll(sel)].filter((e) => {
        const r = e.getBoundingClientRect();
        const s = getComputedStyle(e);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== 'hidden' &&
          s.display !== 'none' &&
          !e.closest('[hidden]') &&
          (!txt || e.textContent.trim() === txt)
        );
      });
      const r = els[0]?.getBoundingClientRect();
      return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    },
    [selector, text ?? null],
  );
  if (!box) return false;
  await page.touchscreen.tap(box.x, box.y);
  return true;
};

// ---- open the game like a visitor -------------------------------------------
const startUrl = SITE
  ? new URL(`?mission=${encodeURIComponent(SITE)}`, BASE).href
  : new URL('./', BASE).href;
await page.goto(startUrl);
if (!SITE) {
  await page.locator('.home-primary').first().waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForTimeout(800);
  await shot('home');
  await tapEl('.home-primary');
}
await page.locator('.briefing-begin').first().waitFor({ state: 'visible', timeout: 60000 });
await page.waitForTimeout(600);
await shot('briefing');
await tapEl('.briefing-begin');
await page.waitForFunction(() => window.__game?.scanner && window.__game?.mission, null, {
  timeout: 60000,
});
const site =
  SITE ||
  (await page.evaluate(() => new URL(location.href).searchParams.get('mission') || 'unknown'));
let touchShown = true;
try {
  await page.locator('.tc-root').waitFor({ state: 'visible', timeout: 20000 });
} catch {
  touchShown = false; // reported: a phone must get the on-screen controls without flags
}
await page.waitForTimeout(800);

// Control geometry once the touch layout has settled; re-read on demand.
const readGeometry = () =>
  page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
    };
    return { stick: box('.tc-stick'), slider: box('.tc-slider'), scan: box('.tc-btn-scan') };
  });
const geometry = await readGeometry();
if (!geometry.stick || !geometry.scan) {
  console.log(
    JSON.stringify({ site, viewport: `${W}x${H}`, error: 'touch controls not laid out', errs }),
  );
  await browser.close();
  process.exit(1);
}
const STICK = {
  cx: geometry.stick.x + geometry.stick.w / 2,
  cy: geometry.stick.y + geometry.stick.h / 2,
  r: Math.max(18, geometry.stick.w * 0.42),
};
const SLIDER = geometry.slider
  ? {
      cx: geometry.slider.x + geometry.slider.w / 2,
      cy: geometry.slider.y + geometry.slider.h / 2,
      half: geometry.slider.h * 0.45,
    }
  : null;
const SCAN = { x: geometry.scan.x + geometry.scan.w / 2, y: geometry.scan.y + geometry.scan.h / 2 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Finger 0: stick. Finger 2: slider. Finger 1: SCAN. A thumb each side, so stick + SCAN
// or slider + stick are the only pairs used together (never all three).
const setStick = async (nx, ny) => {
  if (nx === 0 && ny === 0) return removeTouch(0);
  const x = STICK.cx + clamp(nx, -1, 1) * STICK.r;
  const y = STICK.cy + clamp(ny, -1, 1) * STICK.r;
  if (!points.has(0)) await addTouch(0, STICK.cx, STICK.cy);
  await moveTouch(0, x, y);
};
const setSlider = async (n) => {
  // n > 0 rises, n < 0 sinks; null releases (the slider springs back to neutral).
  if (!SLIDER || n === null || Math.abs(n) < 0.15) return removeTouch(2);
  const y = SLIDER.cy - clamp(n, -1, 1) * SLIDER.half;
  if (!points.has(2)) await addTouch(2, SLIDER.cx, SLIDER.cy);
  await moveTouch(2, SLIDER.cx, y);
};
const holdScan = async (on) => {
  if (on && !points.has(1)) await addTouch(1, SCAN.x, SCAN.y);
  else if (!on && points.has(1)) await removeTouch(1);
};

// Key names a touch player must never see.
const KEY_RE =
  /\b(?:hold|press|tap) (?:[A-Z]|Space|Shift|Ctrl|Control|Enter|Esc|Tab|Alt)\b|\b(?:WASD|Spacebar|Ctrl|Shift|Esc)\b|\[[A-Z]\]|\bSpace to\b|\bEnter to\b|\barrow keys\b/;

const read = () =>
  page.evaluate((keySrc) => {
    const vis = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return (
        r.width > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05
      );
    };
    const markers = [...document.querySelectorAll('.d-scan-world-marker')];
    const mk =
      markers.find(
        (m) => vis(m) && m.classList.contains('is-current') && !m.classList.contains('is-scanned'),
      ) ||
      markers.find(
        (m) =>
          vis(m) && !m.classList.contains('is-scanned') && !m.classList.contains('is-secondary'),
      );
    const mr = mk?.getBoundingClientRect();
    const edge = document.querySelector('.d-scan-edge');
    const edgeAngle = vis(edge) ? parseFloat(edge.style.getPropertyValue('--direction')) : NaN;
    const g = window.__game;
    let finds = 0;
    let total = 0;
    let primDone = 0;
    let primTotal = 0;
    try {
      const c = g.mission.counts();
      finds = c.completed;
      total = c.total;
      const p = g.mission.primaryCounts();
      primDone = p.completed;
      primTotal = p.total;
    } catch {}
    const slot = document.querySelector('.guidance-slot');
    const guide = vis(slot) ? slot.innerText.replace(/\s+/g, ' ').trim() : '';
    const pos = g?.sub?.position;
    const v = g?.scanner?.view;
    const scanBtn = document.querySelector('.tc-btn-scan');
    // Key names in any visible text (overlays, HUD, guidance).
    const keyHits = [];
    const re = new RegExp(keySrc);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent;
      if (!t || !re.test(t)) continue;
      const host = n.parentElement;
      if (host && vis(host) && !host.closest('script,style,[aria-hidden="true"]'))
        keyHits.push(t.trim().slice(0, 80));
    }
    return {
      mx: mr ? mr.x + mr.width / 2 : null,
      my: mr ? mr.y + mr.height / 2 : null,
      w: innerWidth,
      h: innerHeight,
      edgeAngle: Number.isFinite(edgeAngle) ? edgeAngle : null,
      reveal: vis(document.querySelector('.discovery-reveal')),
      banner: vis(document.querySelector('.obj-banner')),
      debrief: [...document.querySelectorAll('.debrief')].some(vis),
      skip: [...document.querySelectorAll('button')].some(
        (b) => b.textContent.trim() === 'Skip' && vis(b),
      ),
      guide,
      finds,
      total,
      primDone,
      primTotal,
      scanReady: !!scanBtn?.classList.contains('is-ready'),
      phase: v?.phase ?? 'idle',
      inRange: !!v?.objectiveInRange,
      px: pos?.x ?? null,
      py: pos?.y ?? null,
      pz: pos?.z ?? null,
      depth: typeof pos?.y === 'number' ? -pos.y : null,
      touchVisible: vis(document.querySelector('.tc-root')),
      keyHits,
    };
  }, KEY_RE.source);

// Layout audit during play: no two touch controls overlap, every tap target >= 40x40 CSS px.
const measureLayout = () =>
  page.evaluate(() => {
    const vis = (el) => {
      if (!el || el.hidden || el.closest('[hidden]')) return false;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const named = {
      stick: '.tc-stick',
      slider: '.tc-slider',
      scan: '.tc-btn-scan',
      lights: '.tc-btn-lights',
      sonarBtn: '.tc-btn-sonar',
      photo: '.tc-btn-photo',
      pause: '.tc-btn-pause',
      journal: '.hud-journal',
      finish: '.hud-finish',
      sonar: '.sonar',
    };
    const tappable = new Set(Object.keys(named).filter((k) => k !== 'sonar'));
    const boxes = {};
    for (const [k, sel] of Object.entries(named)) {
      const el = document.querySelector(sel);
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      boxes[k] = { x: r.x, y: r.y, w: r.width, h: r.height, el };
    }
    // The top bar's own readouts (everything in .hud-bar that is not one of its buttons).
    const bar = document.querySelector('.hud-bar');
    if (vis(bar)) {
      for (const [i, child] of [...bar.children].entries()) {
        if (!vis(child) || child.matches('button')) continue;
        const r = child.getBoundingClientRect();
        boxes[`bar${i}`] = { x: r.x, y: r.y, w: r.width, h: r.height, el: child };
      }
    }
    const overlaps = [];
    const keys = Object.keys(boxes);
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        const a = boxes[keys[i]];
        const b = boxes[keys[j]];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0.5 && oy > 0.5)
          overlaps.push(`${keys[i]}~${keys[j]} ${ox.toFixed(0)}x${oy.toFixed(0)}`);
      }
    const small = keys
      .filter((k) => tappable.has(k) && (boxes[k].w < 40 || boxes[k].h < 40))
      .map((k) => `${k} ${boxes[k].w.toFixed(0)}x${boxes[k].h.toFixed(0)}`);
    const offscreen = keys
      .filter(
        (k) =>
          boxes[k].x < -0.5 ||
          boxes[k].y < -0.5 ||
          boxes[k].x + boxes[k].w > innerWidth + 0.5 ||
          boxes[k].y + boxes[k].h > innerHeight + 0.5,
      )
      .map((k) => k);
    return { seen: keys.filter((k) => !k.startsWith('bar')), overlaps, small, offscreen };
  });
const layouts = { start: await measureLayout(), finish: null };

/** What a thumb does for this frame of guidance. */
const decide = (s) => {
  const raw = s.guide;
  const g = raw.toLowerCase();
  const scanningText = /scanning/i.test(raw) && !/interrupted/i.test(raw);
  const c = s.w / 2;
  const vc = s.h / 2;
  let dx = null;
  let dy = null;
  if (s.mx !== null) {
    dx = (s.mx - c) / s.w;
    dy = (s.my - vc) / s.h;
  }
  // Turn: marker on screen, else the edge arrow, else the words.
  let turn = 0;
  if (dx !== null) turn = clamp(dx * 3.2, -1, 1);
  else if (s.edgeAngle !== null) turn = Math.cos(s.edgeAngle) >= 0 ? 0.9 : -0.9;
  if (dx === null && s.edgeAngle === null) {
    if (/turn around/.test(g)) turn = -1;
    else if (/turn left|left ←/.test(g)) turn = -0.8;
    else if (/turn right|right →/.test(g)) turn = 0.8;
  } else if (/turn around/.test(g) && dx === null) turn = turn >= 0 ? 1 : -1;
  if (Math.abs(turn) < 0.08) turn = 0;
  // Scan: the button lights up, or the words ask for it.
  const offered = s.scanReady || /hold scan/i.test(raw);
  const scan = scanningText || (offered && !/get closer|turn toward/.test(g));
  // Depth: words first, then the marker's height on screen.
  let vert = null;
  if (/go up|rise toward|slider up|blocked ahead|rise\b/.test(g) && !/sink/.test(g)) vert = 1;
  else if (/go down|sink toward|dive deeper/.test(g)) vert = -1;
  else if (dy !== null && Math.abs(dy) > 0.15) vert = dy < 0 ? 0.8 : -0.8;
  let thrust = 1;
  if (/get closer/.test(g)) thrust = 1;
  else if (dx !== null && Math.abs(dx) > 0.3) thrust = 0.45; // turn tighter when well off
  if (/seabed/.test(g) && vert !== -1) {
    vert = 1;
    thrust = 0.4;
  }
  return { turn, thrust, vert, scan, scanningText };
};

await shot('start');
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
const keyHits = new Set();
let debriefAt = null;
let lastFinds = 0;
let lastFindAt = 0;
let anchor = null;
let anchorT = 0;
let longestStall = 0;
let stallWhere = '';
let lastGuide = '';
let layoutStayedTouch = touchShown;
let bannerAnswers = 0;
let lastKeyScan = -10;
let lastBucket = 0;
let s = await read();

while (el() < MAX_S) {
  s = await read();
  const now = el();
  if (now - lastKeyScan > 1.5) {
    lastKeyScan = now;
    for (const k of s.keyHits) keyHits.add(k);
  }
  if (s.debrief) {
    debriefAt = +now.toFixed(1);
    break;
  }
  if (s.finds > lastFinds) {
    lastFinds = s.finds;
    lastFindAt = now;
    if (LOG) console.error(`[${now.toFixed(0)}s] FIND ${s.finds}/${s.total}`);
    await shot(`find${s.finds}`);
  }
  if (Math.floor(now / 30) > lastBucket) {
    lastBucket = Math.floor(now / 30);
    await shot(`${lastBucket * 30}s`);
  }
  const overlay = s.reveal || s.banner;
  if (!overlay && !s.touchVisible) layoutStayedTouch = false;

  // Stall: the sub has not moved 4 m while nothing (scan, overlay) explains it.
  const busy = overlay || s.phase !== 'idle';
  if (busy || s.px === null) {
    anchor = null;
  } else if (!anchor) {
    anchor = { x: s.px, y: s.py, z: s.pz };
    anchorT = now;
  } else if (Math.hypot(s.px - anchor.x, s.py - anchor.y, s.pz - anchor.z) > 4) {
    anchor = { x: s.px, y: s.py, z: s.pz };
    anchorT = now;
  } else if (now - anchorT > longestStall) {
    longestStall = now - anchorT;
    stallWhere = `${now.toFixed(0)}s depth ${s.depth?.toFixed(0)} "${s.guide.slice(0, 70)}"`;
  }

  if (!layouts.finish && !overlay && (await page.locator('.hud-finish:visible').count()))
    layouts.finish = await measureLayout();
  if (s.reveal) {
    await releaseAll();
    await page.waitForTimeout(1500); // read the card a moment, like a person
    if (!(await tapEl('.discovery-reveal button', 'Continue')))
      await page.touchscreen.tap(W / 2, H * 0.75);
    await page.waitForTimeout(300);
    continue;
  }
  if (s.banner) {
    await releaseAll();
    await page.waitForTimeout(800);
    const label = FULL ? 'Keep exploring' : 'Surface and debrief';
    if (await tapEl('.obj-banner button', label)) bannerAnswers += 1;
    if (LOG) console.error(`[${now.toFixed(0)}s] BANNER ${label}`);
    await page.waitForTimeout(400);
    continue;
  }
  if (s.skip && !points.size) {
    // Onboarding steps offer Skip; a visitor in a hurry taps it.
    await tapEl('button', 'Skip');
    await page.waitForTimeout(200);
  }
  const sig = s.guide.replace(/\d+/g, '#');
  if (LOG && sig !== lastGuide) {
    lastGuide = sig;
    console.error(
      `[${now.toFixed(0)}s] ${s.guide} | depth ${s.depth?.toFixed(0)} | ${s.finds}/${s.total}`,
    );
  }

  const d = decide(s);
  if (process.env.TOUCH_DEBUG === '1' && Math.floor(now / 3) !== Math.floor((now - 0.3) / 3)) {
    const dbg = await page.evaluate(() => {
      const g = window.__game;
      const a = g?.input?.touchAxes ?? {};
      const p = g?.sub?.position;
      const v = g?.sub?.velocity;
      const h = g?.terrain?.sampleHeight?.(p.x, p.z);
      const q = p.clone();
      const n = p.clone();
      const hit = g?.props?.collide?.(q, g.effective?.submarine?.hullRadius ?? 3, n);
      const prop = hit ? `prop n ${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)} ` : '';
      const rv = document.querySelector('.discovery-reveal');
      const rvs = rv
        ? `rv hidden=${rv.hidden} cls=${rv.className} op=${getComputedStyle(rv).opacity} disp=${getComputedStyle(rv).display} `
        : 'rv none ';
      const rig = `revealActive=${g?.reveal?.active} returning=${g?.rig?.revealReturning} `;
      return `${rvs}${rig}${prop}vel ${v?.x.toFixed(2)},${v?.y.toFixed(2)},${v?.z.toFixed(2)} floor ${h?.toFixed(1)} state ${g?.appState?.state ?? g?.appState} sim ${g?.sub?.simSpeed} axes t${a.throttle?.toFixed(2)} y${a.yaw?.toFixed(2)} b${a.ballast?.toFixed(2)} p${a.pitch?.toFixed(2)} pos ${p?.x.toFixed(0)},${p?.y.toFixed(1)},${p?.z.toFixed(0)}`;
    });
    console.error(`  dbg ${now.toFixed(0)}s ${dbg} decide ${JSON.stringify(d)}`);
  }
  if (d.scan) {
    // Right thumb on SCAN; left thumb keeps the marker centred.
    await setSlider(null);
    await holdScan(true);
    await setStick(d.turn * 0.5, 0);
  } else {
    await holdScan(false);
    const mag = Math.hypot(d.turn, d.thrust);
    const k = mag > 1 ? 1 / mag : 1;
    // One thumb per side: the stick (left) and the slider (right) together.
    await setStick(d.turn * k, -d.thrust * k);
    await setSlider(d.vert);
  }
  await page.waitForTimeout(250);
}

await releaseAll();
const timedOut = debriefAt === null;
await page.waitForTimeout(600);
await shot(timedOut ? 'end-timeout' : 'debrief');
const end = await read();
for (const k of end.keyHits) keyHits.add(k);
console.log(
  JSON.stringify({
    site,
    viewport: `${W}x${H}`,
    // Counts as they stood when the debrief opened (or at the time cap).
    finds: s.finds,
    total: s.total,
    primaries: `${s.primDone}/${s.primTotal}`,
    debrief: !timedOut,
    debriefAt,
    seconds: +el().toFixed(1),
    lastFindAt: +lastFindAt.toFixed(1),
    longestStall: +longestStall.toFixed(1),
    stallWhere: longestStall > 10 ? stallWhere : '',
    bannerAnswers,
    touchShown,
    layoutStayedTouch,
    lastGuide: timedOut ? s.guide : '',
    errors: errs.slice(0, 5),
    layout: layouts,
    keyNames: [...keyHits].slice(0, 8),
  }),
);
await browser.close();
