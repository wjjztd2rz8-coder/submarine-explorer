import { expect, test, type Page } from './unlocked.js';
import type { GameContext } from '../../../src/app/context.js';

type AuditGame = Pick<
  GameContext,
  'home' | 'sub' | 'power' | 'progress' | 'save' | 'titleScene'
> & {
  mission: { elapsedS: number; emitted: unknown[] } | null;
  perf: { geometries: number; textures: number; sceneObjects: number };
};

async function boot(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
}
async function draws(page: Page) {
  return page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.drawCount);
}
async function idle(page: Page) {
  // Allow entry/close invalidation to present before measuring a steady interval.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const before = await draws(page);
  await page.waitForTimeout(300);
  expect(await draws(page)).toBe(before);
}
async function trapped(page: Page, selector: string) {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(key);
      expect(
        await page.evaluate((sel) => {
          const focused = document.activeElement as HTMLElement;
          return (
            document.querySelector(sel)!.contains(focused) &&
            focused.getClientRects().length > 0 &&
            !focused.closest('[hidden]')
          );
        }, selector),
      ).toBe(true);
    }
  }
}
async function gameplay(page: Page) {
  return page.evaluate(() => {
    const g = window.__game as unknown as AuditGame;
    return {
      pose: [g.sub.position.x, g.sub.position.y, g.sub.position.z, g.sub.yaw, g.sub.pitch],
      power: g.power.state,
      progress: g.progress.snapshot(),
      missionTime: g.mission?.elapsedS ?? null,
      missionEvents: g.mission?.emitted ?? [],
      discoveries: localStorage.getItem('subexplorer.discoveries.v1'),
    };
  });
}

/** Run the same title acceptance checks against root and project-base builds. */
export function titleAudit(base = '/') {
  test('title focus order, selectors and modal Escape return', async ({ page }) => {
    await boot(page, `${base}?tier=low`);
    const menu = page.locator('.home-menu');
    await expect(menu.getByRole('button', { name: 'Dive sites', exact: true })).toBeFocused();
    await trapped(page, '.home-menu');
    for (const entry of ['Dive sites', 'Free dive']) {
      for (const exit of ['Back to menu', 'Escape']) {
        await menu.getByRole('button', { name: entry, exact: true }).click();
        await trapped(page, '.home-screen');
        if (exit === 'Escape') await page.keyboard.press('Escape');
        else await page.getByRole('button', { name: exit }).click();
        await expect(menu.getByRole('button', { name: entry, exact: true })).toBeFocused();
      }
    }
    for (const [name, selector] of [
      ['Settings', '.settings'],
      ['Controls', '.settings'],
      ['Journal', '.journal'],
      ['Upgrades', '.upgrades'],
    ]) {
      const origin = menu.getByRole('button', { name, exact: true });
      await origin.click();
      await expect(page.locator(selector)).toBeVisible();
      await trapped(page, selector);
      await idle(page);
      const before = await draws(page);
      await page.keyboard.press('Escape');
      await expect(page.locator(selector)).toBeHidden();
      await expect(origin).toBeFocused();
      await expect.poll(() => draws(page)).toBeGreaterThan(before);
    }
  });

  test('saved Continue has first focus and Enter launches the saved mission', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('subexplorer.lastSite.v1', JSON.stringify({ missionId: 'titanic' })),
    );
    await boot(page, `${base}?tier=low`);
    const button = page.getByRole('button', { name: 'Continue', exact: true });
    await expect(button).toBeEnabled();
    await expect(button).toBeFocused();
    await Promise.all([page.waitForURL(/[?&]mission=titanic\b/), page.keyboard.press('Enter')]);
    await page.waitForFunction(() => window.__gameReady === true);
    await expect(page.locator('.briefing')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(base);
    await expect(page.locator('.home-screen')).toBeHidden();
    expect(await draws(page)).toBe(0);
  });

  test('an unavailable saved mission redirects focus and Daily is absent with an empty catalogue', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'subexplorer.lastSite.v1',
        JSON.stringify({ missionId: 'removed-mission' }),
      ),
    );
    await page.route('**/data/landmarks/index.json', (route) =>
      route.fulfill({ json: { version: 1, landmarks: [] } }),
    );
    await boot(page, `${base}?tier=low`);
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Dive sites', exact: true })).toBeFocused();
    await expect(page.locator('.daily-card')).toBeHidden();
    await trapped(page, '.home-menu');
  });

  test('optional Monterey and font failures preserve usable home and base-aware requests', async ({
    page,
  }) => {
    const requested: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      if (path.includes('/fonts/') || path.includes('/monterey-canyon/')) requested.push(path);
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/data/tiles/monterey-canyon/**', (route) => route.abort());
    await page.route('**/fonts/**', (route) => route.abort());
    await boot(page, `${base}?tier=low`);
    await expect
      .poll(() => requested.some((path) => path.endsWith('/monterey-canyon/meta.json')))
      .toBe(true);
    await expect.poll(() => requested.filter((path) => path.endsWith('.woff2')).length).toBe(3);
    expect(requested.every((path) => path.startsWith(base))).toBe(true);
    await expect(page.locator('.home-scene-caption')).toHaveText('Expedition preview');
    await expect(page.locator('.home-mark')).toBeVisible();
    await page
      .locator('.home-menu')
      .getByRole('button', { name: 'Dive sites', exact: true })
      .click();
    await expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible();
    await Promise.all([
      page.waitForURL(/[?&]mission=titanic\b/),
      page.locator('.home-sites [data-mission="titanic"]').click(),
    ]);
    await page.waitForFunction(() => window.__gameReady === true);
    await expect(page.locator('.briefing')).toBeVisible();
    await expect(page.locator('.fatal')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('mission, tile, globe and debug URLs bypass the title', async ({ page }) => {
    for (const route of ['mission=titanic', 'tile=titanic', 'globe=1', 'debugTerrain=1']) {
      await boot(page, `${base}?${route}&tier=low`);
      await expect(page.locator('.home-screen')).toBeHidden();
      expect(await draws(page)).toBe(0);
      if (route.startsWith('mission=')) await expect(page.locator('.briefing')).toBeVisible();
      if (route === 'globe=1') await expect(page.locator('.globe:not(.is-embedded)')).toBeVisible();
      await expect(page.locator('.fatal')).toHaveCount(0);
    }
  });

  test('reduced motion draws once, refreshes after resize and resumes after modal close', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page, `${base}?tier=low`);
    await expect
      .poll(() =>
        page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.terrainReady),
      )
      .toBe(true);
    await expect.poll(() => draws(page)).toBeGreaterThan(0);
    await idle(page);
    expect(
      await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated),
    ).toBe(false);
    const before = await draws(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => draws(page)).toBeGreaterThan(before);
    await idle(page);
    await page.locator('.home-menu').getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.locator('.settings');
    const reduceMotion = settings.getByRole('checkbox', {
      name: 'Reduce motion (no banking, particles or flashes)',
      exact: true,
    });
    await expect(settings).toBeVisible();
    await reduceMotion.check();
    await expect(reduceMotion).toBeChecked();
    expect(
      await page.evaluate(() => (window.__game as unknown as AuditGame).save.get().reduceMotion),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await idle(page);
    expect(
      await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated),
    ).toBe(false);
    await page.locator('.home-menu').getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(settings).toBeVisible();
    await reduceMotion.uncheck();
    await expect(reduceMotion).not.toBeChecked();
    expect(
      await page.evaluate(() => (window.__game as unknown as AuditGame).save.get().reduceMotion),
    ).toBe(false);
    await idle(page);
    const paused = await draws(page);
    await page.keyboard.press('Escape');
    await expect.poll(() => draws(page)).toBeGreaterThan(paused);
    expect(
      await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated),
    ).toBe(true);
  });

  test('home input and quit-to-home preserve gameplay and renderer allocations', async ({
    page,
  }) => {
    await boot(page, `${base}?tier=low`);
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    const initial = await gameplay(page);
    for (const key of ['w', 'Space', 'g', 'Shift']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(100);
      await page.keyboard.up(key);
    }
    expect(await gameplay(page)).toEqual(initial);
    await boot(page, `${base}?mission=titanic&tier=low&skipBriefing=1`);
    await expect(page.locator('.home-screen')).toBeHidden();
    expect(await draws(page)).toBe(0);
    await page.keyboard.press('Escape');
    const paused = await gameplay(page);
    await page
      .locator('.pause-menu')
      .getByRole('button', { name: 'Quit to home', exact: true })
      .click();
    await expect(page.locator('.home-screen')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.terrainReady),
      )
      .toBe(true);
    const perf = await page.evaluate(() => ({ ...(window.__game as unknown as AuditGame).perf }));
    for (let i = 0; i < 3; i++) {
      const before = await draws(page);
      await page
        .locator('.home-menu')
        .getByRole('button', { name: 'Journal', exact: true })
        .click();
      await idle(page);
      await page.keyboard.press('Escape');
      await expect.poll(() => draws(page)).toBeGreaterThan(before);
    }
    await page.waitForTimeout(300);
    expect(await gameplay(page)).toEqual(paused);
    const after = await page.evaluate(() => ({ ...(window.__game as unknown as AuditGame).perf }));
    expect(after.geometries).toBe(perf.geometries);
    expect(after.textures).toBe(perf.textures);
    expect(after.sceneObjects).toBe(perf.sceneObjects);
  });
}
