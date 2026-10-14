import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { EQUIPMENT, PROGRESS_CONFIG } from '../../src/core/config/progress.js';
import { expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Save, migrate, SETTINGS_STORAGE_KEY } from '../../src/core/Save.js';
import { currentScale, MODES_CONFIG } from '../../src/core/config/modes.js';

it('maps modes to options and every advanced edit to Custom, then resets all options', () => {
  const save = new Save({ config: DEFAULT_CONFIG, storage: null });
  expect(save.get().gameplayMode).toBe('arcade');
  expect(save.get().gameplay.currents).toBe('off');
  save.setGameplayMode('realistic');
  expect(save.get().gameplay).toEqual(DEFAULT_CONFIG.settings.gameplayPresets.realistic);
  save.setGameplayOption('currents', 'realistic');
  expect(save.get().gameplayMode).toBe('custom');
  expect(save.get().gameplay.currents).toBe('realistic');
  save.setGameplayMode('arcade');
  expect(save.get().gameplay).toEqual(DEFAULT_CONFIG.settings.gameplayPresets.arcade);
  save.setGameplayOption('visualHints', true);
  expect(save.get().gameplayMode).toBe('custom');
});
it('migrates legacy current strengths and removes retired options', () => {
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
    expect(migrate(old, DEFAULT_CONFIG).gameplay).toEqual({
      ...DEFAULT_CONFIG.settings.gameplayPresets.arcade,
      currents: 'realistic',
    });
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
    save.setGameplayOption('visualHints', false);
    expect(new Save({ config: DEFAULT_CONFIG, storage }).get()).toMatchObject({
      gameplayMode: 'custom',
      gameplay: { currents: 'realistic', visualHints: false },
    });
  }
});
it('keeps strong currents exclusive to Daily', () => {
  expect(DEFAULT_CONFIG.settings.gameplayOptions.currents).toEqual(['off', 'realistic']);
  expect(currentScale('off')).toBe(0);
  expect(currentScale('realistic')).toBe(1);
  expect(currentScale('strong')).toBe(MODES_CONFIG.dailyCurrentScale);
  expect(MODES_CONFIG.dailyCurrentScale).toBeGreaterThan(1);
});
it('fills missing Custom keys without discarding Gentle or valid false values', () => {
  const result = migrate(
    {
      version: 2,
      gameplayMode: 'custom',
      gameplay: { currents: 'gentle', visualHints: false, batteryOxygen: false, lights: 'retired' },
    },
    DEFAULT_CONFIG,
  );
  expect(result.gameplayMode).toBe('custom');
  expect(result.gameplay).toEqual({
    ...DEFAULT_CONFIG.settings.gameplayPresets.arcade,
    currents: 'realistic',
    visualHints: false,
    batteryOxygen: false,
  });
  expect(migrate({ version: 2, gameplayMode: 'custom' }, DEFAULT_CONFIG).gameplay).toEqual(
    DEFAULT_CONFIG.settings.gameplayPresets.arcade,
  );
  expect(migrate({ version: 2, gameplayMode: 'realistic' }, DEFAULT_CONFIG).gameplay).toEqual(
    DEFAULT_CONFIG.settings.gameplayPresets.realistic,
  );
});

it('resolves modes, Custom inheritance, fixed equipment and Daily from frozen inputs without compounding', () => {
  const freeze = <T>(value: T): T => {
    if (value && typeof value === 'object') {
      Object.freeze(value);
      for (const child of Object.values(value)) freeze(child);
    }
    return value;
  };
  const base = freeze(structuredClone(DEFAULT_CONFIG));
  for (const preset of ['arcade', 'realistic'] as const) {
    const save = new Save({ config: base, storage: null });
    save.setGameplayMode(preset);
    save.setGameplayOption('visualHints', true);
    const settings = freeze(save.get());
    for (const modifier of [null, 'calm', 'strong-currents', 'low-light'] as const) {
      const daily = modifier ? freeze({ modifier }) : null;
      const first = resolveEffective(settings, 'custom', daily, base);
      expect(resolveEffective(settings, 'custom', daily, base)).toEqual(first);
      expect(first.speedName).toBe(preset === 'realistic' ? 'research' : 'fast');
      expect(first.gameplay.visualHints).toBe(true);
      const sensor = base.sensorPresets[preset === 'realistic' ? 'realistic' : 'extended'];
      expect(first.scan.hintRangeFactor).toBeCloseTo(
        base.scan.hintRangeFactor * sensor.hintRangeMultiplier * EQUIPMENT.scanDetail,
      );
      expect(first.sensor.scanRadiusMultiplier).toBeCloseTo(
        sensor.scanRadiusMultiplier * EQUIPMENT.scanDetail,
      );
      expect(first.light.intensity).toBe(
        preset === 'realistic' || modifier === 'low-light' ? 500 : 750,
      );
      expect(first.light.distance).toBeCloseTo(
        base.lightPresets[
          preset === 'realistic' || modifier === 'low-light' ? 'realistic' : 'enhanced'
        ].distance * EQUIPMENT.lightRange,
      );
      expect(first.currentMode).toBe(
        modifier ? (modifier === 'strong-currents' ? 'strong' : 'off') : settings.gameplay.currents,
      );
      expect(first.submarine.maxVerticalSpeed).toBe(
        base.speedProfiles[first.speedName].maxVerticalSpeed,
      );
      expect(first.camera.lookAheadPerSpeed).toBe(
        base.speedProfiles[first.speedName].cameraLookAheadPerSpeed,
      );
      expect(first.boostSeconds).toBeCloseTo(PROGRESS_CONFIG.boostSeconds);
    }
    expect(resolveEffective(settings, 'arcade', null, base).speedName).toBe('fast');
    expect(resolveEffective(settings, 'realistic', null, base).speedName).toBe('research');
  }
});
