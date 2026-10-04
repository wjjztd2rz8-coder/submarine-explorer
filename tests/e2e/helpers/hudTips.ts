import { expect, type Page } from '@playwright/test';

/** Keep the fresh-dive hint state while auditing layout on a slow renderer.
 * Visibility still comes from the real HUD, preference, camera and touch CSS.
 * Control use can still dismiss it; expiry is checked separately.
 */
export async function holdFreshTips(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window.__game as { cameraTips: { until: number } }).cameraTips.until = Infinity;
  });
}

/** Observe the HUD/input update rather than sleeping for an assumed frame rate. */
export async function processedFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

export async function finishAnimations(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
  });
}
