// Scripted player for the sprint build: follows the marker, scans, watches reveals, reports timings.
// Usage: node tools/playtest/tour.mjs <outDir> <site|''> [maxSeconds] [width] [height] [baseUrl]
import { createRequire } from 'node:module';
const require = createRequire('/home/vijay/submarine-explorer/package.json');
const { chromium } = require('@playwright/test');
const [OUT, SITE = '', MAX = '240', W = '1280', H = '720', BASE = 'http://127.0.0.1:4787/'] =
  process.argv.slice(2);
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
    // Steer like a player: the current target's marker, else its edge arrow.
    const mk = [...document.querySelectorAll('.d-scan-world-marker.is-current')].find(vis);
    const r = mk && mk.getBoundingClientRect();
    const edge = document.querySelector('.d-scan-edge');
    const er = vis(edge) ? edge.getBoundingClientRect() : null;
    const rv = document.querySelector('.discovery-reveal');
    const g = window.__game;
    let found = null;
    try {
      found =
        g?.discovery?.pois?.filter((p) => g.discoveries.isDiscovered(p.landmarkId, p.id)).length ??
        null;
    } catch {}
    return {
      mx: r ? r.x + r.width / 2 : null,
      ex: er ? er.x + er.width / 2 : null,
      w: innerWidth,
      reveal: vis(rv) ? rv.getAttribute('data-poi') : null,
      revealText: vis(rv) ? rv.innerText.replace(/\s+/g, ' ') : '',
      guide: (document.querySelector('.guidance-slot')?.innerText ?? '').replace(/\s+/g, ' '),
      speed: [...document.querySelectorAll('.hud-value')].map((e) => e.innerText).join(' | '),
      all: document.body.innerText.replace(/\s+/g, ' ').toLowerCase(),
      found,
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
const t0 = Date.now();
const el = () => (Date.now() - t0) / 1000;
let lastGuide = '';
let lastReveal = null;
const reveals = [];
let done = null;
let primariesAt = null;
while (el() < +MAX) {
  const s = await read();
  if (s.reveal) {
    for (const k of [...held]) await hold(k, false);
    if (s.reveal !== lastReveal) {
      lastReveal = s.reveal;
      reveals.push({ poi: s.reveal, at: +el().toFixed(0), text: s.revealText });
      console.log(`[${el().toFixed(0)}s] REVEAL ${s.reveal}: ${s.revealText}`);
      await page.waitForTimeout(2600);
      await shot(`reveal-${s.reveal}`);
    }
    await page.waitForTimeout(400);
    continue;
  }
  lastReveal = null;
  const sig = s.guide.replace(/\d+/g, '#');
  if (sig !== lastGuide) {
    lastGuide = sig;
    console.log(`[${el().toFixed(0)}s] ${s.guide} | ${s.speed} | found ${s.found}`);
    if (n < 40) await shot(`t${el().toFixed(0)}`);
  }
  if (primariesAt === null && /primary objectives complete|primaries complete/.test(s.all))
    primariesAt = +el().toFixed(0);
  if (
    await page.evaluate(
      () =>
        !!document.querySelector('.debrief:not([hidden])') &&
        getComputedStyle(document.querySelector('.debrief:not([hidden])')).display !== 'none',
    )
  ) {
    done = +el().toFixed(0);
    break;
  }
  const c = s.w / 2;
  let port = false,
    stbd = false;
  const g = s.guide.toLowerCase();
  const aim = s.mx ?? s.ex;
  if (aim !== null) {
    port = aim < c - 80;
    stbd = aim > c + 80;
  } else if (/right/.test(g)) stbd = true;
  else port = true;
  const scan =
    /scan target|scanning|hold g/.test(g) &&
    !/get closer|turn toward/.test(g) &&
    s.mx !== null &&
    Math.abs(s.mx - c) < 170;
  await hold('a', port);
  await hold('d', stbd);
  await hold('g', scan);
  await hold('w', !scan);
  await hold('c', /go down|sink toward|dive deeper/.test(g));
  await hold('Space', /go up|rise toward|seabed close/.test(g));
  await page.waitForTimeout(350);
}
for (const k of [...held]) await page.keyboard.up(k);
await page.waitForTimeout(1000);
await shot('end-state');
const sd = page.getByRole('button', { name: /Surface and debrief/ });
if (done === null && (await sd.count()) && (await sd.first().isVisible())) {
  await sd.first().click();
}
await page.waitForTimeout(4000);
if (await page.locator('.debrief:not([hidden])').count()) {
  await shot('debrief');
  console.log(
    'DEBRIEF:',
    (
      await page.evaluate(() => document.querySelector('.debrief:not([hidden])')?.innerText ?? '')
    ).replace(/\s+/g, ' '),
  );
}
console.log(
  'RESULT',
  JSON.stringify({
    site: tag,
    firstReveal: reveals[0]?.at ?? null,
    reveals: reveals.length,
    primariesAt,
    allDoneAt: done,
    seconds: +el().toFixed(0),
    errs: errs.slice(0, 5),
  }),
);
await browser.close();
