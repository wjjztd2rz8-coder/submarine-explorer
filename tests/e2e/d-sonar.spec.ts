import { reviewScreenshot } from './helpers/render.js';
import { scanWithKeyboard } from './helpers/scan.js';
import { expect, test, type Page } from './helpers/unlocked.js';
import { DEFAULT_SENSOR_PRESETS } from '../../src/core/config/gameplay.js';
import { EQUIPMENT } from '../../src/core/config/progress.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

const shots = '.cache/codex/shots/d-sonar';
const d2Shots = '.cache/codex/shots/d2-sonarphoto';

test('expanded sonar yields wheel and range shortcuts to Journal and photo mode', async ({
  page,
}) => {
  // Regression guard: expanded sonar consumed Journal scrolling and changed
  // its range behind the modal when wheel or +/- shortcuts were used.
  await page.goto('/?tile=great-blue-hole&tier=low&tutorial=0');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.keyboard.press('m');
  await expect(page.locator('.sonar')).toHaveClass(/d-sonar-expanded/);
  await page.keyboard.press('j');
  await expect(page.locator('.journal')).toBeVisible();
  const range = page.locator('.d-sonar-range');
  const before = await range.textContent();
  const consumed = await page.locator('.jr-body').evaluate((body) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 });
    body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(consumed).toBe(false);
  await page.keyboard.press('Equal');
  await expect(range).toHaveText(before!);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Equal');
  await expect(range).not.toHaveText(before!);
  const restored = await range.textContent();
  await page.keyboard.press('p');
  await expect(page.locator('.photo-mode')).toBeVisible();
  const radius = () =>
    page.evaluate(() => (window.__game as { rig: { orbitRadius: number } }).rig.orbitRadius);
  const photoRadius = await radius();
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 300);
  await expect.poll(radius).toBeGreaterThan(photoRadius);
  await expect(range).toHaveText(restored!);
});

interface MarkerState {
  poiId: string;
  icon: string;
  scanned: boolean;
  current: boolean;
  visible: boolean;
  px: number;
  py: number;
}

async function marker(page: Page, poiId: string): Promise<MarkerState | undefined> {
  return page.evaluate(
    (id) =>
      (window.__game as { sonar: { markers: MarkerState[] } }).sonar.markers.find(
        (m) => m.poiId === id,
      ),
    poiId,
  );
}

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shots, { recursive: true });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${shots}/${name}.png` });
}

async function d2Shot(page: Page, name: string): Promise<void> {
  await mkdir(d2Shots, { recursive: true });
  await page.screenshot({ path: `${d2Shots}/${name}.png` });
}

async function waitForZoom(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const sonar = (
      window.__game as { sonar: { zoom: number | 'tile'; targetZoom: number | 'tile' } }
    ).sonar;
    return sonar.zoom === sonar.targetZoom;
  });
}

test('visible sonar controls, expanded wheel routing, and persistent markers across mode changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1');
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  const sonar = page.locator('.sonar');
  await expect(sonar.getByRole('button', { name: 'Sonar zoom in' })).toBeVisible();
  await expect(sonar.getByRole('button', { name: 'Sonar zoom out' })).toBeVisible();
  await expect(sonar).toHaveAttribute('title', /mouse wheel/);
  await d2Shot(page, 'mini-sonar');
  await sonar.getByRole('button', { name: 'Sonar zoom in' }).click();
  await expect(sonar.locator('.d-sonar-range')).toHaveText('500 m');
  await waitForZoom(page);
  await page.keyboard.press('m');
  await expect(sonar).toHaveClass(/d-sonar-expanded/);
  await d2Shot(page, 'expanded-sonar');
  const cameraRadius = await page.evaluate(
    () => (window.__game as { rig: { chaseRadius: number } }).rig.chaseRadius,
  );
  await page.mouse.move(1100, 450);
  await page.mouse.wheel(0, -100);
  await expect(sonar.locator('.d-sonar-range')).toHaveText('250 m');
  await waitForZoom(page);
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => (window.__game as { rig: { chaseRadius: number } }).rig.chaseRadius),
  ).toBe(cameraRadius);
  await page.evaluate(() =>
    (
      window.__game as { save: { setGameplayOption(key: 'visualHints', value: boolean): void } }
    ).save.setGameplayOption('visualHints', false),
  );
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: true });
  await expect(sonar).not.toHaveClass(/d2-sonar-markers-hidden/);
  await d2Shot(page, 'waypoints-off');
  await page.evaluate(() =>
    (
      window.__game as { save: { setGameplayOption(key: 'visualHints', value: boolean): void } }
    ).save.setGameplayOption('visualHints', true),
  );
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: true });
});

test('sonar follows the sub, zooms by keys and wheel, and marks dive scan state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  const sonar = page.locator('.sonar');
  await expect
    .poll(() => marker(page, 'titanic-bow'))
    .toMatchObject({ current: true, icon: '◇', visible: true });
  await expect(sonar.locator('.d-scan-sonar-marker')).toHaveCount(0);
  await expect(sonar.locator('.d-sonar-range')).toHaveText('1000 m');
  // The sonar sits in the HUD's top-left region, one edge margin in.
  expect((await sonar.boundingBox())!.x).toBe(12);
  const beforeZoom = await marker(page, 'titanic-bow');
  await shot(page, 'default');
  await shot(page, 'mini-default');

  await page.keyboard.press('Equal');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('500 m');
  await waitForZoom(page);
  await expect.poll(async () => (await marker(page, 'titanic-bow'))?.py).not.toBe(beforeZoom?.py);
  await shot(page, 'zoomed');
  await shot(page, 'zoomed-in');
  await sonar.hover();
  await page.mouse.wheel(0, -100);
  await expect(sonar.locator('.d-sonar-range')).toHaveText('250 m');
  await waitForZoom(page);
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false });
  await page.keyboard.press('Minus');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('500 m');
  await waitForZoom(page);
  await page.keyboard.press('m');
  await expect(sonar).toHaveClass(/d-sonar-expanded/);
  await expect(page.locator('.d-sonar-backdrop')).toBeVisible();
  await expect(sonar).toHaveCSS('background-color', 'rgb(6, 19, 24)');
  await shot(page, 'expanded');
  await page.keyboard.press('m');

  await scanWithKeyboard(page, 'titanic-bow');
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ scanned: true, icon: '✓' });
  await page.evaluate(() => {
    (window.__game as { sonar: { setPalette(name: 'highContrast'): void } }).sonar.setPalette(
      'highContrast',
    );
  });
  await shot(page, 'high-contrast');
});

test('whole-tile step remains available and sensor range gates POIs', async ({ page }) => {
  await page.goto('/?mission=titanic&skipBriefing=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(() => {
    const game = window.__game as { discovery: { loaded: boolean }; props: { loaded: boolean } };
    return game.discovery.loaded && game.props.loaded;
  });
  await page.evaluate(() => {
    (window.__game as { sonar: { setZoom(level: 'tile'): void } }).sonar.setZoom('tile');
  });
  const sonar = page.locator('.sonar');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('Whole tile');
  await waitForZoom(page);
  // The fixed kit extends both modes' range. Hold the sub between their ranges,
  // rather than depending on how close a mission opening happens to put the stern.
  const realisticRange = DEFAULT_SENSOR_PRESETS.realistic.sonarPoiRange * EQUIPMENT.sonarRange;
  const arcadeRange = DEFAULT_SENSOR_PRESETS.extended.sonarPoiRange * EQUIPMENT.sonarRange;
  const distance = (realisticRange + arcadeRange) / 2;
  expect(distance).toBeGreaterThan(realisticRange);
  expect(distance).toBeLessThan(arcadeRange);
  const opening = await page.evaluate((distance) => {
    const game = window.__game as {
      sub: { position: { x: number; y: number; z: number }; step(): void };
      discovery: { pois: Array<{ id: string; position: { x: number; z: number } }> };
    };
    const opening = { ...game.sub.position };
    const stern = game.discovery.pois.find((poi) => poi.id === 'titanic-stern')!;
    game.sub.step = () => {};
    game.sub.position.x = stern.position.x + distance;
    game.sub.position.z = stern.position.z;
    return opening;
  }, distance);
  await expect
    .poll(() => marker(page, 'titanic-stern'))
    .toMatchObject({ icon: '·', visible: true });
  await page.evaluate(() => {
    (
      window.__game as {
        save: { setGameplayMode(mode: 'realistic' | 'arcade'): void };
      }
    ).save.setGameplayMode('realistic');
  });
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false });
  await page.evaluate(() => {
    (
      window.__game as {
        save: { setGameplayMode(mode: 'realistic' | 'arcade'): void };
      }
    ).save.setGameplayMode('arcade');
  });
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: true });
  await shot(page, 'zoomed-out');
  await page.evaluate((opening) => {
    const game = window.__game as {
      sub: { position: { x: number; y: number; z: number }; step?: () => void };
    };
    Object.assign(game.sub.position, opening);
    delete game.sub.step;
  }, opening);
  await page.evaluate(() => {
    const map = (
      window.__game as {
        sonar: {
          setPalette(name: 'default'): void;
          setZoom(level: 1000): void;
          setSensorRange(range: number): void;
        };
      }
    ).sonar;
    map.setPalette('default');
    map.setZoom(1000);
    map.setSensorRange(1);
  });
  await waitForZoom(page);
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: false });
  await page.evaluate(() => {
    (window.__game as { sonar: { setSensorRange(range: number): void } }).sonar.setSensorRange(
      2000,
    );
  });
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: true });
  await shot(page, 'palette-default-relief');
  await page.evaluate(() => {
    (window.__game as { sonar: { setPalette(name: 'deuteranopia'): void } }).sonar.setPalette(
      'deuteranopia',
    );
  });
  await shot(page, 'palette-colourblind');
});

test('local canyon relief shows measured depth bands and labelled contours', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?mission=monterey-canyon&skipBriefing=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.evaluate(() => {
    const map = (window.__game as { sonar: { setZoom(level: 2000): void; toggle(): void } }).sonar;
    map.setZoom(2000);
    map.toggle();
  });
  await page.waitForFunction(() => {
    const relief = (
      window.__game as {
        sonar: { relief: { spanM: number; contourIntervalM: number } };
      }
    ).sonar.relief;
    return relief.spanM > 40 && Number.isFinite(relief.contourIntervalM);
  });
  await waitForZoom(page);
  await shot(page, 'relief-canyon');
});

test.describe('relief palette', () => {
  const sites = ['great-blue-hole', 'endurance', 'lost-city', 'beebe-vent-field', 'titanic'];
  for (const layout of ['desktop', 'portrait'] as const) {
    test.describe(`1200 sonar ${layout}`, () => {
      // Keep DPR-2 map coverage without rendering a large software-GL scene.
      const viewport =
        layout === 'desktop' ? { width: 800, height: 500 } : { width: 390, height: 844 };
      test.use({
        viewport,
        deviceScaleFactor: 2,
        hasTouch: layout === 'portrait',
      });
      for (const site of sites) {
        // Regression guard: DPR-2 relief retains smooth cyan pixels, raster padding and phone placement.
        test(`${site}: smooth relief and existing map layout`, async ({ page }, testInfo) => {
          await page.goto(`/?tile=${site}&skipBriefing=1&tier=low`, {
            waitUntil: 'domcontentloaded',
          });
          await page.waitForFunction(() => window.__gameReady === true, undefined, {
            timeout: 45_000,
          });
          const sonar = page.locator('.sonar');
          await expect(sonar).toBeVisible();
          // The permanent legend is gone: the map needs no caption block.
          await expect(sonar.locator('.d-sonar-legend')).toHaveCount(0);
          const state = await page.evaluate(() => {
            const map = (
              window.__game as {
                sonar: {
                  canvas: HTMLCanvasElement;
                  root: HTMLElement;
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
              cssWidth: parseFloat(map.root.style.getPropertyValue('--map-w')),
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
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
          if (layout === 'portrait') expect(box.width).toBeCloseTo(96, 0);
          // The pixels and layout are checked above. Capture only the map once;
          // clipping also avoids locator screenshot's extra stability frames.
          await reviewScreenshot(page, {
            path: testInfo.outputPath(`${site}-${layout}-minimap.png`),
            clip: box,
            scale: 'css',
          });
        });
      }
    });
  }
});
