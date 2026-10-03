import { expect, test, type Locator, type Page } from '@playwright/test';

const dive = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1&tier=low';

async function ready(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

async function separate(page: Page, selectors: string[]): Promise<void> {
  const viewport = page.viewportSize()!;
  const boxes = [];
  for (const selector of selectors) {
    const element = page.locator(selector);
    await expect(element).toBeVisible();
    const box = (await element.boundingBox())!;
    expect(box.x, selector).toBeGreaterThanOrEqual(0);
    expect(box.y, selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, selector).toBeLessThanOrEqual(viewport.height);
    boxes.push({ selector, ...box });
  }
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    for (const b of boxes.slice(i + 1)) {
      expect(
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height,
        `${a.selector} overlaps ${b.selector}`,
      ).toBe(false);
    }
  }
}

async function reachable(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = (await target.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(
    await target.evaluate((element) => {
      const r = element.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return hit !== null && element.contains(hit);
    }),
    'the centre of the touch target must receive the tap',
  ).toBe(true);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test.describe(`touch audit ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({ version: 2, uiScale: 150, reduceMotion: true, graphicsTier: 'low' }),
        );
      });
    });

    for (const scale of [80, 100, 150]) {
      test(`fresh dive separates HUD and controls at ${scale}% UI`, async ({ page }) => {
        await ready(page, dive);
        await page.evaluate((uiScale) => {
          (window.__game as { save: { save(settings: { uiScale: number }): void } }).save.save({
            uiScale,
          });
        }, scale);
        await expect(page.locator('.scan-panel')).toBeVisible();
        await expect(page.locator('.scan-hint')).toHaveText('HOLD SCAN TO SCAN');
        const controls = ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause'];
        const hud = ['.sonar', '.hud-readouts', '.scan-panel'];
        await separate(page, [...hud, '.onboard-card', ...controls]);
        for (const button of await page.locator('.d2-sonar-controls button, .tc-btn').all())
          await reachable(button);
        for (const label of ['Skip step', 'Skip tutorial'])
          await reachable(page.getByRole('button', { name: label, exact: true }));
        await page.getByRole('button', { name: 'Skip tutorial', exact: true }).tap();
        await expect(page.locator('.onboard-card')).toBeHidden();
        // The scan-range hint chip was retired (the scan panel covers it).
        await expect(page.locator('.onboard-hint')).toBeHidden();
        await page.evaluate(() => {
          const game = window.__game as {
            discovery: {
              overlay: {
                showComplete(
                  title: string,
                  first: boolean,
                  keys: { scan: string; guide: string },
                ): void;
              };
            };
          };
          game.discovery.overlay.showComplete(
            'A very long named contact with an unbroken identifier ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            true,
            { scan: 'G', guide: 'J' },
          );
        });
        await expect(page.locator('.scan-hint')).toHaveText('PAUSE → JOURNAL');
        expect(
          await page.locator('.scan-panel').evaluate((e) => e.scrollWidth <= e.clientWidth),
        ).toBe(true);
        await separate(page, ['.scan-panel', ...controls]);
        await page.locator('.tc-btn-sonar').tap();
        await expect(page.locator('.sonar')).toHaveClass(/d-sonar-expanded/);
        for (const button of await page.locator('.d2-sonar-controls button').all())
          await reachable(button);
        if (viewport.height === 390)
          await separate(page, ['.sonar', '.tc-buttons', '.tc-btn-pause']);
        await page.locator('.tc-btn-sonar').tap();
        await expect(page.locator('.tc-stick')).toBeVisible();
      });
    }

    test('mission objectives and readouts share the phone column', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem(
          'subexplorer.progress.v1',
          JSON.stringify({
            version: 1,
            points: 0,
            lifetime: 900,
            awarded: [],
            upgrades: {},
            ratings: {},
          }),
        );
      });
      await ready(page, '/?mission=monterey-canyon&skipBriefing=1&touch=1&tier=low');
      await expect(page.locator('.objectives-panel')).toBeVisible();
      await expect(page.locator('.onboard-card')).toBeVisible();
      await separate(page, [
        '.objectives-panel',
        '.hud-readouts',
        '.onboard-card',
        '.sonar',
        '.tc-stick',
        '.tc-slider',
        '.tc-buttons',
        '.tc-btn-pause',
      ]);
      expect(
        await page.locator('.hud-readouts').evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
    });

    test('Daily, expanded mode picker and menu exits are reachable by touch', async ({ page }) => {
      await ready(page, '/?touch=1&tier=low');
      const home = page.locator('.home-screen');
      const menu = home.locator('.home-menu');
      expect((await menu.boundingBox())!.height).toBeGreaterThan(300);
      await separate(page, ['.home-copy', '.home-menu']);
      const mode = home.locator('.mode-selector');
      for (const radio of await mode.getByRole('radio').all()) await reachable(radio);
      await mode.getByRole('radio', { name: 'Realistic' }).tap();
      await expect(mode.getByRole('radio', { name: 'Realistic' })).toBeChecked();
      const advanced = mode.getByRole('button', { name: 'Advanced' });
      await advanced.tap();
      for (const select of await mode.locator('select').all()) await reachable(select);
      await mode.getByLabel('Currents', { exact: true }).selectOption('exaggerated');
      await expect(mode.locator('.mode-custom-tag')).toBeVisible();
      for (const name of ['Daily dive', 'Controls', 'Journal'])
        await reachable(menu.getByRole('button', { name: new RegExp(name) }));
      // Daily must launch even while the expanded picker is scrolled out of view.
      await menu.getByRole('button', { name: /Daily dive/ }).tap();
      await expect(page.locator('.briefing')).toBeVisible();
      const briefing = page.locator('.briefing');
      await briefing.getByRole('button', { name: 'Advanced' }).tap();
      for (const select of await briefing.locator('.mode-advanced select').all())
        await reachable(select);
      await reachable(briefing.locator('.briefing-begin'));
      await reachable(briefing.getByRole('button', { name: 'Free dive', exact: true }));
    });

    test('journal spoilers, navigation, entries and Close remain reachable', async ({ page }) => {
      await ready(page, '/?touch=1&tier=low');
      await page.locator('.home-menu').getByRole('button', { name: 'Journal', exact: true }).tap();
      const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
      await expect(journal).toBeVisible();
      await reachable(journal.locator('.jr-spoilers'));
      await journal.locator('.jr-spoilers').tap();
      await expect(journal.getByRole('checkbox')).toBeChecked();
      await reachable(journal.locator('.jr-nav-item').first());
      await reachable(journal.locator('.jr-nav-item').last());
      const site = journal.locator('.jr-site-card[data-target="titanic"]');
      await reachable(site);
      await site.tap();
      await reachable(journal.locator('.jr-next'));
      await journal.locator('.jr-next').tap();
      await expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered');
      expect(
        await journal.locator('.jr-header').evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
      await reachable(journal.locator('.jr-close'));
      await journal.locator('.jr-close').tap();
      await expect(journal).toBeHidden();
      await expect(page.locator('.home-screen')).toBeVisible();
    });
  });
}
