import { type Page, test } from '@playwright/test';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/** Local full runs and nightly diagnostics capture; hosted behavior gates do not read back pixels. */
export const renderReview = !env.CI || env.PW_RENDER_REVIEW === '1';

export async function reviewShot(page: Page, name: string): Promise<void> {
  if (renderReview) await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}
