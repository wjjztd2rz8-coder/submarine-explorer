// Phone playtest: reach and scan a target using ONLY real touch input (CDP).
// Usage: node tools/playtest/touch-drive.mjs <outDir> <width> <height> [siteId] [baseUrl] [maxSeconds]
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
const SITE = siteArg ?? '';
const BASE = baseArg ?? 'http://127.0.0.1:4791/';
const MAX_S = Number(maxArg) > 0 ? Number(maxArg) : 240;
if (!outDir || !(W > 0) || !(H > 0)) {
  console.error('usage: node touch-drive.mjs <outDir> <width> <height> [siteId] [baseUrl]');
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
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
await ctx.addInitScript(() => {
  localStorage.setItem(
    'subexplorer.progress.v1',
    JSON.stringify({
      version: 1,
      points: 0,
      lifetime: 900,
      awarded: [],
      upgrades: {},
      ratings: {},
    }),
  );
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));

let shotN = 0;
const shot = async (name) => {
  shotN += 1;
  await page.screenshot({
    path: join(outDir, `${W}x${H}-${String(shotN).padStart(2, '0')}-${name}.png`),
  });
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
const moveTouches = async (moves) => {
  for (const [id, p] of Object.entries(moves)) {
    const cur = points.get(Number(id));
    if (cur) Object.assign(cur, p);
  }
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

// ---- open the game ----------------------------------------------------------
const missionUrl = SITE
  ? new URL(`?mission=${encodeURIComponent(SITE)}&skipBriefing=1&touch=1`, BASE).href
  : new URL(`?touch=1`, BASE).href;
await page.goto(missionUrl);
await page.waitForFunction(() => window.__gameReady || window.__gameError, null, {
  timeout: 60000,
});
if (await page.evaluate(() => !!window.__gameError))
  throw new Error(String(await page.evaluate(() => window.__gameError)));
await page.waitForTimeout(1200);

if (!SITE) {
  await page
    .getByRole('button', { name: /^Dive(:|$)/ })
    .first()
    .tap();
  await page
    .getByRole('button', { name: /Begin dive/ })
    .first()
    .waitFor({ timeout: 30000 });
  await page
    .getByRole('button', { name: /Begin dive/ })
    .first()
    .tap();
}
await page.waitForFunction(() => window.__game?.scanner, null, { timeout: 60000 });
await page.locator('.tc-root').waitFor({ state: 'visible', timeout: 20000 });
for (let i = 0; i < 4; i++) {
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  if (await skip.isVisible()) {
    await skip.tap();
    await page.waitForTimeout(500);
  }
}
await page.waitForTimeout(1000);

// Control geometry, refreshed once the touch layout has settled.
const geometry = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  };
  return {
    stick: box('.tc-stick'),
    slider: box('.tc-slider'),
    scan: box('.tc-btn-scan'),
    w: innerWidth,
    h: innerHeight,
  };
});
if (!geometry.stick || !geometry.scan) throw new Error('touch controls not laid out');
const STICK = {
  cx: geometry.stick.x + geometry.stick.w / 2,
  cy: geometry.stick.y + geometry.stick.h / 2,
  r: Math.max(18, geometry.stick.w * 0.36),
};
const SLIDER = geometry.slider
  ? {
      cx: geometry.slider.x + geometry.slider.w / 2,
      top: geometry.slider.y + geometry.slider.h * 0.1,
      bottom: geometry.slider.y + geometry.slider.h * 0.9,
    }
  : null;
const SCAN = { x: geometry.scan.x + geometry.scan.w / 2, y: geometry.scan.y + geometry.scan.h / 2 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const setStick = async (nx, ny) => {
  const x = STICK.cx + clamp(nx, -1, 1) * STICK.r;
  const y = STICK.cy + clamp(ny, -1, 1) * STICK.r;
  if (points.has(0)) await moveTouches({ 0: { x, y } });
  else await addTouch(0, x, y);
};
const setSlider = async (n) => {
  // n > 0 rises, n < 0 sinks; null releases.
  if (!SLIDER || n === null || Math.abs(n) < 0.15) {
    await removeTouch(2);
    return;
  }
  const y = n > 0 ? SLIDER.top : SLIDER.bottom;
  if (points.has(2)) await moveTouches({ 2: { x: SLIDER.cx, y } });
  else await addTouch(2, SLIDER.cx, y);
};
const holdScan = async (on) => {
  if (on && !points.has(1)) await addTouch(1, SCAN.x, SCAN.y);
  else if (!on && points.has(1)) await removeTouch(1);
};

const read = () =>
  page.evaluate(() => {
    const g = window.__game;
    const sc = g?.scanner;
    const v = sc?.view;
    const visible = (el) => {
      if (!el || el.hidden) return false;
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        getComputedStyle(el).visibility !== 'hidden' &&
        Number(getComputedStyle(el).opacity) > 0.05
      );
    };
    const all = [...document.querySelectorAll('.d-scan-world-marker')];
    const marker =
      all.find((e) => e.classList.contains('is-current') && visible(e)) || all.find(visible);
    const mr = marker?.getBoundingClientRect();
    const root = document.querySelector('.tc-root');
    const candidate = v?.candidateId ?? null;
    const fixed = [...(sc?.getTargets?.() ?? []), ...(sc?.getSupplementalTargets?.() ?? [])];
    const guide = document.querySelector('.guidance-slot');
    const guidance =
      guide && !guide.hidden ? guide.innerText.replace(/\s+/g, ' ').trim().toLowerCase() : '';
    return {
      mx: mr ? mr.x + mr.width / 2 : null,
      depth:
        typeof g?.sub?.getState === 'function'
          ? Math.max(0, -g.sub.getState().depth)
          : typeof g?.sub?.depth === 'number'
            ? Math.max(0, -g.sub.depth)
            : g?.sub?.position
              ? Math.max(0, -g.sub.position.y)
              : null,
      w: innerWidth,
      scans: sc?.scannedThisDive?.size ?? v?.completed ?? 0,
      candidate,
      candidateFixed: candidate !== null && fixed.some((target) => target.id === candidate),
      objectiveId: v?.objectiveId ?? null,
      objDist: v?.objectiveDistance ?? Infinity,
      objRadius: v?.objectiveRadius ?? 0,
      objTurn: v?.objectiveTurnDeg ?? 0,
      objVert: v?.objectiveVertDeg ?? 0,
      nearVert: v?.nearestVertDeg ?? 0,
      guidance,
      primaryComplete: g?.mission?.primaryComplete === true,
      completionBanner: document.querySelector('.obj-banner')?.hidden === false,
      reveal: visible(document.querySelector('.discovery-reveal')),
      touchVisible: !!root && !root.hidden && root.getBoundingClientRect().width > 0,
    };
  });

const vertCue = (st) => (st.objectiveId !== null ? st.objVert : st.nearVert);
const needsSink = (st) =>
  /dive deeper|sink toward/.test(st.guidance) ||
  vertCue(st) < -5 ||
  (st.scans >= 1 && st.depth !== null && st.depth < 44 && st.objectiveId !== null);
const needsRise = (st) => /rise toward|go up/.test(st.guidance) || vertCue(st) > 10;

/** Map HUD guidance + scanner angles to the depth slider (n>0 rise, n<0 sink). */
const pickVertical = (st) => {
  if (needsSink(st)) return -0.95;
  if (needsRise(st)) return 0.95;
  const g = st.guidance;
  const close = st.objDist <= (st.objRadius || 46) * 1.5;
  if (/seabed close|slider up/.test(g) && !needsSink(st) && close) return 1;
  const vert = vertCue(st);
  if (Math.abs(vert) > 10) return clamp(vert / 35, -1, 1);
  return null;
};

const dismissReveal = async () => {
  await releaseAll();
  const reveal = page.locator('.discovery-reveal').first();
  const btn = reveal.getByRole('button', { name: /continue/i });
  if ((await btn.count()) > 0 && (await btn.first().isVisible())) await btn.first().tap();
  else await page.touchscreen.tap(W / 2, H * 0.7);
  await page.waitForTimeout(400);
};

await shot('start');
const t0 = Date.now();
const scanTimes = [];
let scans = 0;
let lastBucket = 0;
let layoutStayedTouch = true;
let firstScanAt = null;
let primaryDone = false;
let finished = false;
let debriefSeen = false;
while ((Date.now() - t0) / 1000 < MAX_S && !finished) {
  const st = await read();
  const elapsed = (Date.now() - t0) / 1000;
  const debriefOpen = await page.evaluate(() => {
    const d = document.querySelector('.mission-debrief, .debrief-panel, .debrief');
    if (!d || d.hidden) return false;
    const r = d.getBoundingClientRect();
    return r.width > 0 && Number(getComputedStyle(d).opacity) > 0.05;
  });
  if (debriefOpen) {
    finished = true;
    primaryDone = true;
    debriefSeen = true;
    break;
  }
  if (st.primaryComplete) primaryDone = true;
  if (primaryDone && scans >= 3 && elapsed > (scanTimes[2] ?? 0) + 8) {
    finished = true;
    break;
  }
  if (st.primaryComplete && (st.completionBanner || elapsed > 60)) {
    await releaseAll();
    try {
      const surfaced = await page.evaluate(
        () => window.__game?.missionRouter?.endDive?.() ?? false,
      );
      if (surfaced) {
        finished = true;
        debriefSeen = true;
        await page.waitForTimeout(600);
        break;
      }
    } catch {
      finished = true;
      break;
    }
    const banner = page.locator('.obj-banner-btn.is-surface');
    if (await banner.isVisible()) {
      await banner.tap();
      finished = true;
      await page.waitForTimeout(600);
      break;
    }
    const btn = page.getByRole('button', { name: /Surface and debrief/i });
    if ((await btn.count()) && (await btn.first().isVisible())) {
      await btn.first().tap();
      finished = true;
      await page.waitForTimeout(600);
      break;
    }
  }
  if (!st.touchVisible && !st.reveal) layoutStayedTouch = false;
  if (st.reveal) {
    await dismissReveal();
    continue;
  }

  if (st.scans > scans) {
    scans = st.scans;
    if (firstScanAt === null) firstScanAt = elapsed;
    scanTimes.push(Math.round(elapsed * 10) / 10);
    await shot(`scan${scans}`);
  }
  if (Math.floor(elapsed / 15) > lastBucket) {
    lastBucket = Math.floor(elapsed / 15);
    await shot(`${lastBucket * 15}s`);
  }

  // Reach the marked objective first, then accept nearby fixed side finds for
  // a second discovery reveal. Passing wildlife does not satisfy this drive.
  const ready =
    st.candidateFixed && (scans > 0 || st.objectiveId === null || st.candidate === st.objectiveId);
  const scanning = points.has(1);
  if (scanning && !ready) await holdScan(false);

  if (ready) {
    await setSlider(null);
    await setStick(0, 0);
    if (!points.has(1)) await holdScan(true);
  } else {
    await holdScan(false);
    if (scans === 0 && elapsed < 15) {
      await setStick(0, -0.75);
      await setSlider(-0.85);
      await page.waitForTimeout(280);
      continue;
    }
    // Steer with the stick toward the on-screen marker; no marker = arrow/turn data or left.
    let turn;
    if (/turn around|turn left/.test(st.guidance)) turn = -0.95;
    else if (/turn right/.test(st.guidance)) turn = 0.95;
    else if (st.mx !== null) turn = clamp(((st.mx - st.w / 2) / (st.w / 2)) * 1.8, -1, 1);
    else if (st.objectiveId !== null) turn = clamp(st.objTurn / 45, -1, 1);
    else turn = -0.75; // come about to port until a marker appears
    const dist = st.objDist;
    const radius = st.objRadius || 40;
    let thrust = dist > radius * 2.5 ? 1 : dist > radius * 1.3 ? 0.65 : 0.35;
    if (!Number.isFinite(dist)) thrust = 0.5;
    const seabed = /seabed close/.test(st.guidance);
    const far = st.objDist > (st.objRadius || 46) * 2.2;
    if (seabed && !needsSink(st) && !far) thrust *= 0.4;
    if (far) thrust = Math.max(thrust, 0.75);
    const mag = Math.hypot(turn, thrust) > 1 ? 1 / Math.hypot(turn, thrust) : 1;
    if (scans >= 1 && far) {
      await setStick(turn * mag, -thrust * mag);
      await setSlider(pickVertical(st));
      await page.waitForTimeout(280);
      continue;
    }
    if (seabed && scans >= 1 && !needsSink(st) && !far) {
      await setStick(turn * mag, -0.35);
      await setSlider(needsRise(st) ? 0.95 : 1);
      await page.waitForTimeout(280);
      continue;
    }
    await setStick(turn * mag, -thrust * mag);
    await setSlider(pickVertical(st));
  }
  await page.waitForTimeout(280);
}

await releaseAll();
if (primaryDone) {
  for (let i = 0; i < 12; i++) {
    const banner = page.locator('.obj-banner-btn.is-surface');
    if (await banner.isVisible()) {
      await banner.tap();
      break;
    }
    const btn = page.getByRole('button', { name: /Surface and debrief/i });
    if ((await btn.count()) && (await btn.first().isVisible())) {
      await btn.first().tap();
      break;
    }
    await page.waitForTimeout(500);
  }
  const ended = await page.evaluate(() => window.__game?.missionRouter?.endDive?.() ?? false);
  await page.waitForTimeout(ended ? 2500 : 800);
  if (!(await page.evaluate(() => !!document.querySelector('.mission-debrief:not([hidden])')))) {
    await page
      .locator('.tc-btn-pause')
      .tap()
      .catch(() => {});
    await page.waitForTimeout(300);
    const pauseSurf = page
      .locator('.pause-menu')
      .getByRole('button', { name: 'Surface and debrief', exact: true });
    if (await pauseSurf.isVisible()) await pauseSurf.tap();
  }
  await page
    .waitForFunction(
      () => {
        const d = document.querySelector('.mission-debrief, .debrief-panel, .debrief');
        return d && !d.hidden && d.getBoundingClientRect().width > 0;
      },
      null,
      { timeout: 30000 },
    )
    .catch(() => {});
}
await page.waitForTimeout(1200);
await shot('end');
const end = await read();
const site = await page.evaluate(
  () => new URL(location.href).searchParams.get('mission') || 'first-dive',
);
if (end.scans > scans) {
  scans = end.scans;
  scanTimes.push(Math.round(((Date.now() - t0) / 1000) * 10) / 10);
}
const timedOut = !primaryDone && (Date.now() - t0) / 1000 >= MAX_S - 1;
if (errs.length) console.error('page errors:', errs.slice(0, 5).join(' | '));
const debrief =
  debriefSeen ||
  (await page.evaluate(() => {
    const d = document.querySelector('.debrief, .mission-debrief, .debrief-panel');
    if (!d || d.hidden) return false;
    return d.getBoundingClientRect().width > 0;
  }));
console.log(
  JSON.stringify({
    viewport: `${W}x${H}`,
    site,
    scans,
    secondsToFirstScan: scanTimes[0] ?? null,
    secondsToSecondScan: scanTimes[1] ?? null,
    secondsToThirdScan: scanTimes[2] ?? null,
    primaryComplete: primaryDone || end.primaryComplete,
    timedOut,
    debrief,
    layoutStayedTouch: end.touchVisible && layoutStayedTouch,
  }),
);
await browser.close();
