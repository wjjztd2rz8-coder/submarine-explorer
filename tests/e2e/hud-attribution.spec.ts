// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/450-hud-attribution';

async function clearControls(page: Page, selector: string, touch: boolean): Promise<void> {
  const box = (await page.locator(selector).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  const controls = touch
    ? ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause']
    : ['.hud-reset-camera'];
  for (const control of controls) {
    const other = (await page.locator(control).boundingBox())!;
    expect(
      box.x < other.x + other.width &&
        other.x < box.x + box.width &&
        box.y < other.y + other.height &&
        other.y < box.y + box.height,
      `${selector} overlaps ${control}`,
    ).toBe(false);
  }
}

for (const layout of [
  { width: 1600, height: 900, touch: false },
  { width: 844, height: 390, touch: true },
  { width: 667, height: 375, touch: true },
]) {
  test.describe(`data credits at ${layout.width}x${layout.height}`, () => {
    test.use({ viewport: layout, hasTouch: layout.touch });
    test('one-line chip opens full attribution in one action and clears controls', async ({
      page,
    }) => {
      await page.goto(`/?mission=titanic&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`);
      await page.waitForFunction(() => window.__gameReady === true);
      const chip = page.getByRole('button', { name: 'Data: GMRT credits' });
      const panel = page.getByRole('region', { name: 'Data attribution' });
      await expect(chip).toHaveText('Data: GMRT');
      await expect(chip).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).toBeHidden();
      await clearControls(page, '.hud-attribution', layout.touch);
      const chipBox = (await chip.boundingBox())!;
      expect(chipBox.height).toBeLessThanOrEqual(layout.touch ? 44 : 32);
      await mkdir(shots, { recursive: true });
      await page.screenshot({ path: `${shots}/${layout.width}x${layout.height}-chip.png` });
      if (layout.touch) await chip.tap();
      else await chip.click();
      await expect(panel).toBeVisible();
      await expect(chip).toHaveAttribute('aria-expanded', 'true');
      const attribution = await page.evaluate(
        () => (window.__game as { meta: { attribution: string } }).meta.attribution,
      );
      await expect(panel.locator('.hud-attribution-citation')).toHaveText(attribution);
      await expect(panel).toContainText('doi:10.1029/2008GC002332');
      await expect(panel.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
        'href',
        'https://creativecommons.org/licenses/by/4.0/',
      );
      await expect(panel.getByRole('link', { name: 'GMRT Synthesis' })).toHaveAttribute(
        'href',
        'https://www.gmrt.org/',
      );
      await expect(panel).toContainText('Subsetted and converted');
      await clearControls(page, '.hud-attribution-panel', layout.touch);
      await page.screenshot({ path: `${shots}/${layout.width}x${layout.height}-expanded.png` });
      if (layout.touch) {
        await chip.tap();
        await expect(panel).toBeHidden();
      } else {
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        await expect(page.locator('.pause-menu')).toBeHidden();
        await expect(chip).toBeFocused();
        await page.keyboard.press('Space');
        await expect(panel).toBeVisible();
        await page.keyboard.press('Enter');
        await expect(panel).toBeHidden();
        await page.keyboard.press('Escape');
        await expect(page.locator('.pause-menu')).toBeVisible();
      }
    });
  });
}

test('synthetic bathymetry retains its own credit', async ({ page }) => {
  await page.goto('/?tile=demo-synthetic&skipBriefing=1&tier=low');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.getByRole('button', { name: 'Data: synthetic credits' }).click();
  const panel = page.getByRole('region', { name: 'Data attribution' });
  await expect(panel).toContainText('Synthetic procedural bathymetry (not real data).');
  await expect(panel.getByRole('link', { name: 'CC BY 4.0' })).toHaveCount(0);
});
