/**
 * Globe pin screenshots: Home -> Dive sites at phone portrait, phone landscape and desktop,
 * plus a cluster-tap sequence. Usage:
 *   npm run build -- --outDir dist-globe && npx vite preview --port 4611 --strictPort --outDir dist-globe &
 *   node tools/globe-pins-shots.mjs [http://localhost:4611/] [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = new URL(process.argv[2] ?? 'http://localhost:4611/');
const out = resolve(process.argv[3] ?? '.cache/codex/shots/f-globe-pins');
const layouts = {
  portrait: { viewport: { width: 390, height: 844 }, touch: true },
  landscape: { viewport: { width: 844, height: 390 }, touch: true },
  desktop: { viewport: { width: 1280, height: 720 }, touch: false },
};
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const [name, { viewport, touch }] of Object.entries(layouts)) {
  const ctx = await browser.newContext({
    viewport,
    hasTouch: touch,
    isMobile: touch,
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'subexplorer.settings.v2',
      JSON.stringify({ version: 2, graphicsTier: 'low' }),
    ),
  );
  await page.goto(base.href, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, null, { timeout: 90000 });
  await page.waitForTimeout(1000);
  const btn = page.locator('.home-menu').getByRole('button', { name: 'Dive sites', exact: true });
  await (touch ? btn.tap({ force: true }) : btn.click());
  await page.waitForFunction(
    () => {
      const g = window.__game.homeGlobe;
      return g.textureReady && g.pinCount > 0;
    },
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-1-sites.png` });
  const shot = (label) => page.screenshot({ path: `${out}/${name}-${label}.png` });
  const pin = page.locator('.globe.is-embedded .globe-pin[data-landmark="titanic"]');
  if (!(await pin.evaluate((e) => e.classList.contains('is-clustered')))) {
    await (touch ? pin.tap({ force: true }) : pin.hover({ force: true }));
    await page.waitForTimeout(800);
    await shot('4-titanic-label');
  }
  // Tap the first cluster, if any, then screenshot the zoom.
  const cluster = page.locator('.globe.is-embedded .globe-cluster:not([hidden])').first();
  if (await cluster.count()) {
    await (touch ? cluster.tap({ force: true }) : cluster.click());
    await page.waitForTimeout(2500);
    await shot('2-cluster-zoom');
    const again = page.locator('.globe.is-embedded .globe-cluster:not([hidden])').first();
    if (await again.count()) {
      await (touch ? again.tap({ force: true }) : again.click());
      await page.waitForTimeout(2500);
      await shot('3-cluster-zoom2');
    }
  }
  await ctx.close();
}
await browser.close();
