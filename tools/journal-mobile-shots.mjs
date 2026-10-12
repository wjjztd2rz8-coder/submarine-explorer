/**
 * Journal screenshots at phone portrait, phone landscape and desktop: contents, a site page
 * with entries logged, an entry, and "About this site" open. Usage:
 *   npm run build -- --outDir dist-journal && npx vite preview --port 4641 --strictPort --outDir dist-journal &
 *   node tools/journal-mobile-shots.mjs [http://localhost:4641/] [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = new URL(process.argv[2] ?? 'http://localhost:4641/');
const out = resolve(process.argv[3] ?? '.cache/codex/shots/f-journal-mobile');
const layouts = {
  portrait: { viewport: { width: 390, height: 844 }, touch: true },
  landscape: { viewport: { width: 844, height: 390 }, touch: true },
  small: { viewport: { width: 667, height: 375 }, touch: true },
  desktop: { viewport: { width: 1280, height: 720 }, touch: false },
};
const only = process.argv[4]?.split(',');
const at = '2026-09-01T10:00:00.000Z';
const seed = JSON.stringify({
  version: 1,
  discovered: Object.fromEntries(
    [
      'titanic/titanic-bow',
      'titanic/titanic-stern',
      'titanic/titanic-boilers',
      'lost-city/lost-city-poseidon',
      'lost-city/lost-city-beehive',
    ].map((k) => [k, { at, count: 1 }]),
  ),
  stats: { scans: 5, firstAt: at },
});
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const [name, { viewport, touch }] of Object.entries(layouts)) {
  if (only && !only.includes(name)) continue;
  const ctx = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.addInitScript(
    ([k, v]) => {
      localStorage.setItem(
        'subexplorer.settings.v2',
        JSON.stringify({ version: 2, graphicsTier: 'low' }),
      );
      localStorage.setItem(k, v);
    },
    ['subexplorer.discoveries.v1', seed],
  );
  await page.goto(base.href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
  await page.waitForTimeout(800);
  const tap = (loc) => (touch ? loc.tap({ force: true }) : loc.click());
  const snap = async (label) => {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${name}-${label}.png` });
  };
  await tap(page.locator('.home-menu button', { hasText: 'Journal' }));
  await page.locator('.journal').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await snap('1-contents');
  await tap(page.locator('.journal .jr-site-card[data-target="titanic"]'));
  await snap('2-site');
  await page.locator('.journal .jr-body').evaluate((b) => b.scrollTo(0, b.scrollHeight));
  await snap('3-site-bottom');
  await page.locator('.journal .jr-body').evaluate((b) => b.scrollTo(0, 0));
  await tap(page.locator('.journal .jr-site-more summary'));
  await page.locator('.journal .jr-body').evaluate((b) => b.scrollTo(0, b.scrollHeight));
  await snap('4-about');
  await page.locator('.journal .jr-body').evaluate((b) => b.scrollTo(0, 0));
  await tap(page.locator('.journal .jr-row').first());
  await snap('5-entry');
  await ctx.close();
}
await browser.close();
