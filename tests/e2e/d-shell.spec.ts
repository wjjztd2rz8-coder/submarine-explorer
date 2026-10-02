// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/d-shell';

async function boot(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 });
}

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
  await mkdir(shots, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await boot(page, '/');
  await expect(page.locator('.home-screen')).toBeVisible();
  // Keep every existing menu action; Daily dive and Advanced add two buttons.
  const existingActions = page.locator('.home-menu > button:not(.daily-card)');
  await expect(existingActions).toHaveCount(7);
  await expect(existingActions).toHaveText([
    'Continue',
    'Dive sites',
    'Free dive',
    'Journal',
    'Settings',
    'Controls',
    'Upgrades',
  ]);
  await expect(page.locator('.home-menu .daily-card')).toHaveCount(1);
  await expect(page.locator('.home-menu .mode-advanced-toggle')).toHaveCount(1);
  await expect(page.locator('.home-menu button')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.waitForFunction(
    () =>
      (window.__game as { homeGlobe: { textureReady: boolean; pinCount: number } }).homeGlobe
        .textureReady &&
      (window.__game as { homeGlobe: { pinCount: number } }).homeGlobe.pinCount > 0,
  );
  const atHome = await pose(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  expect(await pose(page)).toEqual(atHome);
  await page.screenshot({ path: `${shots}/home-1280.png` });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expectGlobeClearEdges(page);
  await page.screenshot({ path: `${shots}/home-1920.png` });

  await page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }).click();
  const sites = page.locator('.home-sites');
  await expect(sites).toBeVisible();
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
  await page.screenshot({ path: `${shots}/mission-select.png` });
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
  const paused = await pose(page);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  expect(await pose(page)).toEqual(paused);
  await page.screenshot({ path: `${shots}/pause-menu.png` });
  for (let i = 0; i < 20; i++) await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() =>
      document.querySelector('.pause-menu')?.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('.settings')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.settings')).toBeHidden();
  await expect(page.locator('.pause-menu')).toBeVisible();
  await page.locator('.pause-menu').getByRole('button', { name: 'Objectives' }).click();
  await expect(page.locator('.pause-objectives li')).toHaveCount(4);
  await expect(page.locator('.pause-objectives')).toContainText('north end');
  await page.screenshot({ path: `${shots}/pause-objectives.png` });
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-actions')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pause-menu')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Quit to home' }).click();
  await expect(page.locator('.home-screen')).toBeVisible();
  await expect(page.locator('.pause-menu')).toBeHidden();
  expect(new URL(page.url()).search).toBe('');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
  const homeAgain = await pose(page);
  await page.waitForTimeout(400);
  expect(await pose(page)).toEqual(homeAgain);
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
});

test('a home globe pin launches the same mission as its grid entry', async ({ page }) => {
  await boot(page, '/');
  const pin = page.locator('.globe.is-embedded .globe-pin[data-landmark="titanic"]');
  await expect(pin).toHaveAttribute('data-state', 'mission');
  await pin.focus();
  await expect(page.locator('.globe.is-embedded .globe-card')).toContainText('Titanic');
  await Promise.all([page.waitForURL(/[?&]mission=titanic\b/), page.keyboard.press('Enter')]);
  await expect(page.locator('.briefing')).toBeVisible();
});
