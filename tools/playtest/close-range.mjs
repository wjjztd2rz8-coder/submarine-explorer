// Close-range timing probe: where does the time between finds go?
// Logs every 250 ms (distance/bearing to the target, speed, scan state, guidance) and splits
// each find into reveal, transit, close range (<150 m, not yet scannable), ready (scannable,
// beam not yet held) and scan seconds.
// Usage: node tools/playtest/close-range.mjs <site> <seconds> <precise|sloppy> [baseUrl] [logFile] [seed]
// Sloppy imitates a person: steering decisions every 400-600 ms with heading error, a wide
// dead band, held turns that overshoot, a reaction delay before the beam and no stopping to scan.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('/home/vijay/submarine-explorer/package.json');
const { chromium } = require('@playwright/test');
const [SITE, MAX = '240', MODE = 'precise', BASE = 'http://127.0.0.1:4913/', LOG = '', SEED = '1'] =
  process.argv.slice(2);
const sloppy = MODE === 'sloppy' || MODE === 'late';
// Late: a person who drives to the marker first and only then looks for the scan prompt.
const late = MODE === 'late';
let wantClose = true;
let seed = +SEED || 1;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`${BASE}?mission=${SITE}&skipBriefing=1`);
await page.waitForFunction(() => window.__gameReady && window.__game?.discovery?.scanner, null, {
  timeout: 60000,
});
await page.waitForTimeout(1500);
const read = () =>
  page.evaluate(() => {
    const g = window.__game;
    const v = g.discovery.scanner.view;
    const sub = g.sub;
    const objective = v.objectiveId !== null;
    const id = objective ? v.objectiveId : v.nearestId;
    return {
      id,
      objective,
      dist: objective ? v.objectiveDistance : v.nearestDistance,
      turn: objective ? v.objectiveTurnDeg : v.nearestTurnDeg,
      vert: objective ? v.objectiveVertDeg : v.nearestVertDeg,
      inRange: objective ? v.objectiveInRange : v.nearestInRange,
      angle: v.nearestId === id ? v.nearestAngleDeg : null,
      radius: objective ? v.objectiveRadius : v.nearestRadius,
      candidate: v.candidateId,
      ready: v.candidateId !== null,
      phase: v.phase,
      activeDist: v.activeDistance,
      activeId: v.activeId,
      progress: v.progress,
      completed: v.completed,
      speed: Math.hypot(sub.velocity.x, sub.velocity.y, sub.velocity.z),
      depth: -sub.position.y,
      reveal: !!g.reveal?.active,
      primaries: g.mission?.primaryComplete ?? false,
      guide: (document.querySelector('.guidance-slot')?.innerText ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
    };
  });
const held = new Set();
const hold = async (k, on) => {
  if (on && !held.has(k)) (await page.keyboard.down(k), held.add(k));
  else if (!on && held.has(k)) (await page.keyboard.up(k), held.delete(k));
};
const release = async () => {
  for (const k of [...held]) await hold(k, false);
};
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
const log = [];
let nextSteer = 0;
let steer = { port: false, stbd: false, up: false, down: false };
let readySince = null;
let readyAt = null;
let headingErr = 0;
let lastCompleted = 0;
let stuckSince = null;
let climbUntil = 0;
const finds = [];
let cur = { reveal: 0, transit: 0, close: 0, ready: 0, scan: 0, minScanDist: Infinity };
let prevT = 0;
while (el() < +MAX) {
  const s = await read();
  const t = el();
  const dt = t - prevT;
  prevT = t;
  log.push({
    t: +t.toFixed(2),
    ...s,
    dist: +s.dist?.toFixed?.(1),
    turn: +s.turn.toFixed(1),
    vert: +s.vert.toFixed(1),
    speed: +s.speed.toFixed(2),
  });
  // Bucket the elapsed slice.
  if (s.reveal) cur.reveal += dt;
  else if (s.phase === 'scanning')
    ((cur.scan += dt), (cur.minScanDist = Math.min(cur.minScanDist, s.activeDist)));
  else if (s.ready) cur.ready += dt;
  else if (s.id !== null && s.dist < 150) cur.close += dt;
  else cur.transit += dt;
  if (s.completed > lastCompleted) {
    lastCompleted = s.completed;
    wantClose = true;
    const r = (x) => +x.toFixed(1);
    const f = {
      n: s.completed,
      at: r(t),
      reveal: r(cur.reveal),
      transit: r(cur.transit),
      close: r(cur.close),
      ready: r(cur.ready),
      scan: r(cur.scan),
      scanFromM: r(cur.minScanDist),
    };
    finds.push(f);
    console.log('FIND', JSON.stringify(f));
    cur = { reveal: 0, transit: 0, close: 0, ready: 0, scan: 0, minScanDist: Infinity };
  }
  if (s.primaries) {
    await release();
    const ended = await page.evaluate(() => window.__game?.missionRouter?.endDive?.() ?? false);
    if (ended) break;
  }
  if (s.reveal || s.id === null) {
    await release();
    readySince = null;
    if (s.id === null && !s.reveal) await hold('a', true);
    await page.waitForTimeout(250);
    continue;
  }
  // Steering: precise every sample, sloppy every 400-600 ms with error and a wide dead band.
  if (t >= nextSteer) {
    if (sloppy) {
      nextSteer = t + 0.4 + 0.2 * rnd();
      if (rnd() < 0.3) headingErr = (rnd() * 2 - 1) * 15;
    }
    const turn = s.turn + (sloppy ? headingErr : 0);
    const band = sloppy ? 15 : 5;
    const g = s.guide.toLowerCase();
    steer = {
      port: turn < -band,
      stbd: turn > band,
      // Depth follows the written cue, as a player would.
      up: /go up|rise toward|seabed close/.test(g),
      down: /go down|sink toward|dive deeper/.test(g),
    };
  }
  // A player pinned against a slope climbs over it rather than waiting.
  if (s.speed < 1 && s.phase === 'idle' && !s.ready) stuckSince ??= t;
  else stuckSince = null;
  if (stuckSince !== null && t - stuckSince > 1.5) ((climbUntil = t + 3), (stuckSince = null));
  if (t < climbUntil) ((steer.up = true), (steer.down = false));
  // Beam: precise holds the moment it is offered; sloppy reacts ~0.5 s later and keeps thrusting.
  let scan = false;
  if (s.ready) readyAt ??= t;
  else readyAt = null;
  if (late && (s.dist < 45 || (readyAt !== null && t - readyAt > 6))) wantClose = false;
  if ((s.ready && !(late && wantClose)) || s.phase === 'scanning' || s.phase === 'interrupted') {
    readySince ??= t;
    scan = !sloppy || t - readySince > 0.5 || s.phase !== 'idle';
  } else readySince = null;
  await hold('a', steer.port);
  await hold('d', steer.stbd);
  await hold('Control', steer.down);
  await hold('Space', steer.up);
  await hold('g', scan);
  await hold('w', t < climbUntil ? false : sloppy ? true : !scan);
  await page.waitForTimeout(250 - Math.min(200, (el() - t) * 1000));
}
await release();
if (LOG) writeFileSync(LOG, log.map((x) => JSON.stringify(x)).join('\n'));
const sum = (k) => +finds.reduce((a, f) => a + f[k], 0).toFixed(1);
console.log(
  'RESULT',
  JSON.stringify({
    site: SITE,
    mode: MODE,
    finds: finds.length,
    close: finds.map((f) => f.close),
    closeTotal: sum('close'),
    maxScanFromM: Math.max(...finds.map((f) => f.scanFromM)),
    total: +el().toFixed(0),
    errs: errs.slice(0, 3),
  }),
);
await browser.close();
