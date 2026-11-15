// Scripted player: follows on-screen guidance, scans, watches reveals, reports timings.
// Usage: node tools/playtest/tour.mjs <outDir> <site|''> [maxSeconds] [width] [height] [baseUrl] [--no-finish]
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const raw = process.argv.slice(2);
const noFinish = process.env.TOUR_NO_FINISH === '1' || raw.includes('--no-finish');
const argv = raw.filter((a) => a !== '--no-finish');
const [OUT, SITE = '', MAX = '240', W = '1280', H = '720', BASE = 'http://127.0.0.1:4787/'] = argv;
const tag = SITE || 'first';
const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});
const page = await (await browser.newContext({ viewport: { width: +W, height: +H } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
let n = 0;
const shot = async (name) => {
  n += 1;
  await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2, '0')}-${name}.png` });
};
await page.goto(SITE ? `${BASE}?mission=${SITE}` : BASE);
await page.waitForTimeout(3500);
if (!SITE) {
  await shot('home');
  await page.getByRole('button', { name: /^Dive:/ }).click();
  await page.waitForTimeout(3000);
}
const begin = page.getByRole('button', { name: /Begin dive/ });
await begin.waitFor({ timeout: 30000 });
await shot('briefing');
await begin.click();
await page.waitForTimeout(2500);
await shot('start');
const read = () =>
  page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false;
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
      ) || markers.find((m) => vis(m) && !m.classList.contains('is-scanned'));
    let mx = null;
    let my = null;
    if (mk) {
      const r = mk.getBoundingClientRect();
      mx = r.x + r.width / 2;
      my = r.y + r.height / 2;
    }
    const edge = document.querySelector('.d-scan-edge');
    const edgeAngle =
      edge && vis(edge) && !edge.hidden
        ? parseFloat(edge.style.getPropertyValue('--direction'))
        : null;
    const rv = document.querySelector('.discovery-reveal');
    const debrief = [...document.querySelectorAll('.debrief-panel, .debrief')].find(vis);
    const g = window.__game;
    let finds = null;
    let total = null;
    try {
      finds = g?.scanner?.scannedThisDive?.size ?? null;
      total = g?.mission?.counts?.().total ?? null;
    } catch {}
    const pos = g?.sub?.position;
    const slot = document.querySelector('.guidance-slot');
    const guide = (slot?.innerText ?? '').replace(/\s+/g, ' ');
    const reticle = document.querySelector('.scan-reticle');
    const reticleOn = vis(reticle) && !reticle?.hidden;
    return {
      mx,
      my,
      w: innerWidth,
      h: innerHeight,
      edgeAngle: Number.isFinite(edgeAngle) ? edgeAngle : null,
      reveal: vis(rv) ? rv.getAttribute('data-poi') : null,
      revealText: vis(rv) ? rv.innerText.replace(/\s+/g, ' ') : '',
      debrief: !!debrief,
      completionBanner: document.querySelector('.obj-banner')?.hidden === false,
      guide,
      speed: [...document.querySelectorAll('.hud-value')].map((e) => e.innerText).join(' | '),
      all: document.body.innerText.replace(/\s+/g, ' ').toLowerCase(),
      finds,
      total,
      primariesComplete: g?.mission?.primaryComplete ?? false,
      reticleOn,
      px: pos?.x ?? null,
      py: pos?.y ?? null,
      pz: pos?.z ?? null,
    };
  });
const held = new Set();
const hold = async (k, on) => {
  if (on && !held.has(k)) {
    await page.keyboard.down(k);
    held.add(k);
  } else if (!on && held.has(k)) {
    await page.keyboard.up(k);
    held.delete(k);
  }
};
const releaseAll = async () => {
  for (const k of [...held]) await hold(k, false);
};
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
let lastGuide = '';
let lastReveal = null;
const reveals = [];
let done = null;
let debriefAt = null;
let primariesAt = null;
let stuckAt = null;
let antiStuckFired = false;
let unstuckUntil = 0;
let anchorPos = null;
let anchorT = 0;
const steer = (s) => {
  const c = s.w / 2;
  const vc = s.h / 2;
  const raw = s.guide;
  const g = raw.toLowerCase();
  const scanningText = /SCANNING|INTERRUPTED/i.test(raw);
  let port = false;
  let stbd = false;
  let dx = null;
  let dy = null;
  const steerTol = scanningText ? 0.03 : 0.06;
  if (s.mx !== null && s.my !== null) {
    dx = (s.mx - c) / s.w;
    dy = (s.my - vc) / s.h;
    if (dx < -steerTol) port = true;
    else if (dx > steerTol) stbd = true;
  } else if (s.edgeAngle !== null) {
    dx = Math.cos(s.edgeAngle);
    if (dx < -0.12) port = true;
    else if (dx > 0.12) stbd = true;
  }
  if (!port && !stbd) {
    if (/turn around|turn left|left ←/i.test(raw)) port = true;
    else if (/turn right|right →/i.test(raw)) stbd = true;
    else if (/turn toward the marker/i.test(raw)) {
      if (/left/i.test(raw)) port = true;
      else if (/right/i.test(raw)) stbd = true;
    }
  }
  const aligned =
    s.mx !== null && s.my !== null && Math.abs(s.mx - c) < 170 && Math.abs(s.my - vc) < 200;
  const inReticle =
    s.mx !== null &&
    s.my !== null &&
    dx !== null &&
    dy !== null &&
    Math.abs(dx) < 0.25 &&
    Math.abs(dy) < 0.32;
  const holdScan =
    (scanningText && (s.reticleOn || inReticle)) ||
    (/hold g|hold scan|scan target/i.test(raw) &&
      !/get closer|turn toward/i.test(raw) &&
      (aligned || s.reticleOn));
  const forward = !scanningText && !holdScan && !/hold g|hold scan/i.test(raw);
  let rise = /go up|rise toward|hold space/i.test(g);
  let sink = /go down|sink toward|dive deeper|hold ctrl/i.test(g);
  if (!rise && !sink && s.my !== null && dy !== null && Math.abs(dy) > 0.18 && !scanningText) {
    if (dy < 0) rise = true;
    else sink = true;
  }
  return { port, stbd, holdScan, forward, rise, sink, scanningText };
};
while (el() < +MAX) {
  const s = await read();
  stuckAt = s.guide || stuckAt;
  if (primariesAt === null && s.primariesComplete) primariesAt = +el().toFixed(0);
  if (s.debrief) {
    done = +el().toFixed(0);
    debriefAt = debriefAt ?? done;
    break;
  }
  if (!noFinish && s.primariesComplete && s.completionBanner) {
    const surfaceNow = page.getByRole('button', { name: /Surface and debrief/ });
    if (await surfaceNow.count()) {
      await releaseAll();
      await surfaceNow.first().click({ force: true });
      await page.waitForTimeout(400);
      continue;
    }
  }
  if (s.reveal) {
    await releaseAll();
    if (s.reveal !== lastReveal) {
      lastReveal = s.reveal;
      reveals.push({ poi: s.reveal, at: +el().toFixed(0), text: s.revealText });
      console.log(`[${el().toFixed(0)}s] REVEAL ${s.reveal}: ${s.revealText}`);
      await page.waitForTimeout(2200);
      await shot(`reveal-${s.reveal}`);
    }
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('.discovery-reveal button')].find(
        (b) => b.textContent?.trim() === 'Continue',
      );
      btn?.click();
    });
    await page.waitForTimeout(200);
    continue;
  }
  if (!noFinish && s.primariesComplete) {
    await releaseAll();
    const ended = await page.evaluate(() => window.__game?.missionRouter?.endDive?.() ?? false);
    if (ended) {
      await page.waitForTimeout(400);
      continue;
    }
  }
  lastReveal = null;
  const sig = s.guide.replace(/\d+/g, '#');
  if (sig !== lastGuide) {
    lastGuide = sig;
    console.log(`[${el().toFixed(0)}s] ${s.guide} | ${s.speed} | found ${s.finds}/${s.total}`);
    if (n < 40) await shot(`t${el().toFixed(0)}`);
  }
  if (primariesAt === null && /primary objectives complete|primaries complete/.test(s.all))
    primariesAt = +el().toFixed(0);

  const now = el();
  const st = steer(s);
  if (!(st.scanningText || st.holdScan) && s.px !== null && s.pz !== null) {
    if (anchorPos === null) {
      anchorPos = { x: s.px, z: s.pz };
      anchorT = now;
    } else if (now - anchorT >= 8) {
      const moved = Math.hypot(s.px - anchorPos.x, s.pz - anchorPos.z);
      if (moved < 6) {
        antiStuckFired = true;
        unstuckUntil = now + 2;
        console.log(`[${now.toFixed(0)}s] ANTI-STUCK climb/backoff`);
        anchorPos = { x: s.px, z: s.pz };
        anchorT = now;
      } else {
        anchorPos = { x: s.px, z: s.pz };
        anchorT = now;
      }
    }
  } else if (st.scanningText || st.holdScan) {
    anchorPos = null;
    anchorT = now;
  }

  if (now < unstuckUntil) {
    await releaseAll();
    await hold('Space', true);
    await hold('s', true);
    await page.waitForTimeout(350);
    continue;
  }

  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  if ((await page.locator('.guidance-slot').getAttribute('data-step')) === 'scan') {
    if ((await skip.count()) && (await skip.first().isVisible())) {
      await skip.first().click();
      await page.waitForTimeout(200);
      continue;
    }
  }

  const { port, stbd, holdScan, forward, rise, sink } = st;
  await hold('a', port);
  await hold('d', stbd);
  await hold('g', holdScan);
  await hold('w', forward);
  await hold('Control', sink);
  await hold('Space', rise);
  await hold('s', false);
  await page.waitForTimeout(350);
}
await releaseAll();
await page.waitForTimeout(1000);
await shot('end-state');
if (!noFinish) {
  const sd = page.getByRole('button', { name: /Surface and debrief/ });
  if (done === null && (await sd.count()) && (await sd.first().isVisible())) {
    await sd.first().click();
  }
}
await page.waitForTimeout(4000);
const finalRead = await read();
if (finalRead.debrief && debriefAt === null) debriefAt = +el().toFixed(0);
if (await page.locator('.debrief-panel, .debrief').count()) {
  await shot('debrief');
  console.log(
    'DEBRIEF:',
    (
      await page.evaluate(
        () =>
          [...document.querySelectorAll('.debrief-panel, .debrief')].find(
            (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0,
          )?.innerText ?? '',
      )
    ).replace(/\s+/g, ' '),
  );
}
const endedOnDebrief = finalRead.debrief || debriefAt !== null;
console.log(
  'RESULT',
  JSON.stringify({
    site: tag,
    firstReveal: reveals[0]?.at ?? null,
    reveals: reveals.length,
    primariesAt,
    allDoneAt: done,
    debriefAt,
    debrief: endedOnDebrief,
    finds: finalRead.finds,
    total: finalRead.total,
    stuckAt: endedOnDebrief ? null : stuckAt,
    antiStuckFired,
    seconds: +el().toFixed(0),
    errs: errs.slice(0, 5),
  }),
);
await browser.close();
