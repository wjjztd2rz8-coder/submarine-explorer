import { expect, type Page } from '@playwright/test';
import { clockFramesUntil } from './clock.js';

/** Home presents the shell/title without loading discovery, props or a vehicle. */
export async function homeReady(page: Page, pausedClock = false): Promise<void> {
  const ready = () => window.__gameReady === true && window.__game?.appState === 'home';
  if (pausedClock) await clockFramesUntil(page, ready);
  else await page.waitForFunction(ready, undefined, { timeout: 45_000 });
  await expect(page.locator('.home-screen')).toBeVisible();
}
