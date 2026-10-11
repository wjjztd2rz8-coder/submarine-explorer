import { expect, test, type Page } from './helpers/unlocked.js';

// F-TEXT-DIET: facts and hazards sit behind one disclosure, the data credit lives
// in the pause menu, and touch text names no keys.

const KEY_WORDS = /\b(Space|Enter|Esc|Ctrl|Shift|WASD)\b|\bpress\b/i;

async function ready(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => window.__gameReady === true);
}

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('briefing fits with Begin and every objective, and names no Enter key', async ({ page }) => {
    await ready(page, 'mission=titanic&tier=low&touch=1');
    const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
    await expect(briefing).toBeVisible();
    await expect(briefing.locator('.briefing-hint')).toBeHidden();
    await expect(briefing.locator('.briefing-site-more > summary')).toHaveText('About this site');
    await expect(briefing.locator('.briefing-begin')).toBeInViewport({ ratio: 1 });
    for (const objective of await briefing.locator('.briefing-objectives li').all())
      await expect(objective).toBeInViewport({ ratio: 1 });
    // One short mode line, and no hull-rating hazard repeating the meta row.
    expect(
      await briefing.locator('.mode-desc').evaluate((el) => el.getBoundingClientRect().height),
    ).toBeLessThan(24);
    await briefing.locator('.briefing-site-more > summary').tap();
    await expect(briefing.locator('.is-hazards li')).not.toHaveCount(0);
    await expect(briefing.locator('.is-hazards')).not.toContainText(/rated to|Class [ABC]/);
    await expect(briefing.locator('.briefing-controls')).toHaveCount(0);
  });

  test('pause menu: How to play has pictures and no key names; Data credits keeps the licence', async ({
    page,
  }) => {
    await ready(page, 'mission=titanic&skipBriefing=1&tier=low&touch=1');
    await expect(page.locator('.hud-attribution')).toHaveCount(0);
    await expect(page.locator('.hud')).not.toContainText('Data:');
    await page.locator('.tc-btn-pause').tap();
    const pause = page.getByRole('dialog', { name: 'Pause menu' });
    await expect(pause).toBeVisible();
    await expect(pause.getByRole('button', { name: 'Controls', exact: true })).toHaveCount(0);

    await pause.getByRole('button', { name: 'How to play', exact: true }).tap();
    const card = page.getByRole('dialog', { name: 'How to play' });
    await expect(card).toBeVisible();
    await expect(card.locator('.how-to-tile')).toHaveCount(10);
    await expect(card.locator('.how-to-tile svg')).toHaveCount(10);
    await expect(card.locator('.controls-card-tabs')).toBeHidden();
    await expect(card).toContainText('Tap for a burst of speed');
    await expect(card).not.toContainText(KEY_WORDS);
    await page.screenshot({ path: 'test-results/f-text-diet-howto.png' });
    await card.getByRole('button', { name: 'Close' }).tap();
    await expect(card).toBeHidden();

    await pause.getByRole('button', { name: 'Data credits', exact: true }).tap();
    const credits = pause.locator('.pause-credits');
    await expect(credits).toBeVisible();
    const attribution = await page.evaluate(
      () => (window.__game as { meta: { attribution: string } }).meta.attribution,
    );
    await expect(credits.locator('.data-credits-citation')).toHaveText(attribution);
    await expect(credits).toContainText('doi:10.1029/2008GC002332');
    await expect(credits).toContainText('Not for navigation');
    await expect(credits.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    );
    await expect(credits.getByRole('link', { name: 'GMRT Synthesis' })).toHaveAttribute(
      'href',
      'https://www.gmrt.org/',
    );
    await page.screenshot({ path: 'test-results/f-text-diet-credits.png' });
    await pause.getByRole('button', { name: 'Back to pause menu' }).tap();
    await expect(pause.getByRole('button', { name: 'Resume' })).toBeVisible();
  });

  test('photo mode shows Capture and gesture tips only', async ({ page }) => {
    await ready(page, 'mission=titanic&skipBriefing=1&tier=low&touch=1');
    await page.locator('.tc-btn-photo').tap();
    const mode = page.locator('.photo-mode');
    await expect(mode).toBeVisible();
    await expect(mode.locator('.photo-mode-capture')).toHaveText('Capture');
    await expect(mode.locator('.photo-mode-tips')).toHaveText('Drag to orbit · pinch to zoom');
    await expect(mode).not.toContainText(KEY_WORDS);
  });
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('the HUD has no data chip; Data credits sits in the pause menu; Controls keeps keys', async ({
    page,
  }) => {
    await ready(page, 'mission=titanic&skipBriefing=1&tier=low');
    await expect(page.locator('.hud-attribution')).toHaveCount(0);
    await page.keyboard.press('Escape');
    const pause = page.getByRole('dialog', { name: 'Pause menu' });
    await expect(pause).toBeVisible();
    await pause.getByRole('button', { name: 'Data credits', exact: true }).click();
    await expect(pause.locator('.pause-credits')).toContainText('doi:10.1029/2008GC002332');
    // Escape steps back to the menu first, not out of the pause menu.
    await page.keyboard.press('Escape');
    await expect(pause.getByRole('button', { name: 'Resume' })).toBeVisible();
    await pause.getByRole('button', { name: 'Controls', exact: true }).click();
    const card = page.getByRole('dialog', { name: 'Controls guide' });
    await expect(card).toBeVisible();
    await expect(card.locator('.controls-card-tabs')).toBeVisible();
    await expect(card.locator('.how-to-tile')).toHaveCount(0);
  });

  test('briefing keeps the Enter hint and lists facts once inside About this site', async ({
    page,
  }) => {
    await ready(page, 'mission=titanic&tier=low');
    const briefing = page.getByRole('dialog', { name: 'Mission briefing' });
    await expect(briefing.locator('.briefing-hint')).toHaveText('OR PRESS ENTER');
    await briefing.locator('.briefing-site-more > summary').click();
    const facts = await briefing.locator('.is-facts li').allTextContents();
    expect(new Set(facts).size).toBe(facts.length);
    const hazards = await briefing.locator('.is-hazards li').allTextContents();
    expect(facts.filter((fact) => hazards.includes(fact))).toEqual([]);
  });
});
