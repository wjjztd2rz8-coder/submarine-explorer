import { expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Save, migrate, SETTINGS_STORAGE_KEY } from '../../src/core/Save.js';
import { CURRENT_CHOICES, currentScale, MODES_CONFIG } from '../../src/core/config/modes.js';

it('maps modes to options and every advanced edit to Custom, then resets all options', () => {
  const save = new Save({ config: DEFAULT_CONFIG, storage: null });
  expect(save.get().gameplayMode).toBe('arcade');
  expect(save.get().gameplay.currents).toBe('off');
  save.setGameplayMode('realistic');
  expect(save.get().gameplay).toEqual(DEFAULT_CONFIG.settings.gameplayPresets.realistic);
  save.setGameplayOption('currents', 'exaggerated');
  expect(save.get().gameplayMode).toBe('custom');
  expect(save.get().gameplay.currents).toBe('exaggerated');
  save.setGameplayMode('arcade');
  expect(save.get().gameplay).toEqual(DEFAULT_CONFIG.settings.gameplayPresets.arcade);
  save.setGameplayOption('simSpeed', 1);
  expect(save.get().gameplayMode).toBe('custom');
});
it('retains saved Custom options, including Gentle and Exaggerated, without schema changes', () => {
  for (const currents of ['gentle', 'exaggerated'] as const) {
    const old = {
      version: 2,
      gameplayMode: 'custom',
      gameplay: {
        ...DEFAULT_CONFIG.settings.gameplayPresets.arcade,
        currents,
        sonarMarkers: false,
      },
    };
    expect(migrate(old, DEFAULT_CONFIG)).toMatchObject(old);
    const map = new Map([[SETTINGS_STORAGE_KEY, JSON.stringify(old)]]);
    const storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
    };
    const save = new Save({ config: DEFAULT_CONFIG, storage });
    save.setGameplayOption('lights', 'realistic');
    expect(new Save({ config: DEFAULT_CONFIG, storage }).get()).toMatchObject({
      gameplayMode: 'custom',
      gameplay: { currents, sonarMarkers: false, lights: 'realistic' },
    });
  }
});
it('scales realistic and exaggerated flow while retaining the legacy Gentle scale', () => {
  const c = DEFAULT_CONFIG.currents;
  expect(CURRENT_CHOICES).toEqual(['off', 'realistic', 'exaggerated']);
  expect(currentScale('off', c)).toBe(0);
  expect(currentScale('realistic', c)).toBe(1);
  expect(currentScale('gentle', c)).toBe(c.gentleScale);
  expect(currentScale('exaggerated', c)).toBe(MODES_CONFIG.exaggeratedCurrentScale);
  expect(MODES_CONFIG.exaggeratedCurrentScale).toBeGreaterThan(1);
});
