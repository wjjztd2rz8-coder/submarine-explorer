import { expect, type Page } from '@playwright/test';
import { GUIDANCE } from './guidance.js';

/** Press Skip until the tutorial is over: one press per step, on every device. */
export async function dismissTutorial(
  page: Page,
  touch: boolean,
  pausedClock = false,
): Promise<void> {
  // The tutorial step is hidden while a scan card is up; bring it back to dismiss it.
  await setScanCardSuppressed(page, true);
  if (pausedClock) await page.clock.runFor(34);
  // A finished tutorial never shows the card again, so a short wait is the signal either way.
  await page
    .locator(GUIDANCE.tutorial)
    .waitFor({ state: 'visible', timeout: 1500 })
    .catch(() => {});
  try {
    await dismiss(page, touch, pausedClock);
  } finally {
    await setScanCardSuppressed(page, false);
  }
}

async function dismiss(page: Page, touch: boolean, pausedClock: boolean): Promise<void> {
  const card = page.locator(GUIDANCE.tutorial);
  for (let i = 0; i < 3 && (await card.isVisible()); i++) {
    const step = await card.getAttribute('data-step');
    const skip = page.locator(GUIDANCE.skip);
    if (touch) await skip.tap();
    else await skip.click();
    // The same real tutorial update that drives the game renders the next card.
    if (pausedClock) await page.clock.runFor(34);
    if (step === 'scan') await expect(card).toBeHidden();
    else await expect(card).not.toHaveAttribute('data-step', step!);
  }
  await expect(card).toBeHidden();
}

/**
 * The scan card outranks the tutorial step, so a layout check of the tutorial alone
 * hides the scan source first (and restores it afterwards). Discovery re-applies the
 * overlay's suppression every frame, so the overlay's own hooks are held while hidden.
 */
export async function setScanCardSuppressed(page: Page, on: boolean): Promise<void> {
  await page.evaluate((on) => {
    type Overlay = {
      setSuppressed(on: boolean): void;
      update(...args: unknown[]): void;
    };
    const overlay = (window.__game as unknown as { discovery: { overlay: Overlay } }).discovery
      .overlay;
    if (on) {
      overlay.setSuppressed(true);
      overlay.setSuppressed = () => {};
      overlay.update = () => {};
    } else {
      delete (overlay as Partial<Overlay>).setSuppressed;
      delete (overlay as Partial<Overlay>).update;
      overlay.setSuppressed(false);
    }
  }, on);
}
