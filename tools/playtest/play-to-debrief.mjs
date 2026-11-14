// Bot plays to the end, then captures debrief + Journal. Works at phone sizes too (keys still drive).
import { createRequire } from 'node:module';
const require = createRequire('/home/vijay/submarine-explorer/package.json');
const { chromium } = require('@playwright/test');
const [OUT, W, H, mode, tag, SITE] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5], process.argv[6], process.argv[7] ?? ''];
const touch = mode === 'touch';
const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist','--use-angle=vulkan','--enable-features=Vulkan','--disable-vulkan-surface'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1,
  userAgent: touch ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : undefined });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,200)));
let n = 0; const shot = async (name) => { n++; await page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2,'0')}-${name}.png` }); };
const press = async (loc) => { if (touch) await loc.tap(); else await loc.click(); };
const allText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').slice(0, 2500));
await page.goto(SITE ? `http://127.0.0.1:4787/?mission=${SITE}` : 'http://127.0.0.1:4787/'); await page.waitForTimeout(3500);
await shot('home');
if (!SITE) { await press(page.getByRole('button', { name: /^Dive:/ })); await page.waitForTimeout(3000); }
await shot('briefing');
await press(page.getByRole('button', { name: /Begin dive/ })); await page.waitForTimeout(3000);
await shot('start'); console.log('START TEXT:', await allText());
const held = new Set();
const hold = async (k, on) => { if (on && !held.has(k)) { await page.keyboard.down(k); held.add(k); } else if (!on && held.has(k)) { await page.keyboard.up(k); held.delete(k); } };
const t0 = Date.now(); let stage = 0; let lastShot = 0;
while ((Date.now() - t0) / 1000 < 200) {
  const s = await page.evaluate(() => {
    const mk = document.querySelector('.d-scan-world-marker.is-current') || document.querySelector('.d-scan-world-marker');
    const r = mk && mk.getBoundingClientRect(); const ok = r && r.width > 0 && getComputedStyle(mk).visibility !== 'hidden';
    return { mx: ok ? r.x + r.width/2 : null, w: innerWidth, all: document.body.innerText.replace(/\s+/g,' ').toLowerCase() };
  });
  const el = (Date.now() - t0) / 1000;
  if (/all objectives complete/.test(s.all)) { console.log('ALL DONE at', el.toFixed(0)); break; }
  if (stage === 0 && /new journal entry/.test(s.all)) { stage = 1; await shot('first-scan-done'); console.log('first scan at', el.toFixed(0)); }
  if (el - lastShot > 20) { lastShot = el; await shot(`t${el.toFixed(0)}`); }
  const c = s.w / 2; let port = false, stbd = false;
  if (s.mx !== null) { port = s.mx < c - 80; stbd = s.mx > c + 80; } else port = true;
  const scan = /scan target|scanning|hold g|hold scan/.test(s.all) && !/get closer/.test(s.all) && s.mx !== null && Math.abs(s.mx - c) < 160;
  await hold('a', port); await hold('d', stbd); await hold('g', scan); await hold('w', !scan);
  await page.waitForTimeout(350);
}
for (const k of [...held]) await page.keyboard.up(k);
await page.waitForTimeout(800); await shot('all-complete');
const sd = page.getByRole('button', { name: /Surface and debrief/ });
if (await sd.count()) { await press(sd.first()); await page.waitForTimeout(5000); await shot('debrief-a'); await page.waitForTimeout(6000); await shot('debrief-b'); console.log('DEBRIEF TEXT:', await allText()); }
else console.log('no surface button; text:', await allText());
const jb = page.getByRole('button', { name: /journal/i });
if (await jb.count()) { await press(jb.first()); await page.waitForTimeout(3000); await shot('journal'); console.log('JOURNAL TEXT:', (await allText()).slice(0, 1800)); }
console.log('ERRS', errs.join('\n')); await browser.close();
