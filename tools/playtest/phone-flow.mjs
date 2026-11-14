// Phone-size captures + debrief via pause menu after first scan.
import { createRequire } from 'node:module';
const require = createRequire('/home/vijay/submarine-explorer/package.json');
const { chromium } = require('@playwright/test');
const [OUT, W, H, tag] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist','--use-angle=vulkan','--enable-features=Vulkan','--disable-vulkan-surface'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
let n = 0; const shot = async (name) => { n++; await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-${name}.png` }); };
const allText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').slice(0, 1500));
await page.goto('http://127.0.0.1:4787/'); await page.waitForTimeout(3500); await shot('home');
await page.getByRole('button', { name: /^Dive:/ }).tap(); await page.waitForTimeout(3000); await shot('briefing');
await page.getByRole('button', { name: /Begin dive/ }).tap(); await page.waitForTimeout(3000); await shot('start');
console.log('START:', await allText());
// drive with keys (bot), to first scan
const held = new Set();
const hold = async (k, on) => { if (on && !held.has(k)) { await page.keyboard.down(k); held.add(k); } else if (!on && held.has(k)) { await page.keyboard.up(k); held.delete(k); } };
const t0 = Date.now(); let scans = 0; let prevNew = false;
while ((Date.now() - t0) / 1000 < 90 && scans < 2) {
  const s = await page.evaluate(() => {
    const mk = document.querySelector('.d-scan-world-marker.is-current') || document.querySelector('.d-scan-world-marker');
    const r = mk && mk.getBoundingClientRect(); const ok = r && r.width > 0 && getComputedStyle(mk).visibility !== 'hidden';
    return { mx: ok ? r.x + r.width/2 : null, w: innerWidth, all: document.body.innerText.replace(/\s+/g,' ').toLowerCase() };
  });
  const isNew = /new journal entry/.test(s.all);
  if (isNew && !prevNew) { scans++; await shot(`scan${scans}-done`); console.log('scan', scans, 'at', ((Date.now()-t0)/1000).toFixed(0), '|', s.all.slice(0, 400)); }
  prevNew = isNew;
  if (/scanning/.test(s.all) && n < 6) await shot('scanning');
  const c = s.w / 2; let port = false, stbd = false;
  if (s.mx !== null) { port = s.mx < c - 60; stbd = s.mx > c + 60; } else port = true;
  const scan = /scan target|scanning|hold g|hold scan/.test(s.all) && !/get closer/.test(s.all) && s.mx !== null && Math.abs(s.mx - c) < 140;
  await hold('a', port); await hold('d', stbd); await hold('g', scan); await hold('w', !scan);
  await page.waitForTimeout(350);
}
for (const k of [...held]) await page.keyboard.up(k);
await page.waitForTimeout(2500); await shot('after-primaries'); console.log('AFTER:', await allText());
const sd = page.getByRole('button', { name: /Surface and debrief/ });
if (await sd.count() && await sd.first().isVisible()) { await sd.first().tap(); await page.waitForTimeout(4000); await shot('debrief-a'); await page.waitForTimeout(7000); await shot('debrief-b'); console.log('DEBRIEF:', await allText()); }
else console.log('NO SURFACE BUTTON');
const jb = page.getByRole('button', { name: /journal/i });
if (await jb.count() && await jb.first().isVisible()) { await jb.first().tap(); await page.waitForTimeout(3000); await shot('journal'); }
await browser.close();
