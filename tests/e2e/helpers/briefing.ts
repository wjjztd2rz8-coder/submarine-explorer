import type { Page } from '@playwright/test';

/** The start position lives in the briefing's collapsed Advanced disclosure. */
export async function openBriefingAdvanced(page: Page): Promise<void> {
  const toggle = page.locator('.briefing').getByRole('button', { name: 'Advanced' });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}
