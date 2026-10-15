import { expect, test } from './helpers/unlocked.js';
import { diveReady } from './helpers/dive.js';
import { scanWithKeyboard } from './helpers/scan.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';

/**
 * S-journal-picture: the first scan of a place files a still of the moment, and
 * its Journal entry opens with that picture above the text on every viewport.
 */

const shots = '.cache/codex/shots/S-journal-picture';
const DIVE = '/?mission=titanic&poi=titanic-bow&skipBriefing=1';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, touch: false },
  { name: 'phone-portrait', width: 390, height: 844, touch: true },
  { name: 'phone-landscape', width: 844, height: 390, touch: true },
];

for (const viewport of VIEWPORTS) {
  test(`a fresh scan opens its Journal entry with a picture (${viewport.name})`, async ({
    browser,
  }) => {
    await mkdir(shots, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: viewport.touch,
      isMobile: viewport.touch,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(DIVE);
    await diveReady(page);
    await page.waitForFunction(
      () =>
        (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt ===
        'titanic-bow',
    );
    await scanWithKeyboard(page, 'titanic-bow');
    // The still is read on the next drawn frame, not at the scan itself.
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('subexplorer.photos.v1');
      return (
        !!raw && JSON.parse(raw).photos.some((p: { poiId: string }) => p.poiId === 'titanic-bow')
      );
    });
    await page.evaluate(() =>
      (window.__game as { journal: { open(): void; show(key: string): void } }).journal.open(),
    );
    const journal = page.locator('.journal');
    await expect(journal).toBeVisible();
    await page.evaluate(() =>
      (window.__game as { journal: { show(key: string): void } }).journal.show('titanic/poi/bow'),
    );
    const hero = journal.locator('.jr-hero img');
    await expect(hero).toHaveCount(1);
    // At the top: the picture precedes the first paragraph of the entry.
    const order = await journal.evaluate((root) => {
      const img = root.querySelector('.jr-hero');
      const para = root.querySelector('.jr-para');
      return (
        !!img && !!para && !!(img.compareDocumentPosition(para) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    });
    expect(order).toBe(true);
    const box = (await hero.boundingBox())!;
    expect(box.width).toBeGreaterThan(150);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${shots}/${viewport.name}.png` });
    expect(errors).toEqual([]);
    await context.close();
  });
}
