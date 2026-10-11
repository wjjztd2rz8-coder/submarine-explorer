import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The Journal is a two-pane reader on desktop (a contents tree beside the
 * article) and a full-screen sheet on a phone: the front page lists the sites,
 * a site page lists its entries as rows, and the back arrow goes up one level.
 * These helpers drive either layout.
 */

/** True in the phone sheet (`.is-phone`), which has no contents tree. */
export async function journalIsSheet(page: Page): Promise<boolean> {
  return (await page.locator('.journal.is-phone').count()) > 0;
}

/** Back to the contents: the front page on the sheet, nothing to do on desktop. */
export async function journalContents(page: Page): Promise<void> {
  if (!(await journalIsSheet(page))) return;
  const back = page.locator('.journal .jr-back');
  while (await back.isVisible()) await back.click();
  await expect(page.locator('.journal.at-front')).toBeVisible();
}

/** The front page: a tree item on desktop, the contents on the sheet. */
export async function journalFront(page: Page): Promise<void> {
  if (await journalIsSheet(page)) await journalContents(page);
  else await page.locator('.journal .jr-nav-item[data-target="front"]').click();
}

/**
 * Switch spoilers on or off. On the sheet the switch ends the contents and site
 * pages (not entry pages), so this goes back to the contents first when needed.
 */
export async function setJournalSpoilers(page: Page, on: boolean): Promise<void> {
  const box = page.locator('.journal .jr-spoilers input');
  if (!(await box.isVisible())) await journalContents(page);
  if (on) await box.check();
  else await box.uncheck();
}

/** The first entry button of a kind (`poi`, `life`, `secret`, `species`, `site`). */
export async function journalFirstOfKind(page: Page, kind: string): Promise<Locator> {
  if (await journalIsSheet(page)) return page.locator(`.journal .jr-row.is-${kind}`).first();
  return page.locator(`.journal .jr-nav-item.is-${kind}`).first();
}

/** The site rows: the front page's cards on the sheet, the tree's site items on desktop. */
export async function journalSiteRows(page: Page): Promise<Locator> {
  if (await journalIsSheet(page)) {
    await journalContents(page);
    return page.locator('.journal .jr-site-card[data-target]:not(.is-photos)');
  }
  return page.locator('.journal .jr-nav-list > li > .jr-nav-item.is-site');
}

/** Open a site's page (a tree item on desktop; the front page's card on the sheet). */
export async function openJournalSite(page: Page, site: string): Promise<void> {
  if (await journalIsSheet(page)) {
    await journalContents(page);
    await page.locator(`.journal .jr-site-card[data-target="${site}"]`).click();
    return;
  }
  await page.locator(`.journal .jr-nav-item.is-site[data-target="${site}"]`).click();
}

/** Entry buttons whose key starts with `prefix` (a whole key matches itself). */
export async function journalEntries(page: Page, prefix: string): Promise<Locator> {
  if (await journalIsSheet(page)) return page.locator(`.journal .jr-row[data-row^="${prefix}"]`);
  return page.locator(`.journal .jr-nav-item[data-target^="${prefix}"]`);
}

/** Open an entry by key (`site/kind/id`), reaching it from the contents on the sheet. */
export async function openJournalEntry(page: Page, key: string): Promise<void> {
  if (await journalIsSheet(page)) {
    const row = page.locator(`.journal .jr-row[data-row="${key}"]`);
    if (!(await row.count())) await openJournalSite(page, key.split('/')[0]!);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    return;
  }
  await page.locator(`.journal .jr-nav-item[data-target="${key}"]`).click();
}

/** Open contents without accidentally closing an already expanded site. */
export async function openJournalCategory(page: Page, site: string, kind: string): Promise<void> {
  const journal = page.locator('.journal');
  if (await journalIsSheet(page)) {
    // The site page lists every group; just land on it.
    await openJournalSite(page, site);
    await expect(journal.locator('.jr-entries')).toBeVisible();
    return;
  }
  const siteButton = journal.locator(`.jr-nav-list > li > [data-target="${site}"]`);
  if ((await siteButton.getAttribute('aria-expanded')) === 'false') await siteButton.click();
  const group = journal.locator(`details[data-category="${site}/${kind}"]`);
  await expect(group).toBeVisible();
  if (!(await group.evaluate((el) => (el as HTMLDetailsElement).open)))
    await group.locator('summary').click();
}
