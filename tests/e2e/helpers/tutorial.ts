import { expect, type Page } from '@playwright/test';

/** Use the visible actions: phones have one Skip (step); larger HUDs retain Skip tutorial. */
export async function dismissTutorial(
  page: Page,
  touch: boolean,
  pausedClock = false,
): Promise<void> {
  // The card is hidden while a scan card is up; bring it back to dismiss it.
  await setScanCardSuppressed(page, true);
  if (pausedClock) await page.clock.runFor(34);
  // A finished tutorial never shows the card again, so a short wait is the signal either way.
  await page
    .locator('.onboard-card')
    .waitFor({ state: 'visible', timeout: 1500 })
    .catch(() => {});
  try {
    await dismiss(page, touch, pausedClock);
  } finally {
    await setScanCardSuppressed(page, false);
  }
}

async function dismiss(page: Page, touch: boolean, pausedClock: boolean): Promise<void> {
  const all = page.locator('.onboard-skip-all');
  if (await all.isVisible()) {
    if (touch) await all.tap();
    else await all.click();
    return;
  }
  const card = page.locator('.onboard-card');
  for (let i = 0; i < 3 && (await card.isVisible()); i++) {
    const step = await card.getAttribute('data-step');
    await page.getByRole('button', { name: 'Skip', exact: true }).tap();
    // The same real tutorial update that drives the game renders the next card.
    if (pausedClock) await page.clock.runFor(34);
    if (step === 'scan') await expect(card).toBeHidden();
    else await expect(card).not.toHaveAttribute('data-step', step!);
  }
  await expect(card).toBeHidden();
}

/**
 * The tutorial card yields to the scan card, so a layout check of the tutorial alone
 * hides the scan card first (and restores it afterwards).
 */
export async function setScanCardSuppressed(page: Page, on: boolean): Promise<void> {
  await page.evaluate(
    (on) =>
      (
        window.__game as unknown as {
          discovery: { overlay: { setSuppressed(on: boolean): void } };
        }
      ).discovery.overlay.setSuppressed(on),
    on,
  );
}
