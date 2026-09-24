/** D2-PREDIVE pure parts: mode copy, option labels, UI scale steps, option order. */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { BRIEFING_MORE_OPTIONS } from '../../src/ui/Briefing.js';
import {
  GAME_MODES,
  gameplayValueLabel,
  modeDescription,
  parseGameplayValue,
} from '../../src/ui/ModeSelector.js';
import {
  GAMEPLAY_LABELS,
  GAMEPLAY_NOTES,
  clampUiScale,
  gameplayKeysInOrder,
  stepUiScale,
} from '../../src/ui/Settings.js';

describe('game modes', () => {
  it('lists Arcade, Realistic and Custom, each with a one-line description', () => {
    expect(GAME_MODES.map((m) => m.id)).toEqual(['arcade', 'realistic', 'custom']);
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
    expect(realistic.speedProfile).toBe('research');
    expect(modeDescription('realistic')).toMatch(/no waypoints, battery and oxygen, currents/);
  });
});

describe('gameplay option labels and values', () => {
  it('labels values for selects', () => {
    expect(gameplayValueLabel('visualHints', true)).toBe('On');
    expect(gameplayValueLabel('sonarMarkers', false)).toBe('Off');
    expect(gameplayValueLabel('simSpeed', 2)).toBe('2×');
    expect(gameplayValueLabel('startPosition', 'near-site')).toBe('Near site');
    expect(gameplayValueLabel('currents', 'gentle')).toBe('Gentle');
  });

  it('parses control strings back to the option type', () => {
    const o = DEFAULT_CONFIG.settings.gameplayOptions;
    expect(parseGameplayValue(o.sonarMarkers, 'false')).toBe(false);
    expect(parseGameplayValue(o.visualHints, 'true')).toBe(true);
    expect(parseGameplayValue(o.simSpeed, '3')).toBe(3);
    expect(parseGameplayValue(o.currents, 'realistic')).toBe('realistic');
  });

  it('keeps visual waypoints and sonar markers as separate, described settings', () => {
    expect(GAMEPLAY_LABELS.visualHints).toBe('Visual waypoints');
    expect(GAMEPLAY_LABELS.sonarMarkers).toBe('Sonar markers');
    expect(GAMEPLAY_NOTES.visualHints).toMatch(/dive view/);
    expect(GAMEPLAY_NOTES.sonarMarkers).toMatch(/sonar map/);
  });

  it('orders every configured option, pairing related ones', () => {
    const keys = gameplayKeysInOrder(DEFAULT_CONFIG.settings.gameplayOptions);
    expect([...keys].sort()).toEqual(Object.keys(DEFAULT_CONFIG.settings.gameplayOptions).sort());
    expect(keys.indexOf('sonarMarkers')).toBe(keys.indexOf('visualHints') + 1);
    expect(
      gameplayKeysInOrder({ ...DEFAULT_CONFIG.settings.gameplayOptions, future: [] }).at(-1),
    ).toBe('future');
  });

  it('offers the briefing More options the brief asks for', () => {
    expect(BRIEFING_MORE_OPTIONS.map((o) => o.key)).toEqual([
      'visualHints',
      'sonarMarkers',
      'batteryOxygen',
      'currents',
      'speedProfile',
    ]);
    for (const o of BRIEFING_MORE_OPTIONS)
      expect(o.kind).toBe(
        typeof DEFAULT_CONFIG.settings.gameplayOptions[o.key][0] === 'boolean'
          ? 'toggle'
          : 'select',
      );
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
