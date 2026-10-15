import type { Page } from '@playwright/test';

/** Dive reloads need both the game shell and authored discovery content. */
export async function diveReady(
  page: Page,
  // Pass {} when the caller needs Playwright's configured default discovery wait.
  discoveryWait: { timeout?: number } = { timeout: 20_000 },
): Promise<void> {
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
  await page.waitForFunction(
    () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded,
    undefined,
    discoveryWait,
  );
}

export async function loadDive(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await diveReady(page);
}
