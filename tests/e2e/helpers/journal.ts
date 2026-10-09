import { expect, type Page } from '@playwright/test';

/** Open contents without accidentally closing an already expanded site. */
export async function openJournalCategory(page: Page, site: string, kind: string): Promise<void> {
  const journal = page.locator('.journal');
  const contents = async () => {
    const toggle = journal.locator('.jr-contents-toggle');
    if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) === 'false')
      await toggle.click();
  };
  await contents();
  const siteButton = journal.locator(`.jr-nav-list > li > [data-target="${site}"]`);
  if ((await siteButton.getAttribute('aria-expanded')) === 'false') await siteButton.click();
  await contents();
  const group = journal.locator(`details[data-category="${site}/${kind}"]`);
  await expect(group).toBeVisible();
  if (!(await group.evaluate((el) => (el as HTMLDetailsElement).open)))
    await group.locator('summary').click();
}
