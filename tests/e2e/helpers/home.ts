import { expect, type Page } from '@playwright/test';
import { clockFramesUntil } from './clock.js';

/** Home presents the shell/title without loading discovery, props or a vehicle. */
export async function homeReady(page: Page, pausedClock = false): Promise<void> {
  const ready = () => window.__gameReady === true && window.__game?.appState === 'home';
  if (pausedClock) await clockFramesUntil(page, ready);
  else await page.waitForFunction(ready, undefined, { timeout: 45_000 });
  await expect(page.locator('.home-screen')).toBeVisible();
}

/** Expand the portrait site sheet through its public control before selecting a mission. */
export async function openSiteList(page: Page, touch = false, pausedClock = false): Promise<void> {
  const expand = page.getByRole('button', { name: 'Show all sites', exact: true });
  if (await expand.isVisible()) {
    if (touch) await expand.tap();
    else await expand.click();
    if (pausedClock) await page.clock.fastForward(300);
    await expect(page.locator('.home-sites-grab')).toHaveAttribute('aria-expanded', 'true');
  }
}

/** Exercise the sheet's touch gesture rather than substituting a mouse drag. */
export async function swipeSiteList(page: Page): Promise<void> {
  const grab = page.locator('.home-sites-grab');
  const box = (await grab.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (const dy of [20, 40, 60, 80])
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - dy }],
      });
  } finally {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  }
  await expect(grab).toHaveAttribute('aria-expanded', 'true');
}
