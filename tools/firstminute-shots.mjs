/**
 * First-minute walkthrough: Home -> Dive sites -> pick site -> briefing -> ~60 s of play
 * (screenshot every 10 s) -> Journal -> surface and debrief. Fresh player, Arcade defaults.
 *
 * Usage (from the repo root, Node on PATH):
 *   npm run build -- --outDir dist-fm && npx vite preview --port 4390 --strictPort --outDir dist-fm &
 *   node tools/firstminute-shots.mjs [http://localhost:4390/]
 * Env: FM_SITES=titanic,beebe-vent-field  FM_LAYOUTS=desktop,phone  FM_OUT=<dir>
 * Output: .cache/codex/shots/firstmin-f44/<layout>-<site>/NN-label.png
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = new URL(process.argv[2] ?? 'http://localhost:4390/');
const sites = (process.env.FM_SITES ?? 'titanic,beebe-vent-field').split(',');
const all = {
  desktop: { viewport: { width: 1280, height: 720 }, touch: false },
  phone: { viewport: { width: 390, height: 844 }, touch: true },
};
const layouts = (process.env.FM_LAYOUTS ?? 'desktop,phone').split(',');
const out = resolve(process.env.FM_OUT ?? '.cache/codex/shots/firstmin-f44');

const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const layout of layouts) {
  const { viewport, touch } = all[layout];
  for (const site of sites) {
    const dir = resolve(out, `${layout}-${site}`);
    await mkdir(dir, { recursive: true });
    const ctx = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let n = 0;
    const shot = async (label) =>
      page.screenshot({ path: `${dir}/${String(++n).padStart(2, '0')}-${label}.png` });
    // The WebGL page animates continuously, so skip Playwright's stability wait.
    const click = (loc) => (touch ? loc.tap({ force: true }) : loc.click());
    await page.addInitScript(() => {
      // Rendering tier only; mode, progress and onboarding stay fresh-player defaults.
      if (!localStorage.getItem('subexplorer.settings.v2'))
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, graphicsTier: 'low' }),
        );
    });
    try {
      await page.goto(base.href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
      await page.waitForTimeout(1500);
      await shot('home');
      await click(page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }));
      await page.locator(`.home-sites [data-mission="${site}"]`).waitFor();
      await page.waitForTimeout(1000);
      await shot('dive-sites');
      await click(page.locator(`.home-sites [data-mission="${site}"]`));
      await page.waitForURL(new RegExp(`mission=${site}`));
      await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
      await page.locator('.briefing').waitFor();
      await shot('briefing');
      await click(page.locator('.briefing').getByRole('button', { name: 'Begin dive' }));
      await page.locator('.briefing').waitFor({ state: 'hidden' });
      const cdp = touch ? await ctx.newCDPSession(page) : null;
      let held = false;
      const t0 = Date.now();
      await shot('t00');
      // Plausible new-player input: hold forward, then gentle turns, never touching targets.
      const steer = async (sec) => {
        const phase = Math.floor(sec / 10) % 3;
        if (touch) {
          // Hold the left stick forward (CDP touch), steering sideways in later phases.
          const box = await page.locator('.tc-stick').boundingBox();
          const x = box.x + box.width / 2;
          const y = box.y + box.height / 2;
          const dx = phase === 1 ? 0.3 : phase === 2 ? -0.3 : 0;
          if (held)
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          held = true;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: x + dx * box.width, y: y - box.height * 0.35 }],
          });
          return;
        }
        await page.keyboard.up('w');
        await page.keyboard.up('a');
        await page.keyboard.up('d');
        await page.keyboard.down('w');
        if (phase === 1) await page.keyboard.down('d');
        if (phase === 2) await page.keyboard.down('a');
      };
      for (let s = 10; s <= 60; s += 10) {
        await steer(s - 10);
        await page.waitForTimeout(Math.max(0, t0 + s * 1000 - Date.now()));
        await shot(`t${s}`);
      }
      if (touch && held)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else for (const k of ['w', 'a', 'd']) await page.keyboard.up(k);
      // Journal: key J on desktop; a visible Journal button elsewhere (touch pause menu).
      if (touch) {
        await click(page.locator('.tc-btn-pause'));
        await page.waitForTimeout(500);
        await shot('pause');
        await click(page.locator('.pause-menu').getByRole('button', { name: /journal/i }));
      } else await page.keyboard.press('j');
      await page.locator('.journal').waitFor({ timeout: 10000 });
      await page.waitForTimeout(600);
      await shot('journal');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      if (!(await page.locator('.pause-surface').isVisible())) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
      if (!(await page.locator('.pause-surface').isVisible())) await shot('after-journal');
      await click(page.locator('.pause-surface'));
      await page.locator('.mission-debrief').waitFor({ timeout: 15000 });
      await page.waitForTimeout(800);
      await shot('debrief');
    } catch (e) {
      errors.push(`script: ${e.message.split('\n')[0]}`);
      await shot('failure').catch(() => {});
    }
    console.log(
      `${layout} ${site}: ${n} shots in ${dir}${errors.length ? ` ERRORS ${errors.join(' | ')}` : ''}`,
    );
    await ctx.close();
  }
}
await browser.close();
