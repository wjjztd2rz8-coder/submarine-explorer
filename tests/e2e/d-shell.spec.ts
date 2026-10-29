import { expect, test, type Page } from './helpers/unlocked.js';
import { waitForFrames } from './helpers/frames.js';
import { test as freshTest } from '@playwright/test';
import { clockFramesUntil, pauseClockBeforeNavigation } from './helpers/clock.js';
import { homeReady, openSiteList } from './helpers/home.js';

for (const layout of [
  { width: 1280, height: 800, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
]) {
  const { touch } = layout;
  const label = `${layout.width}x${layout.height} ${touch ? 'touch' : 'desktop'}`;
  freshTest.describe(`Home Journal shortcut ${label}`, () => {
    freshTest.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: touch,
      isMobile: touch,
      storageState: { cookies: [], origins: [] },
      serviceWorkers: 'block',
    });

    freshTest(
      'Journal shortcut survives cancelling a briefing and respects covering dialogs',
      async ({ page }) => {
        // Regression guard: the dive input gate swallowed Home's Journal shortcut after cancellation.
        await pauseClockBeforeNavigation(page);
        await page.goto('/?tier=low', { waitUntil: 'domcontentloaded' });
        await homeReady(page, true);
        const journal = page.locator('.journal');
        const shortcut = async () => {
          await page.keyboard.press('j');
          await page.clock.runFor(50);
        };
        await shortcut();
        await expect(journal).toBeVisible();
        await page.keyboard.press('Escape');
        const sites = page.locator('.home-menu').getByRole('button', { name: 'Dive sites' });
        if (touch) await sites.tap();
        else await sites.click();
        await openSiteList(page, touch, true);
        const site = page.locator('.home-sites [data-mission="titanic"]');
        await Promise.all([
          page.waitForURL(/[?&]mission=titanic\b/, { waitUntil: 'domcontentloaded' }),
          touch ? site.tap() : site.click(),
        ]);
        await clockFramesUntil(page, () => window.__gameReady === true && !!window.__game?.mission);
        const cancel = page.locator('.briefing-cancel');
        if (touch) await cancel.tap();
        else await cancel.click();
        await homeReady(page, true);
        await shortcut();
        await expect(journal).toBeVisible();
        await expect(page.locator('body')).toHaveAttribute('data-app-state', 'home');
        await shortcut();
        await expect(journal).toBeHidden();

        // A covering modal keeps ownership of J, and closing it must not replay the key.
        await page
          .locator('.home-menu')
          .getByRole('button', { name: 'Settings', exact: true })
          .click();
        await shortcut();
        await expect(journal).toBeHidden();
        await page.keyboard.press('Escape');
        await page.clock.runFor(50);
        await expect(journal).toBeHidden();
        await shortcut();
        await expect(journal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(journal).toBeHidden();
        await expect(page.locator('.home-screen')).toBeVisible();
      },
    );
  });
}

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

test('browser Back and Forward resolve the URL after quitting to Home', async ({ page }) => {
  // Regression guard: Back restored a mission URL while Home retained its disposed mission runtime.
  await boot(page, '/?mission=titanic&tier=low');
  await page.locator('.briefing-begin').click();
  await expect(page.locator('.briefing')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Quit to home' }).click();
  await expect(page.locator('.home-screen')).toBeVisible();
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.briefing')).toBeVisible();
  await expect(page.locator('.home-screen')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'dive');
  await expect(page).toHaveURL(/[?&]mission=titanic\b/);
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.home-screen')).toBeVisible();
  await expect(page.locator('.briefing')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'home');
  await expect(page).not.toHaveURL(/[?&]mission=/);
});

test('returning Home and selecting another site keeps one HUD and touch control tree', async ({
  page,
}) => {
  // Guards duplicate controls and stale input after leaving a dive and re-entering.
  await boot(page, '/?tile=great-blue-hole&tier=low&touch=1');
  await page.keyboard.down('w');
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Quit to home' }).click();
  await page.keyboard.up('w');
  await expect(page.locator('.home-screen')).toBeVisible();
  await expect(page.locator('.tc-root')).toBeHidden();
  await page.locator('.home-menu').getByRole('button', { name: 'Free dive', exact: true }).click();
  await Promise.all([
    page.waitForURL(/[?&]tile=blake-plateau-corals\b/),
    page.locator('.home-sites [data-tile="blake-plateau-corals"]').click(),
  ]);
  await page.waitForFunction(() => window.__gameReady === true);
  await expect(page.locator('.hud')).toHaveCount(1);
  await expect(page.locator('.tc-root')).toHaveCount(1);
  await expect(page.locator('.home-screen')).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__game as { input: { state: { throttle: number } } }).input.state.throttle,
      ),
    )
    .toBe(0);
  await page.keyboard.down('w');
  await expect
    .poll(() =>
      page.evaluate(
        () => (window.__game as { input: { state: { throttle: number } } }).input.state.throttle,
      ),
    )
    .toBe(1);
  await page.keyboard.up('w');
});

async function pose(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const p = (window.__game as { sub: { position: { x: number; y: number; z: number } } }).sub
      .position;
    return [p.x, p.y, p.z];
  });
}

async function globeEdgePixels(page: Page): Promise<number[]> {
  return page.locator('.globe.is-embedded .globe-canvas').evaluate((node) => {
    const source = node as HTMLCanvasElement;
    const probe = document.createElement('canvas');
    probe.width = 5;
    probe.height = 1;
    const ctx = probe.getContext('2d', { willReadFrequently: true })!;
    const points = [
      [2, source.height / 2],
      [source.width - 3, source.height / 2],
      [source.width / 2, 2],
      [source.width / 2, source.height - 3],
      [source.width / 2, source.height / 2],
    ];
    points.forEach(([x, y], index) =>
      ctx.drawImage(source, Math.floor(x), Math.floor(y), 1, 1, index, 0, 1, 1),
    );
    const rgba = ctx.getImageData(0, 0, 5, 1).data;
    return points.map((_, index) => rgba[index * 4 + 3]);
  });
}

async function expectGlobeClearEdges(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const [left, right, top, bottom, centre] = await globeEdgePixels(page);
      return {
        left: left < 8,
        right: right < 8,
        top: top < 8,
        bottom: bottom < 8,
        centre: centre > 200,
      };
    })
    .toEqual({ left: true, right: true, top: true, bottom: true, centre: true });
}

test('home, site grid, pause, objectives, resume and quit', async ({ page }) => {
  // Guards the shell round trip; layout captures live in the title layout specs.
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page, '/');
  await expect(page.locator('.home-screen')).toBeVisible();
  // Preserve all actions and the title menu’s DOM/Tab order, including Daily and mode.
  const existingActions = page.locator('.home-menu > button:not(.daily-card)');
  await expect(existingActions).toHaveCount(7);
  await expect(existingActions).toHaveText([
    /^Dive(:|$)/,
    'Dive sites',
    'Free dive',
    'Journal',
    'Your sub',
    'Settings',
    'Controls',
  ]);
  expect(
    await page
      .locator('.home-menu > *')
      .evaluateAll((elements) =>
        elements.map((element) =>
          element.classList.contains('daily-card')
            ? 'Daily dive'
            : element.classList.contains('mode-selector')
              ? 'Mode'
              : element.textContent?.replace(/^Dive: .*/, 'Dive'),
        ),
      ),
  ).toEqual([
    'Dive',
    'Dive sites',
    'Free dive',
    'Daily dive',
    'Mode',
    'Journal',
    'Your sub',
    'Settings',
    'Controls',
  ]);
  await expect(page.locator('.home-menu .daily-card')).toHaveCount(1);
  await expect(page.locator('.home-menu .mode-advanced-toggle')).toHaveCount(1);
  // Seven actions, Daily and Advanced; modes are native radios, not buttons.
  await expect(page.locator('.home-menu button')).toHaveCount(9);
  const mode = page.locator('.home-menu').getByRole('radiogroup', { name: 'Game mode' });
  await expect(mode.getByRole('radio')).toHaveCount(2);
  await expect(mode.getByRole('radio', { name: 'Arcade' })).toBeChecked();
  await expect(mode.getByRole('radio', { name: 'Realistic' })).toBeVisible();
  await expect(page.locator('.home-menu .mode-advanced-toggle')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('.home-menu .mode-advanced')).toBeHidden();
  await expect(page.getByRole('button', { name: /^Dive(:|$)/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  // The title scene backs the menu; the embedded globe opens only in the sites view.
  await expect(page.locator('.globe.is-embedded')).toBeHidden();
  const diveResources = () =>
    page.evaluate(() => {
      const game = window.__game!;
      return [
        'terrain',
        'sub',
        'scanner',
        'power',
        'props',
        'life',
        'post',
        'missionRouter',
      ].filter((name) => name in game);
    });
  expect(await diveResources()).toEqual([]);
  await page.keyboard.down('w');
  // Give held input a loop interval to exercise lazy dive initialization.
  await waitForFrames(page, 2);
  await page.keyboard.up('w');
  expect(await diveResources()).toEqual([]);

  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).click();
  const sites = page.locator('.home-sites');
  await expect(sites).toBeVisible();
  await expect(page.locator('.globe.is-embedded')).toBeVisible();
  await page.waitForFunction(
    () =>
      (window.__game as { homeGlobe: { textureReady: boolean; pinCount: number } }).homeGlobe
        .textureReady &&
      (window.__game as { homeGlobe: { pinCount: number } }).homeGlobe.pinCount > 0,
  );
  await expect
    .poll(() =>
      page.locator('.globe.is-embedded .globe-canvas').evaluate((canvas) => {
        const box = canvas.getBoundingClientRect();
        return Math.abs(
          (canvas as HTMLCanvasElement).width / (canvas as HTMLCanvasElement).height -
            box.width / box.height,
        );
      }),
    )
    .toBeLessThan(0.02);
  await expectGlobeClearEdges(page);
  await expect(sites.locator('[data-mission="titanic"]')).toBeVisible();
  await expect(sites.locator('[data-mission="titanic"] .mission-badge')).toHaveCount(0);
  await expect(sites.locator('[data-mission="titanic"]')).toContainText(/Class B hull/);
  await expect(sites.locator('[data-mission="titanic"]')).toContainText(/\d+\/\d+ logged/);
  await sites.locator('[data-mission="titanic"]').hover();
  await expect(page.locator('.globe.is-embedded .globe-card')).toContainText('Titanic');
  await Promise.all([
    page.waitForURL(/[?&]mission=titanic\b/),
    sites.locator('[data-mission="titanic"]').click(),
  ]);
  await page.waitForFunction(() => window.__gameReady === true);
  await expect(page.locator('.briefing')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.briefing')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'pause');
  const paused = await pose(page);
  await page.keyboard.down('w');
  // Keep the freeze observation window, with fewer required software-GL frames.
  await waitForFrames(page, 2, 400);
  await page.keyboard.up('w');
  expect(await pose(page)).toEqual(paused);
  // Exercise both trap boundaries directly; Settings round trips have their own spec.
  const pause = page.locator('.pause-menu');
  const quit = pause.getByRole('button', { name: 'Quit to home' });
  await quit.focus();
  await page.keyboard.press('Tab');
  await expect(pause.getByRole('button', { name: 'Resume', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(quit).toBeFocused();
  await page.locator('.pause-menu').getByRole('button', { name: 'Objectives' }).click();
  await expect(page.locator('.pause-objectives li')).toHaveCount(4);
  await expect(page.locator('.pause-objectives')).toContainText('north end');
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-actions')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'dive');
  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  // dispatchEvent needs no rendered frame: hosted software GL can stall click's scroll-into-view for minutes.
  await quit.dispatchEvent('click');
  await expect(page.locator('.home-screen')).toBeVisible();
  await expect(page.locator('.pause-menu')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-app-state', 'home');
  expect(new URL(page.url()).search).toBe('');
  await expect(page.getByRole('button', { name: /^Dive(:|$)/ })).toBeEnabled();
  // Freezing the sub after Quit is covered by the title scene lifecycle spec.
});

test('URL probes bypass home and home site grid scrolls vertically with trapped focus', async ({
  page,
}) => {
  for (const url of [
    '/?tile=titanic',
    '/?mission=titanic',
    '/?skipBriefing=1',
    '/?depth=30',
    '/?globe=1',
  ]) {
    await boot(page, url);
    await expect(page.locator('.home-screen')).toBeHidden();
  }
  await boot(page, '/');
  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).click();
  const scroll = page.locator('.home-sites-scroll');
  await expect(scroll.locator('[data-mission="titanic"]')).toBeVisible();
  await scroll.hover();
  const before = await scroll.evaluate((el) => ({ top: el.scrollTop, left: el.scrollLeft }));
  await page.mouse.wheel(0, 600);
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(before.top);
  expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(before.left);
  for (let i = 0; i < 35; i++) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() =>
      document.querySelector('.home-screen')?.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.home-sites')).toBeHidden();
  await expect(page.locator('.globe.is-embedded')).toBeHidden();
  await expect(
    page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }),
  ).toBeFocused();
});

test('a home globe pin launches the same mission as its grid entry', async ({ page }) => {
  await boot(page, '/');
  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).click();
  const pin = page.locator('.globe.is-embedded .globe-pin[data-landmark="titanic"]');
  await expect(pin).toHaveAttribute('data-state', 'mission');
  await pin.focus();
  await expect(page.locator('.globe.is-embedded .globe-card')).toContainText('Titanic');
  await Promise.all([page.waitForURL(/[?&]mission=titanic\b/), page.keyboard.press('Enter')]);
  await expect(page.locator('.briefing')).toBeVisible();
});

test('Home needs no dive tile; selecting a site keeps loading until its first frame', async ({
  page,
}) => {
  // Guards eager default-tile requests and premature readiness during a selected dive load.
  const diveRequests: string[] = [];
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/data/tiles/titanic/**', async (route) => {
    diveRequests.push(route.request().url());
    await held;
    await route.continue();
  });
  await boot(page, '/?tier=low');
  await expect(page.getByRole('button', { name: /^Dive(:|$)/ })).toBeEnabled();
  await waitForFrames(page, 8, 400);
  expect(diveRequests).toEqual([]);
  await page
    .locator('.home-menu')
    .getByRole('button', { name: /^Dive(:|$)/ })
    .click();
  await expect(page).toHaveURL(/[?&]mission=titanic/);
  await expect(page.locator('#startup-loading')).toContainText('Loading dive…');
  expect(await page.evaluate(() => window.__gameReady === true)).toBe(false);
  expect(await page.evaluate(() => window.__game?.sub)).toBeUndefined();
  expect(diveRequests).toHaveLength(1);
  release();
  await page.waitForFunction(() => window.__gameReady === true);
  await expect(page.locator('#startup-loading')).toHaveCount(0);
  await expect(page.locator('.briefing')).toBeVisible();
  await expect(page.locator('.home-screen')).toBeHidden();
});

for (const [saved, destination, title] of [
  [null, 'titanic', 'Titanic dive'],
  ['great-blue-hole', 'great-blue-hole', 'Great Blue Hole: Lighthouse Reef'],
  ['missing-site', 'titanic', 'Titanic dive'],
] as const) {
  test(`Home button and caption share the launch destination: ${saved ?? 'first visit'}`, async ({
    page,
  }) => {
    // Regression guard: the caption named Monterey while Dive launched another site.
    await page.addInitScript((saved) => {
      if (saved)
        localStorage.setItem('subexplorer.lastSite.v1', JSON.stringify({ missionId: saved }));
      else localStorage.removeItem('subexplorer.lastSite.v1');
    }, saved);
    await boot(page, '/?tier=low');
    const primary = page.locator('.home-primary');
    await expect(primary).toHaveText(`Dive: ${title}`);
    await expect(page.locator('.home-scene-caption')).toHaveText(`${title} · Next dive`);
    await primary.click();
    await expect(page).toHaveURL((url) => url.searchParams.get('mission') === destination);
  });
}
