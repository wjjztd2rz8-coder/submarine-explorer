// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from './helpers/unlocked.js';

const shots = '.cache/codex/shots/f2-modes';
async function boot(page: Page, url = '/?tier=low') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__gameReady === true);
}
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`two modes, Advanced and Daily at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await mkdir(shots, { recursive: true });
    await page.setViewportSize(viewport);
    await boot(page);
    const mode = page.locator('.home-screen .mode-selector');
    await expect(mode.getByRole('radio')).toHaveCount(2);
    await expect(mode.getByRole('radio', { name: 'Arcade' })).toBeChecked();
    const toggle = mode.getByRole('button', { name: 'Advanced' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(mode.locator('.mode-advanced')).toBeHidden();
    const daily = page.locator('.daily-card');
    await expect(daily).toBeVisible();
    await expect(daily).toContainText('Daily dive');
    await expect(daily.locator('.daily-card-stars')).toHaveAttribute(
      'aria-label',
      'Best today: 0 of 3 stars',
    );
    await expect(daily).toBeInViewport();
    await page.screenshot({ path: `${shots}/home-${viewport.width}-closed.png` });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const currents = mode.getByLabel('Currents', { exact: true });
    await expect(currents.locator('option')).toHaveText(['Off', 'Realistic', 'Exaggerated']);
    await currents.selectOption('exaggerated');
    await expect(mode.locator('.mode-custom-tag')).toBeVisible();
    await expect(mode.locator('input:checked')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window.__game as { save: { get(): { gameplayMode: string } } }).save.get()
              .gameplayMode,
        ),
      )
      .toBe('custom');
    for (const target of [toggle, mode.locator('.mode-seg').first(), currents]) {
      const box = await target.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: `${shots}/home-${viewport.width}-advanced.png` });
    await mode.getByRole('radio', { name: 'Realistic' }).check();
    await expect(currents).toHaveValue('realistic');
    await expect(mode.locator('.mode-custom-tag')).toBeHidden();
    await mode.getByRole('radio', { name: 'Arcade' }).check();
    await expect(currents).toHaveValue('off');
    await toggle.click();
    await expect(mode.locator('.mode-advanced')).toBeHidden();

    await daily.click();
    await page.waitForFunction(
      () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily),
    );
    const briefing = page.locator('.briefing');
    await expect(briefing).toBeVisible();
    await expect(briefing.locator('.briefing-title')).toContainText('Daily dive');
    const diveMode = briefing.locator('.mode-selector');
    await expect(diveMode.getByRole('radio')).toHaveCount(2);
    await expect(diveMode.locator('.mode-advanced')).toBeHidden();
    await expect(briefing.getByRole('button', { name: 'Free dive', exact: true })).toBeVisible();
    await briefing.locator('.briefing-begin').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/daily-briefing-${viewport.width}.png` });
    await diveMode.getByRole('button', { name: 'Advanced' }).click();
    await expect(diveMode.locator('.mode-advanced')).toBeVisible();
    await page.screenshot({ path: `${shots}/daily-briefing-${viewport.width}-advanced.png` });
    await briefing.getByRole('button', { name: 'Free dive', exact: true }).click();
    await page.waitForFunction(
      () => window.__gameReady === true && (window.__game as { mission: unknown }).mission === null,
    );
    await expect(page.locator('.objectives-panel')).toHaveCount(0);
    await expect(page.locator('.briefing')).toHaveCount(0);
  });
}

test('Daily completion stores today stars and streak separately from settings', async ({
  page,
}) => {
  await boot(page);
  await page.locator('.daily-card').click();
  await page.waitForFunction(
    () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily),
  );
  await page.locator('.briefing-begin').click();
  await expect(page.locator('.briefing')).toBeHidden();
  const data = await page.evaluate(() => {
    const game = window.__game as {
      daily: { date: string; site: string };
      mission: { def: { objectives: Array<{ poi: string }> }; end(): void };
      bus: { emit(name: string, payload: unknown): void };
      progress: { rating(id: string): number };
    };
    for (const objective of game.mission.def.objectives)
      game.bus.emit('scan:complete', {
        landmarkId: game.daily.site,
        poiId: objective.poi,
        firstTime: true,
      });
    game.bus.emit('scan:complete', {
      landmarkId: game.daily.site,
      poiId: 'life:test-daily',
      firstTime: true,
    });
    return { date: game.daily.date, site: game.daily.site };
  });
  await page.keyboard.press('Escape');
  await page.locator('.pause-surface').click();
  // The router persists the rating when opening the debrief.
  await expect(page.locator('.mission-debrief')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(({ date }) => {
        const game = window.__game as { progress: { rating(id: string): number } };
        return game.progress.rating(`daily-${date}`);
      }, data),
    )
    .toBe(3);
  const streak = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('subexplorer.daily.v1')!),
  );
  expect(streak).toEqual({ version: 1, lastCompletedDate: data.date, streak: 1 });
  await boot(page);
  await expect(page.locator('.daily-card-stars')).toHaveAttribute(
    'aria-label',
    'Best today: 3 of 3 stars · 1 day streak',
  );
});

test('a fresh pilot gets a Daily dive within the unlocked hull depth', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'subexplorer.progress.v1',
      JSON.stringify({
        version: 1,
        lifetime: 0,
        points: 0,
        awarded: [],
        ratings: {},
        upgrades: {},
        legacyCredited: true,
      }),
    ),
  );
  await boot(page);
  await expect(page.locator('.daily-card')).toBeVisible();
  await page.locator('.daily-card').click();
  await page.waitForFunction(
    () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily),
  );
  expect(
    await page.evaluate(() => {
      const game = window.__game as {
        progress: { canDive(depth: number): boolean };
        mission: { def: { briefing: { depth_m: number } } };
      };
      return game.progress.canDive(game.mission.def.briefing.depth_m);
    }),
  ).toBe(true);
});

test.describe('phone touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('opens Advanced with a tap and shows the Custom tag', async ({ page }) => {
    await mkdir(shots, { recursive: true });
    await boot(page);
    const mode = page.locator('.home-screen .mode-selector');
    await mode.getByRole('button', { name: 'Advanced' }).tap();
    await expect(mode.locator('.mode-advanced')).toBeVisible();
    await mode.getByLabel('Currents', { exact: true }).selectOption('exaggerated');
    await expect(mode.locator('.mode-custom-tag')).toBeVisible();
    await mode.getByLabel('Currents', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${shots}/phone-touch-advanced.png` });
    await mode.getByRole('button', { name: 'Advanced' }).tap();
    await expect(mode.locator('.mode-advanced')).toBeHidden();
    await expect(page.locator('.daily-card')).toBeInViewport();
  });
});
