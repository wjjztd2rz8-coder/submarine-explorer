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
export async function clockFramesUntil(
  page: Page,
  ready: () => boolean,
  frameMs = 50,
): Promise<void> {
  await expect
    .poll(
      async () => {
        // One rendered frame per advance, even on a slow software GPU. Movement
        // callers use 250 ms, the engine clamp, so held input earns sim time.
        await page.clock.fastForward(frameMs);
        return page.evaluate(ready);
      },
      { timeout: 45_000, intervals: [20] },
    )
    .toBe(true);
}

/** Let timer-driven browser work (such as axe) finish while the clock is paused. */
export async function withClockFrames<T>(page: Page, work: () => Promise<T>): Promise<T> {
  let done = false;
  let auxiliaryClosures = 0;
  const context = page.context();
  const watched = new Map<Page, () => void>();
  const watch = (other: Page): void => {
    if (other === page) return;
    const closed = (): void => {
      auxiliaryClosures++;
    };
    watched.set(other, closed);
    other.once('close', closed);
  };
  context.on('page', watch);
  try {
    const result = work();
    void result.then(
      () => {
        done = true;
      },
      () => {
        done = true;
      },
    );
    await expect
      .poll(
        async () => {
          if (done) return true;
          const before = auxiliaryClosures;
          try {
            await page.clock.runFor(50);
          } catch (error) {
            // Clock advancement targets every page in the context. Axe closes
            // its temporary finishRun page while this call can still be using
            // it. Retry only that auxiliary-page race, proving our game page
            // is alive; genuine closures and the work's own errors still fail.
            if (
              auxiliaryClosures === before ||
              page.isClosed() ||
              !(error instanceof Error) ||
              !error.message.includes('Target page, context or browser has been closed')
            )
              throw error;
            await page.evaluate(() => document.readyState);
          }
          return done;
        },
        { timeout: 45_000, intervals: [20] },
      )
      .toBe(true);
    const value = await result;
    if (page.isClosed()) throw new Error('Game page closed while pumping clock frames');
    return value;
  } finally {
    context.off('page', watch);
    for (const [other, closed] of watched) other.off('close', closed);
  }
}
