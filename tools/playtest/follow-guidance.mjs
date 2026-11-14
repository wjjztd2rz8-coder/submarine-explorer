// Naive player: does only what the on-screen guidance says. Logs every guidance change.
import { createRequire } from 'node:module';
const require = createRequire('/home/vijay/submarine-explorer/package.json');
const { chromium } = require('@playwright/test');

const OUT = process.argv[2];
const SITE = process.argv[3] ?? ''; // '' = default first dive
const MAX_S = Number(process.argv[4] ?? 240);
const tag = process.argv[5] ?? (SITE || 'first');

const browser = await chromium.launch({
  args: [
    '--ignore-gpu-blocklist',
    '--use-angle=vulkan',
    '--enable-features=Vulkan',
    '--disable-vulkan-surface',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));

let n = 0;
const shot = async (name) => {
  n += 1;
  await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2, '0')}-${name}.png` });
};

await page.goto(SITE ? `http://127.0.0.1:4787/?mission=${SITE}` : 'http://127.0.0.1:4787/');
await page.waitForTimeout(3500);
if (!SITE) {
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
    const t = (sel) => {
      const el = document.querySelector(sel);
      return vis(el) ? el.innerText.trim().replace(/\s+/g, ' ') : '';
    };
    // any visible overlay text that is not the standing HUD
    const extra = [];
    for (const el of document.querySelectorAll(
      '[class*=toast], [class*=debrief], [class*=scan-prompt], [class*=d-scan], [role=dialog], [role=status], [role=alert]',
    )) {
      if (!vis(el)) continue;
      const x = el.innerText?.trim().replace(/\s+/g, ' ');
      if (x && x.length < 400) extra.push(`${el.className.toString().split(' ')[0]}: ${x}`);
    }
    const mk =
      document.querySelector('.d-scan-world-marker.is-current') ||
      document.querySelector('.d-scan-world-marker');
    const mr = vis(mk) ? mk.getBoundingClientRect() : null;
    const all = document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500);
    return {
      mx: mr ? mr.x + mr.width / 2 : null,
      my: mr ? mr.y + mr.height / 2 : null,
      all,
      kicker: t('.guidance-kicker'),
      name: t('.guidance-name'),
      depth: [...document.querySelectorAll('.hud-value')].map((e) => e.innerText).join(' | '),
      extra: [...new Set(extra)].join(' || '),
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
let last = '';
let done = false;
while ((Date.now() - t0) / 1000 < MAX_S && !done) {
  const s = await read();
  const key = `${s.kicker} :: ${s.name} :: ${s.extra}`;
  const el = ((Date.now() - t0) / 1000).toFixed(0);
  const sig = key.replace(/\d+/g, '#');
  if (sig !== last) {
    console.log(
      `[${el}s] ${s.kicker} | ${s.name} | ${s.depth}${s.extra ? ' | EXTRA ' + s.extra : ''}`,
    );
    last = sig;
    if (n < 28) await shot(`t${el}`);
  }
  const txt = `${s.kicker} ${s.name} ${s.extra}`.toLowerCase();
  // human-like: steer toward the on-screen diamond marker
  let port = /turn\s+\d+°?\s*port|turn left/.test(txt);
  let stbd = /turn\s+\d+°?\s*starboard|turn right/.test(txt);
  if (s.mx !== null) {
    port = s.mx < 560;
    stbd = s.mx > 720;
  } else if (!port && !stbd) port = true; // marker off screen: come about
  const scan =
    /hold g\b|scanning/.test(txt) &&
    !/get closer/.test(txt) &&
    s.mx !== null &&
    s.mx > 480 &&
    s.mx < 800;
  const up = /ascend|go up|climb|above you|rise/.test(txt);
  const down = /descend|go down|below you|dive deeper|sink/.test(txt);
  await hold('a', port);
  await hold('d', stbd);
  await hold('g', scan);
  await hold('w', !scan && !/hold g\b/.test(txt));
  await hold('Space', up);
  await hold('Shift', down);
  if (/dive again|mission complete|dive complete/.test(s.all.toLowerCase())) done = true;
  await page.waitForTimeout(400);
}
for (const k of [...held]) await page.keyboard.up(k);
await page.waitForTimeout(1500);
await shot('end');
const fin = await read();
console.log('END', JSON.stringify(fin).slice(0, 2500));
console.log('elapsed', ((Date.now() - t0) / 1000).toFixed(0), 'done', done);
console.log('ERRS', errs.slice(0, 8).join('\n'));
await browser.close();
