import { expect, test, type Page } from './helpers/unlocked.js';

async function ready(page: Page) {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
}

async function separate(page: Page, a: string, b: string) {
  await expect(page.locator(a)).toBeVisible();
  await expect(page.locator(b)).toBeVisible();
  const first = (await page.locator(a).boundingBox())!;
  const second = (await page.locator(b).boundingBox())!;
  const overlap =
    first.x < second.x + second.width &&
    second.x < first.x + first.width &&
    first.y < second.y + second.height &&
    second.y < first.y + first.height;
  expect(overlap, `${a} overlaps ${b}: ${JSON.stringify({ first, second })}`).toBe(false);
}

test.describe('F-BUGHUNT-4 portrait telemetry', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  for (const site of ['great-blue-hole', 'monterey-canyon']) {
    test(`${site} Free dive sonar has space beside readouts and pause`, async ({ page }) => {
      await page.goto(`/?tile=${site}&tier=low&touch=1`);
      await ready(page);
      await separate(page, '.sonar', '.hud-readouts');
      await separate(page, '.sonar', '.tc-btn-pause');
    });
  }
  test('Daily objectives have space beside sonar', async ({ page }) => {
    await page.goto('/?tier=low&touch=1');
    await ready(page);
    await page.locator('.daily-card').click();
    await ready(page);
    await page.locator('.briefing-begin').click();
    await expect(page.locator('.briefing')).toBeHidden();
    // The daily route reboots without ?touch=1; a real touch restores touch mode.
    await page.touchscreen.tap(195, 420);
    await expect(page.locator('html.is-touch')).toHaveCount(1);
    await separate(page, '.sonar', '.objectives-panel');
    await separate(page, '.sonar', '.hud-readouts');
  });
});

for (const layout of [
  { width: 320, height: 568, scale: 100 },
  { width: 390, height: 844, scale: 150 },
]) {
  test.describe(`F-BUGHUNT-4 ${layout.width}px controls at ${layout.scale}%`, () => {
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: true,
      isMobile: true,
    });
    test('thrust and boost have separate touch targets', async ({ page }) => {
      await page.addInitScript((scale) => {
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, uiScale: scale, graphicsTier: 'low' }),
        );
      }, layout.scale);
      await page.goto('/?tile=great-blue-hole&tier=low&touch=1');
      await ready(page);
      await separate(page, '.tc-stick', '.tc-btn-boost');
      await separate(page, '.tc-stick', '.tc-buttons');
      await separate(page, '.tc-slider', '.tc-buttons');
      for (const selector of ['.tc-stick', '.tc-slider', '.tc-buttons']) {
        const box = (await page.locator(selector).boundingBox())!;
        expect(box.x, selector).toBeGreaterThanOrEqual(0);
        expect(box.y, selector).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, selector).toBeLessThanOrEqual(layout.width);
        expect(box.y + box.height, selector).toBeLessThanOrEqual(layout.height);
      }
      for (const button of await page.locator('.tc-buttons .tc-btn').all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
}
