import { expect, type Page } from '@playwright/test';

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
