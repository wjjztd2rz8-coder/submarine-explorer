// @ts-expect-error Node types are intentionally absent from this browser-focused tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';
import { DEFAULT_SENSOR_PRESETS, DEFAULT_SPEED_PROFILES } from '../../src/core/config/gameplay.js';
import { EQUIPMENT } from '../../src/core/config/progress.js';
import titanicPois from '../../data/landmarks/titanic/pois.json' with { type: 'json' };

const shots = '.cache/codex/shots/d-modes';
const bowRadius = titanicPois.pois.find((poi) => poi.id === 'titanic-bow')!.radius_m;

test('Arcade, Realistic and Custom apply live and survive reload', async ({ page }) => {
  await mkdir(shots, { recursive: true });
  await page.goto('/?tile=titanic&landmark=titanic&poi=titanic-bow');
  await page.waitForFunction(() => window.__gameReady === true);
  await page.waitForFunction(
    () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded,
  );
  const initial = await page.evaluate(() => {
    const game = window.__game as {
      save: { get(): { gameplayMode: string; gameplay: { speedProfile: string } } };
      sub: { simSpeed: number };
      headlights: { lights: Array<{ intensity: number }> };
      discovery: { pois: Array<{ id: string; radius: number }> };
    };
    return {
      mode: game.save.get().gameplayMode,
      speed: game.sub.simSpeed,
      light: game.headlights.lights[0]!.intensity,
      scanRadius: game.discovery.pois.find((poi) => poi.id === 'titanic-bow')!.radius,
    };
  });
  // Every pilot carries the full kit; changing mode must still apply its sensor preset.
  expect(initial).toEqual({
    mode: 'arcade',
    speed: 1,
    light: 750,
    scanRadius:
      bowRadius * DEFAULT_SENSOR_PRESETS.extended.scanRadiusMultiplier * EQUIPMENT.scanDetail,
  });
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog.getByRole('radio', { name: 'Arcade' })).toBeChecked();
  await dialog.screenshot({ path: `${shots}/arcade-settings.png` });
  await dialog.getByRole('button', { name: 'Advanced' }).click();
  await dialog.getByRole('radio', { name: 'Realistic' }).check();
  await expect(dialog.getByRole('switch')).toHaveCount(4);
  await dialog.screenshot({ path: `${shots}/realistic-settings.png` });
  const realistic = await page.evaluate(() => {
    const game = window.__game as {
      effective: {
        submarine: { maxSpeed: number; maxVerticalSpeed: number };
        scan: { hintRangeFactor: number };
      };
      headlights: { lights: Array<{ intensity: number }>; fill: { intensity: number } };
      discovery: { pois: Array<{ id: string; radius: number }> };
    };
    return {
      forwardCap: game.effective.submarine.maxSpeed,
      descentCap: game.effective.submarine.maxVerticalSpeed,
      light: game.headlights.lights[0]!.intensity,
      fill: game.headlights.fill.intensity,
      scanRadius: game.discovery.pois.find((poi) => poi.id === 'titanic-bow')!.radius,
    };
  });
  expect(realistic).toEqual({
    forwardCap: DEFAULT_SPEED_PROFILES.research.maxSpeed * EQUIPMENT.thrust,
    descentCap: 0.5,
    light: 500,
    fill: 12,
    scanRadius:
      bowRadius * DEFAULT_SENSOR_PRESETS.realistic.scanRadiusMultiplier * EQUIPMENT.scanDetail,
  });
  await dialog.getByLabel('Visual waypoints', { exact: true }).check();
  await expect(dialog.locator('.mode-custom-tag')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape'); // resume from the pause menu
  await page.screenshot({ path: `${shots}/enhanced-lights.png` });
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  await page.keyboard.press('Escape');
  await page.locator('.pause-menu').getByRole('button', { name: 'Settings' }).click();
  await expect(dialog.locator('.mode-custom-tag')).toBeVisible();
  await dialog.getByRole('button', { name: 'Advanced' }).click();
  await expect(dialog.getByLabel('Visual waypoints', { exact: true })).toBeChecked();
});

test('v1 settings migrate to Arcade while keeping display choices', async ({ page }) => {
  await page.goto('/?tile=titanic');
  await page.evaluate(() => {
    localStorage.removeItem('subexplorer.settings.v3');
    localStorage.removeItem('subexplorer.settings.v2');
    localStorage.setItem(
      'subexplorer.settings.v1',
      JSON.stringify({
        version: 1,
        graphicsTier: 'low',
        postFx: false,
        detailStrength: 0.5,
        simSpeedDefault: 3,
        reduceMotion: true,
        captions: true,
        sonarPalette: 'highContrast',
      }),
    );
  });
  await page.reload();
  await page.waitForFunction(() => window.__gameReady === true);
  const migrated = await page.evaluate(() => ({
    current: JSON.parse(localStorage.getItem('subexplorer.settings.v3')!),
    legacy: localStorage.getItem('subexplorer.settings.v1'),
  }));
  expect(migrated.current).toMatchObject({
    version: 3,
    graphicsTier: 'low',
    postFx: false,
    detailStrength: 0.5,
    reduceMotion: true,
    captions: true,
    sonarPalette: 'highContrast',
    gameplayMode: 'arcade',
  });
  expect(migrated.legacy).not.toBeNull();
});
