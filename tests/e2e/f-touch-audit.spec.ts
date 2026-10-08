import { expect, test, type Locator, type Page } from '@playwright/test';

const dive = '/?tile=titanic&landmark=_test&poi=test-bow&skipBriefing=1&touch=1&tier=low';

async function ready(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

async function separate(page: Page, selectors: string[]): Promise<void> {
  const viewport = page.viewportSize()!;
  // Observe one layout snapshot. Hundreds of separate browser round trips can
  // exhaust a shard while WebGL is rendering, even when every box is correct.
  await expect
    .poll(() =>
      page.evaluate(
        (selectors) =>
          selectors.every((selector) => {
            const el = document.querySelector<HTMLElement>(selector);
            return (
              !!el &&
              el.getBoundingClientRect().width > 0 &&
              el.getBoundingClientRect().height > 0 &&
              getComputedStyle(el).visibility === 'visible'
            );
          }),
        selectors,
      ),
    )
    .toBe(true);
  const boxes = await page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const el = document.querySelector<HTMLElement>(selector)!;
        const box = el.getBoundingClientRect();
        return { selector, x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    selectors,
  );
  for (const box of boxes) {
    expect(box.x, box.selector).toBeGreaterThanOrEqual(0);
    expect(box.y, box.selector).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height);
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
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  const box = await target.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { width: r.width, height: r.height, receivesTap: hit !== null && element.contains(hit) };
  });
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.receivesTap, 'the centre of the touch target must receive the tap').toBe(true);
}

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 667, height: 375 },
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

    // Stress every viewport at large UI; the smallest portrait/landscape also
    // cover normal/minimum scale. Other HUD specs cover normal UI at larger sizes.
    for (const scale of viewport.width === 360 || viewport.width === 667 ? [80, 100, 150] : [150]) {
      test(`fresh dive separates HUD and controls at ${scale}% UI`, async ({ page }, testInfo) => {
        await ready(page, dive);
        await page.evaluate((uiScale) => {
          (window.__game as { save: { save(settings: { uiScale: number }): void } }).save.save({
            uiScale,
          });
        }, scale);
        await expect(page.locator('.scan-panel')).toBeVisible();
        await expect(page.locator('.scan-hint')).toHaveText('HOLD SCAN TO SCAN');
        const controls = ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause'];
        const hud = ['.sonar', '.hud-readouts', '.scan-panel', '.hud-attribution'];
        if (viewport.width < viewport.height)
          await expect(page.locator('.tc-rotate-hint')).toBeHidden();
        await separate(page, [...hud, '.onboard-card', ...controls]);
        for (const button of await page.locator('.d2-sonar-controls button, .tc-btn').all())
          await reachable(button);
        for (const label of ['Skip step', 'Skip tutorial'])
          await reachable(page.getByRole('button', { name: label, exact: true }));
        // Check every instruction: the last step is longer than the first.
        for (const step of ['move', 'depth', 'lights', 'scan', 'journal']) {
          await expect(page.locator('.onboard-card')).toHaveAttribute('data-step', step);
          expect(
            await page.locator('.onboard-card').evaluate((e) => e.scrollWidth <= e.clientWidth),
          ).toBe(true);
          await separate(page, [...hud, '.onboard-card', ...controls]);
          if (step !== 'journal')
            await page.getByRole('button', { name: 'Skip step', exact: true }).tap();
        }
        if (scale === 100)
          await page.screenshot({ path: testInfo.outputPath('tutorial-landscape.png') });
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
        await separate(page, ['.sonar', '.tc-buttons', '.tc-btn-pause']);
        if (scale === 100)
          await page.screenshot({ path: testInfo.outputPath('expanded-sonar.png') });
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
        '.hud-attribution',
      ]);
      expect(
        await page.locator('.hud-readouts').evaluate((e) => e.scrollWidth <= e.clientWidth),
      ).toBe(true);
    });

    // 360×640 was added for the HUD audit; retain the existing menu matrix.
    if (viewport.width === 360) return;

    // Full menu/Journal journeys run at 390x844 portrait and 667x375 landscape.
    // The HUD and mission layout checks above still run at all four sizes.
    if (viewport.width === 390 || viewport.width === 667) {
      test('Daily, expanded mode picker and menu exits are reachable by touch', async ({
        page,
      }) => {
        await ready(page, '/?touch=1&tier=low');
        const home = page.locator('.home-screen');
        const menu = home.locator('.home-menu');
        // The menu sits in the scrolling `.home-body` (F-TITLE-D); the scroller stays on screen.
        expect((await home.locator('.home-body').boundingBox())!.height).toBeGreaterThan(300);
        await separate(page, ['.home-copy', '.home-body']);
        await expect(page.locator('.globe.is-embedded')).toBeHidden();
        expect(
          await menu
            .locator(':scope > *')
            .evaluateAll((elements) =>
              elements.map((element) =>
                element.classList.contains('daily-card')
                  ? 'Daily dive'
                  : element.classList.contains('mode-selector')
                    ? 'Mode'
                    : element.textContent,
              ),
            ),
        ).toEqual([
          'Continue',
          'Dive sites',
          'Free dive',
          'Daily dive',
          'Mode',
          'Journal',
          'Settings',
          'Controls',
          'Upgrades',
        ]);
        for (const name of ['Dive sites', 'Free dive']) {
          const origin = menu.getByRole('button', { name, exact: true });
          await reachable(origin);
          await origin.tap();
          await expect(home.locator('.home-sites h2')).toHaveText(name);
          await expect(page.locator('.globe.is-embedded')).toBeVisible();
          await separate(page, ['.home-globe-wrap', '.home-sites']);
          const back = home.getByRole('button', { name: 'Back to menu' });
          await reachable(back);
          await back.tap();
          await expect(page.locator('.globe.is-embedded')).toBeHidden();
          await expect(origin).toBeFocused();
        }
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
        await reachable(briefing.getByRole('link', { name: 'Free dive', exact: true }));
      });

      test('journal spoilers, navigation, entries and Close remain reachable', async ({ page }) => {
        await ready(page, '/?touch=1&tier=low');
        await page
          .locator('.home-menu')
          .getByRole('button', { name: 'Journal', exact: true })
          .tap();
        const journal = page.getByRole('dialog', { name: 'Journal', exact: true });
        await expect(journal).toBeVisible();
        await reachable(journal.locator('.jr-spoilers'));
        await journal.locator('.jr-spoilers').tap();
        await expect(journal.getByRole('checkbox')).toBeChecked();
        const contents = journal.locator('.jr-contents-toggle');
        if (await contents.isVisible()) await contents.tap();
        await reachable(journal.locator('.jr-nav-item').first());
        await reachable(journal.locator('.jr-nav-item').last());
        if (await contents.isVisible()) await contents.tap();
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
    }
  });
}
