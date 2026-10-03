import type { Page } from '@playwright/test';

/** Observe frame opportunities even when software WebGL stalls the main thread. */
export async function waitForFrames(page: Page, count: number, minimumMs = 0): Promise<void> {
  await page.evaluate(
    ({ count, minimumMs }) =>
      new Promise<void>((resolve) => {
        let frames = 0;
        let first: number | undefined;
        const sample = (now: number): void => {
          first ??= now;
          frames++;
          if (frames >= count && now - first >= minimumMs) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    { count, minimumMs },
  );
}
