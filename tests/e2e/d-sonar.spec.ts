import { expect, test, type Page } from '@playwright/test';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

const shots = '.cache/codex/shots/d-sonar';
const d2Shots = '.cache/codex/shots/d2-sonarphoto';

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

test('visible sonar controls, expanded wheel routing, and live marker setting', async ({
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
  await page.keyboard.press('m');
  await expect(sonar).toHaveClass(/d-sonar-expanded/);
  await d2Shot(page, 'expanded-sonar');
  const cameraRadius = await page.evaluate(
    () => (window.__game as { rig: { chaseRadius: number } }).rig.chaseRadius,
  );
  await page.mouse.move(1100, 450);
  await page.mouse.wheel(0, -100);
  await expect(sonar.locator('.d-sonar-range')).toHaveText('250 m');
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => (window.__game as { rig: { chaseRadius: number } }).rig.chaseRadius),
  ).toBe(cameraRadius);
  await page.evaluate(() =>
    (
      window.__game as { save: { setGameplayOption(key: 'sonarMarkers', value: boolean): void } }
    ).save.setGameplayOption('sonarMarkers', false),
  );
  await expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: false });
  await expect(sonar).toHaveClass(/d2-sonar-markers-hidden/);
  await d2Shot(page, 'markers-off');
  await page.evaluate(() =>
    (
      window.__game as { save: { setGameplayOption(key: 'sonarMarkers', value: boolean): void } }
    ).save.setGameplayOption('sonarMarkers', true),
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
  await expect(sonar).toHaveCSS('left', '12px');
  const beforeZoom = await marker(page, 'titanic-bow');
  await shot(page, 'default');
  await shot(page, 'mini-default');

  await page.keyboard.press('Equal');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('500 m');
  await expect.poll(async () => (await marker(page, 'titanic-bow'))?.py).not.toBe(beforeZoom?.py);
  await shot(page, 'zoomed');
  await shot(page, 'zoomed-in');
  await sonar.hover();
  await page.mouse.wheel(0, -100);
  await expect(sonar.locator('.d-sonar-range')).toHaveText('250 m');
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false });
  await page.keyboard.press('Minus');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('500 m');
  await page.keyboard.press('m');
  await expect(sonar).toHaveClass(/d-sonar-expanded/);
  await expect(page.locator('.d-sonar-backdrop')).toBeVisible();
  await expect(sonar).toHaveCSS('background-color', 'rgb(6, 19, 24)');
  await shot(page, 'expanded');
  await page.keyboard.press('m');

  await page.keyboard.down('f');
  await page.waitForFunction(
    () =>
      (window.__game as { scanner: { view: { completed: number } } }).scanner.view.completed === 1,
    undefined,
    { timeout: 15_000 },
  );
  await page.keyboard.up('f');
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
  await page.evaluate(() => {
    (window.__game as { sonar: { setZoom(level: 'tile'): void } }).sonar.setZoom('tile');
  });
  const sonar = page.locator('.sonar');
  await expect(sonar.locator('.d-sonar-range')).toHaveText('Whole tile');
  await expect
    .poll(() => marker(page, 'titanic-stern'))
    .toMatchObject({ icon: '·', visible: true });
  await page.evaluate(() => {
    (
      window.__game as {
        save: { setGameplayOption(key: 'sensors', value: 'realistic' | 'extended'): void };
      }
    ).save.setGameplayOption('sensors', 'realistic');
  });
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false });
  await page.evaluate(() => {
    (
      window.__game as {
        save: { setGameplayOption(key: 'sensors', value: 'realistic' | 'extended'): void };
      }
    ).save.setGameplayOption('sensors', 'extended');
  });
  await expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: true });
  await shot(page, 'zoomed-out');
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
  await shot(page, 'relief-canyon');
});
