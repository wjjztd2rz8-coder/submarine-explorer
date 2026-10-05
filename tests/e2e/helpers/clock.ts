import { expect, type Page } from '@playwright/test';

/** Pause on the blank page, before slow WebGL or a short-lived toast exists.
 * Moving pauseAt's target from a running game races the renderer and can land
 * in the past. Tests explicitly render frames without consuming toast time.
 */
export async function pauseClockBeforeNavigation(page: Page): Promise<void> {
  const time = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time });
  await page.clock.pauseAt(new Date(time.getTime() + 60_000));
}

/** Pump real game frames while async content loads; no game state is injected. */
export async function clockFramesUntil(page: Page, ready: () => boolean): Promise<void> {
  await expect
    .poll(
      async () => {
        await page.clock.runFor(50);
        return page.evaluate(ready);
      },
      { timeout: 45_000 },
    )
    .toBe(true);
}
