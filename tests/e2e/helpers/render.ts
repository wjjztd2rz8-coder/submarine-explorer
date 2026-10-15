import { type Page, test } from '@playwright/test';

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

/** Nightly/manual review persists images; assertion readbacks stay in ordinary tests. */
export const renderReview = env.PW_RENDER_REVIEW === '1' || env.VISUAL_QA === '1';

export async function reviewShot(page: Page, name: string): Promise<void> {
  if (renderReview) await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}

/** Persist review evidence only; callers retain every frame and numeric probe. */
export async function reviewScreenshot(
  page: Page,
  options: Parameters<Page['screenshot']>[0],
): Promise<void> {
  if (renderReview) await page.screenshot(options);
}
