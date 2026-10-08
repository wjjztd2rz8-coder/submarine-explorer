import { expect, type Page } from '@playwright/test';

/** Use the visible actions: phones have one Skip (step); larger HUDs retain Skip tutorial. */
export async function dismissTutorial(
  page: Page,
  touch: boolean,
  pausedClock = false,
): Promise<void> {
  const all = page.locator('.onboard-skip-all');
  if (await all.isVisible()) {
    if (touch) await all.tap();
    else await all.click();
    return;
  }
  const card = page.locator('.onboard-card');
  for (let i = 0; i < 5 && (await card.isVisible()); i++) {
    const step = await card.getAttribute('data-step');
    await page.getByRole('button', { name: 'Skip', exact: true }).tap();
    // The same real tutorial update that drives the game renders the next card.
    if (pausedClock) await page.clock.runFor(34);
    if (step === 'journal') await expect(card).toBeHidden();
    else await expect(card).not.toHaveAttribute('data-step', step!);
  }
  await expect(card).toBeHidden();
}
