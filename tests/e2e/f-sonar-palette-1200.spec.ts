import { expect, test } from './helpers/unlocked.js';

const sites = ['great-blue-hole', 'endurance', 'lost-city', 'beebe-vent-field', 'titanic'];
for (const layout of ['desktop', 'portrait'] as const) {
  test.describe(`1200 sonar ${layout}`, () => {
    test.use({
      viewport: layout === 'desktop' ? { width: 1600, height: 900 } : { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: layout === 'portrait',
    });
    for (const site of sites) {
      test(`${site}: smooth relief and existing map layout`, async ({ page }, testInfo) => {
        await page.goto(`/?tile=${site}&skipBriefing=1&tier=low`, {
          waitUntil: 'domcontentloaded',
        });
        await page.waitForFunction(() => window.__gameReady === true, undefined, {
          timeout: 45_000,
        });
        const sonar = page.locator('.sonar');
        await expect(sonar).toBeVisible();
        await expect(sonar.locator('.d-sonar-legend span')).toHaveText([
          '▲ Sub',
          '◇ Objective',
          '· Contact',
          '✓ Scanned',
        ]);
        const state = await page.evaluate(() => {
          const map = (
            window.__game as {
              sonar: {
                canvas: HTMLCanvasElement;
                base: HTMLCanvasElement;
                relief: {
                  minDepthM: number;
                  maxDepthM: number;
                  spanM: number;
                  contourIntervalM: number;
                };
              };
            }
          ).sonar;
          const pixels = map.base
            .getContext('2d')!
            .getImageData(0, 0, map.base.width, map.base.height).data;
          let coloured = 0;
          let lime = 0;
          const colours = new Set<string>();
          for (let i = 0; i < pixels.length; i += 4) {
            const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]];
            // Contours and labels are near white; inspect the coloured relief.
            if (g > r * 2 && b > r * 2) {
              coloured++;
              if (b < g * 0.85) lime++;
              colours.add(`${r},${g},${b}`);
            }
          }
          return {
            relief: map.relief,
            coloured,
            lime,
            colours: colours.size,
            cssWidth: parseFloat(map.canvas.style.width),
            canvasWidth: map.canvas.width,
            rasterWidth: map.base.width,
          };
        });
        expect(state.coloured).toBeGreaterThan(1000);
        expect(state.lime).toBe(0);
        expect(state.colours).toBeGreaterThan(20);
        expect(state.canvasWidth).toBe(state.cssWidth * 2);
        expect(state.rasterWidth).toBe(state.canvasWidth + 96);
        expect(state.relief.spanM).toBeGreaterThanOrEqual(20);
        if (state.relief.maxDepthM - state.relief.minDepthM >= 2)
          expect(Number.isFinite(state.relief.contourIntervalM)).toBe(true);
        const box = (await sonar.boundingBox())!;
        expect(box.x).toBeCloseTo(12, 0);
        expect(box.x + box.width).toBeLessThanOrEqual(layout === 'desktop' ? 1600 : 390);
        if (layout === 'portrait') expect(box.width).toBeCloseTo(96, 0);
        await sonar.screenshot({ path: testInfo.outputPath(`${site}-${layout}-minimap.png`) });
        await page.screenshot({ path: testInfo.outputPath(`${site}-${layout}-hud.png`) });
      });
    }
  });
}
