/** D2-PREDIVE pure parts: mode copy, option labels, UI scale steps, option order. */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { GAME_MODES, modeDescription } from '../../src/ui/ModeSelector.js';
import {
  GAMEPLAY_LABELS,
  GAMEPLAY_NOTES,
  clampUiScale,
  gameplayKeysInOrder,
  stepUiScale,
} from '../../src/ui/Settings.js';

describe('game modes', () => {
  it('lists only Arcade and Realistic, each with a one-line description', () => {
    expect(GAME_MODES.map((m) => m.id)).toEqual(['arcade', 'realistic']);
    expect(modeDescription('custom')).toBe('Your switches with Arcade speed, lights and sensors.');
    for (const mode of GAME_MODES) {
      expect(modeDescription(mode.id)).toBe(mode.description);
      expect(mode.description).not.toMatch(/\n/);
      expect(mode.description.length).toBeLessThanOrEqual(100);
    }
  });

  it('describes what each preset actually sets', () => {
    const { arcade, realistic } = DEFAULT_CONFIG.settings.gameplayPresets;
    expect(arcade.visualHints && !arcade.batteryOxygen && arcade.currents === 'off').toBe(true);
    expect(modeDescription('arcade')).toMatch(/waypoints/);
    expect(modeDescription('arcade')).toMatch(/No battery limit or currents/);
    expect(!realistic.visualHints && realistic.batteryOxygen).toBe(true);
    expect(realistic.currents).toBe('realistic');
    expect(modeDescription('realistic')).toMatch(/Battery, oxygen and currents; no waypoints/);
  });
});

describe('gameplay option labels and values', () => {
  it('names the four switches and describes world waypoints', () => {
    expect(GAMEPLAY_LABELS.visualHints).toBe('Visual waypoints');
    expect(GAMEPLAY_LABELS.startPosition).toBe('Start at surface');
    expect(GAMEPLAY_NOTES.visualHints).toMatch(/dive view/);
  });

  it('orders only the four supported switches', () => {
    const keys = gameplayKeysInOrder(DEFAULT_CONFIG.settings.gameplayOptions);
    expect([...keys].sort()).toEqual(Object.keys(DEFAULT_CONFIG.settings.gameplayOptions).sort());
    expect(
      gameplayKeysInOrder({ ...DEFAULT_CONFIG.settings.gameplayOptions, future: [] }).at(-1),
    ).toBe('startPosition');
  });

  it('includes every advanced option in the shared control', () => {
    expect(gameplayKeysInOrder(DEFAULT_CONFIG.settings.gameplayOptions)).toEqual([
      'batteryOxygen',
      'currents',
      'visualHints',
      'startPosition',
    ]);
  });
});

describe('UI scale control', () => {
  it('clamps and rounds to [80, 150]', () => {
    expect(clampUiScale(79)).toBe(80);
    expect(clampUiScale(151)).toBe(150);
    expect(clampUiScale(102.6)).toBe(103);
    expect(clampUiScale(Number.NaN)).toBe(100);
  });

  it('steps to the next multiple of 5 and stops at the ends', () => {
    expect(stepUiScale(100, 1)).toBe(105);
    expect(stepUiScale(100, -1)).toBe(95);
    expect(stepUiScale(103, 1)).toBe(105);
    expect(stepUiScale(103, -1)).toBe(100);
    expect(stepUiScale(150, 1)).toBe(150);
    expect(stepUiScale(80, -1)).toBe(80);
  });
});
