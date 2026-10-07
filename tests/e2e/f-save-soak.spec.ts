import { expect, test, type Page } from '@playwright/test';
import type { PerfStats } from '../../src/app/systems/quality.js';
import type { Save } from '../../src/core/Save.js';
import type { Mission } from '../../src/game/Mission.js';
import type { Progress } from '../../src/game/Progress.js';
import { clockFramesUntil, pauseClockBeforeNavigation, withClockFrames } from './helpers/clock.js';
import { waitForFrames } from './helpers/frames.js';

interface Game {
  perf: PerfStats;
  save: Save;
  mission: Mission;
  progress: Progress;
  props: { loaded: boolean };
  discovery: { loaded: boolean };
  explore: { ready: boolean };
  life: object | null;
  terrain: { texturesReady: Promise<void> };
  sub: { position: { x: number; y: number; z: number } };
}

async function ready(page: Page): Promise<void> {
  await clockFramesUntil(page, () => {
    const game = window.__game as unknown as Game | undefined;
    return Boolean(
      window.__gameReady &&
      game?.props.loaded &&
      game.discovery.loaded &&
      game.explore.ready &&
      game.life,
    );
  });
  // __gameReady deliberately permits neutral terrain placeholders. Exact GPU
  // baselines require the maps bound and those temporary textures disposed.
  await withClockFrames(page, () =>
    page.evaluate(() => (window.__game as unknown as Game).terrain.texturesReady),
  );
  // Loaded content and bound textures precede the renderer's GPU uploads.
  // Observe two presented frames before comparing exact boot allocations.
  await withClockFrames(page, () => waitForFrames(page, 2));
  await expect(page.locator('.briefing')).toBeVisible();
}

async function sample(page: Page) {
  // Let disposal notifications and subsequent real renders finish.
  await withClockFrames(page, () => waitForFrames(page, 2));
  return page.evaluate(() => {
    const { perf } = window.__game as unknown as Game;
    return {
      sceneObjects: perf.sceneObjects,
      geometries: perf.geometries,
      textures: perf.textures,
      drawCalls: perf.drawCalls,
      triangles: perf.triangles,
    };
  });
}

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 960, height: 640 } });

test('four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await pauseClockBeforeNavigation(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.addInitScript(() => {
    // Seed once per tab; navigation and reload must read what the game persisted.
    if (sessionStorage.getItem('save-soak-seeded')) return;
    sessionStorage.setItem('save-soak-seeded', '1');
    localStorage.setItem(
      'subexplorer.settings.v1',
      JSON.stringify({ version: 1, captions: true, graphicsTier: 'low' }),
    );
    localStorage.setItem(
      'subexplorer.bindings.v1',
      JSON.stringify({ version: 1, keys: { thrustForward: ['KeyI'], boost: [] } }),
    );
    localStorage.setItem(
      'subexplorer.discoveries.v1',
      JSON.stringify({ 'blake-plateau-corals/old-scan': '2026-09-01T00:00:00Z' }),
    );
    localStorage.setItem(
      'subexplorer.progress.v1',
      JSON.stringify({
        version: 0,
        rp: 400,
        lifetime: 900,
        legacyCredited: true,
        awarded: ['poi:blake-plateau-corals/old-scan'],
        upgrades: { 'light-range': 1 },
        ratings: { titanic: 3 },
      }),
    );
  });
  await page.goto('/?mission=blake-plateau-corals&tier=low&dynres=0&tutorial=0&lifeSeed=42');
  const baselines = new Map<string, Awaited<ReturnType<typeof sample>>>();
  let expectedMode = 'arcade';
  // Each mode boots twice, so both get a baseline and a repeated leak check.
  // Three restarts per dive exercise accumulation without 100 redundant samples.
  for (let iteration = 0; iteration < 4; iteration++) {
    await test.step(`cycle ${iteration + 1}`, async () => {
      await ready(page);
      const saved = await page.evaluate(() => {
        const game = window.__game as unknown as Game;
        return {
          mode: game.save.get().gameplayMode,
          captions: game.save.get().captions,
          settings: localStorage.getItem('subexplorer.settings.v1'),
          bindings: JSON.parse(localStorage.getItem('subexplorer.bindings.v3')!),
          discoveries: JSON.parse(localStorage.getItem('subexplorer.discoveries.v1')!),
          progress: game.progress.snapshot(),
        };
      });
      expect(saved.mode).toBe(expectedMode);
      expect(saved.captions).toBe(true);
      expect(saved.settings).toContain('"captions":true');
      expect(saved.bindings.keys.thrustForward).toEqual(['KeyI']);
      expect(saved.bindings.keys.boost).toEqual([]);
      // Discovery migration stays in memory until a scan; its original blob survives.
      expect(saved.discoveries['blake-plateau-corals/old-scan']).toBe('2026-09-01T00:00:00Z');
      expect(saved.progress).toMatchObject({
        points: 400,
        lifetime: 900,
        awarded: ['poi:blake-plateau-corals/old-scan'],
        upgrades: { 'light-range': 1 },
        ratings: { titanic: 3 },
      });

      const boot = await sample(page);
      expect(boot.sceneObjects).toBeGreaterThan(20);
      expect(boot.geometries).toBeGreaterThan(0);
      expect(boot.drawCalls).toBeGreaterThan(0);
      expect(boot.triangles).toBeGreaterThan(1000);
      const baseline = baselines.get(expectedMode);
      if (baseline) {
        expect(boot.sceneObjects).toBe(baseline.sceneObjects);
        expect(boot.geometries).toBe(baseline.geometries);
        expect(boot.textures).toBe(baseline.textures);
      } else baselines.set(expectedMode, boot);

      await page.locator('.briefing-begin').click();
      await expect(page.locator('.briefing')).toBeHidden();
      const before = await page.evaluate(() => ({
        ...(window.__game as unknown as Game).sub.position,
      }));
      await page.keyboard.down('i');
      try {
        await expect
          .poll(
            async () => {
              // Use the engine's 250 ms frame clamp instead of spending several
              // slow GPU renders to advance only 50 ms of held input.
              await page.clock.fastForward(250);
              return page.evaluate((position) => {
                const current = (window.__game as unknown as Game).sub.position;
                return Math.hypot(
                  current.x - position.x,
                  current.y - position.y,
                  current.z - position.z,
                );
              }, before);
            },
            { intervals: [20] },
          )
          .toBeGreaterThan(0.05);
      } finally {
        await page.keyboard.up('i');
      }
      await page.keyboard.press('Escape');
      await expect(page.locator('.pause-menu')).toBeVisible();
      await page
        .locator('.pause-menu')
        .getByRole('button', { name: 'Settings', exact: true })
        .click();
      const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
      expectedMode = expectedMode === 'arcade' ? 'realistic' : 'arcade';
      await settings
        .getByRole('radio', {
          name: expectedMode === 'arcade' ? 'Arcade' : 'Realistic',
          exact: true,
        })
        .check();
      await page.keyboard.press('Escape');
      await expect(settings).toBeHidden();

      const beforeRestart = await sample(page);
      // Also exercise cleanup repeatedly in one live scene. Navigation alone
      // replaces the JS heap and can hide objects leaked by restart listeners.
      for (let restart = 0; restart < 3; restart++) {
        await page.evaluate(() => {
          const mission = (window.__game as unknown as Game).mission;
          mission.restart();
          mission.start('blake-plateau-corals');
        });
        const afterRestart = await sample(page);
        expect(afterRestart.sceneObjects).toBe(beforeRestart.sceneObjects);
        expect(afterRestart.geometries).toBeLessThanOrEqual(beforeRestart.geometries);
        expect(afterRestart.textures).toBeLessThanOrEqual(beforeRestart.textures);
      }
      await page
        .locator('.pause-actions')
        .getByRole('button', { name: 'Resume', exact: true })
        .click();
      await page.keyboard.press('Escape');
      await page.locator('.pause-surface').click();
      await expect(page.locator('.mission-debrief')).toBeVisible();
      await Promise.all([
        page.waitForEvent('load'),
        page.locator('.mission-debrief [data-action="dive-again"]').click(),
      ]);
      await ready(page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await ready(page);
      expect(errors).toEqual([]);
    });
  }
  // Check the last reload too, not only the start of cycles 1–4.
  const final = await sample(page);
  expect(final.sceneObjects).toBe(baselines.get(expectedMode)!.sceneObjects);
  expect(final.geometries).toBe(baselines.get(expectedMode)!.geometries);
  expect(final.textures).toBe(baselines.get(expectedMode)!.textures);
  expect(errors).toEqual([]);
});
