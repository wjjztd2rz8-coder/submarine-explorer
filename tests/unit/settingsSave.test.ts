/**
 * Settings persistence (src/core/Save.ts): defaults from Config, per-field
 * sanitising, reload round trip, and hostile storage that must never throw.
 */

import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import {
  SAVE_KEYS,
  SETTINGS_STORAGE_KEY,
  Save,
  defaultSettings,
  migrate,
  type SettingsStorage,
} from '../../src/core/Save.js';

class MemoryStore implements SettingsStorage {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

const throwing: SettingsStorage = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('quota');
  },
  removeItem() {
    throw new Error('denied');
  },
};

const config = DEFAULT_CONFIG;

describe('settings defaults and migrate', () => {
  it('defaults come from Config', () => {
    const d = defaultSettings(config);
    expect(d.version).toBe(3);
    expect(d.gameplayMode).toBe('arcade');
    expect(d.gameplay).toEqual(config.settings.gameplayPresets.arcade);
    expect(d.graphicsTier).toBe(config.graphicsTier);
    expect(d.detailStrength).toBe(config.terrain.detailStrength);
    expect(d.captions).toBe(config.settings.defaults.captions);
    expect(d.bindings).toBe(SAVE_KEYS.bindings);
  });

  it('starts fresh players on auto and keeps fixed tiers through migration and reload', () => {
    const fresh = new Save({ config, storage: new MemoryStore() });
    expect(fresh.get().graphicsTier).toBe('auto');
    for (const version of [1, 2]) {
      for (const tier of ['low', 'medium', 'high'] as const) {
        const store = new MemoryStore();
        store.setItem(
          version === 1 ? 'subexplorer.settings.v1' : SETTINGS_STORAGE_KEY,
          JSON.stringify({ version, graphicsTier: tier }),
        );
        const save = new Save({ config, storage: store });
        expect(save.get().graphicsTier).toBe(tier);
        save.save({ captions: true });
        expect(new Save({ config, storage: store }).get().graphicsTier).toBe(tier);
      }
    }
  });

  it('keeps saved tiers from before quality tiers v2 and accepts auto', () => {
    // The removed Ultra tier migrates to High.
    expect(migrate({ version: 3, graphicsTier: 'ultra' }, config).graphicsTier).toBe('high');
    for (const tier of ['low', 'medium', 'high', 'auto'] as const) {
      expect(migrate({ version: 1, graphicsTier: tier }, config).graphicsTier).toBe(tier);
    }
  });

  it.each([
    [1, 'subexplorer.settings.v1'],
    [2, 'subexplorer.settings.v2'],
    [3, SETTINGS_STORAGE_KEY],
  ] as const)('persists removed Ultra as High from settings v%s', (version, key) => {
    const store = new MemoryStore();
    store.setItem(key, JSON.stringify({ version, graphicsTier: 'ultra', captions: true }));
    const save = new Save({ config, storage: store });
    expect(save.get()).toMatchObject({ graphicsTier: 'high', captions: true });
    expect(JSON.parse(store.getItem(SETTINGS_STORAGE_KEY)!)).toMatchObject({
      version: 3,
      graphicsTier: 'high',
      captions: true,
    });
    save.save({ detailStrength: 0.5 });
    expect(new Save({ config, storage: store }).get()).toEqual(save.get());
  });

  it('keeps valid fields and replaces bad ones one by one', () => {
    const m = migrate(
      {
        version: 1,
        graphicsTier: 'extreme',
        postFx: false,
        detailStrength: 99,
        simSpeedDefault: 7,
        reduceMotion: true,
        captions: 'yes',
        sonarPalette: 'deuteranopia',
      },
      config,
    );
    expect(m.graphicsTier).toBe(config.graphicsTier);
    expect(m.postFx).toBe(false);
    expect(m.detailStrength).toBe(config.settings.detailStrengthMax);
    expect(m).not.toHaveProperty('simSpeedDefault');
    expect(m.reduceMotion).toBe(true);
    expect(m.captions).toBe(config.settings.defaults.captions);
    expect(m.sonarPalette).toBe('deuteranopia');
  });

  it('garbage, arrays and newer versions fall back to defaults', () => {
    const d = defaultSettings(config);
    expect(migrate(null, config)).toEqual(d);
    expect(migrate([1, 2], config)).toEqual(d);
    expect(migrate({ version: 4, captions: true }, config)).toEqual(d);
    expect(migrate({ captions: true }, config).captions).toBe(true); // unversioned v0
    expect(migrate({ sonarPalette: 'constructor' }, config).sonarPalette).toBe('default');
  });
});

describe('Save', () => {
  it('persists, reloads in a new session, and notifies changed keys only', () => {
    const store = new MemoryStore();
    const a = new Save({ config, storage: store });
    const seen: string[][] = [];
    a.onChange((_s, changed) => seen.push(changed));
    a.save({ captions: true, reduceMotion: false });
    expect(a.reloadSafe).toBe(true);
    expect(seen).toEqual([['captions']]);
    a.save({ captions: true });
    expect(seen).toHaveLength(1);

    const b = new Save({ config, storage: store });
    expect(b.get().captions).toBe(true);
    b.reset();
    expect(JSON.parse(store.getItem(SETTINGS_STORAGE_KEY)!)).toEqual(defaultSettings(config));
    expect(b.get().captions).toBe(config.settings.defaults.captions);
  });

  it('never throws on hostile storage, and keeps values for the session', () => {
    const s = new Save({ config, storage: throwing });
    expect(s.get()).toEqual(defaultSettings(config));
    expect(() => s.save({ captions: true })).not.toThrow();
    expect(s.get().captions).toBe(true);
    expect(s.reloadSafe).toBe(false);
    expect(() => s.reset()).not.toThrow();
    expect(() => s.load()).not.toThrow();
  });

  it('survives corrupt JSON and a throwing listener', () => {
    const store = new MemoryStore();
    store.setItem(SETTINGS_STORAGE_KEY, '{nope');
    const s = new Save({ config, storage: store });
    expect(s.get()).toEqual(defaultSettings(config));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    s.onChange(() => {
      throw new Error('listener');
    });
    expect(() => s.save({ postFx: false })).not.toThrow();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('does not overwrite a newer stored version', () => {
    const store = new MemoryStore();
    const newer = JSON.stringify({ version: 4, captions: true });
    store.setItem(SETTINGS_STORAGE_KEY, newer);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = new Save({ config, storage: store });
    expect(s.protectedVersion).toBe(true);
    s.save({ reduceMotion: true });
    expect(s.reloadSafe).toBe(false);
    s.reset();
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBe(newer);
    warn.mockRestore();
  });

  it('works with no storage at all', () => {
    const s = new Save({ config, storage: null });
    expect(s.save({ sonarPalette: 'highContrast' }).sonarPalette).toBe('highContrast');
    expect(s.reloadSafe).toBe(false);
  });

  it.each([2, 3, 4])('preserves an unread v%s save when reads fail but writes work', (version) => {
    const store = new MemoryStore();
    const original = JSON.stringify({ version, captions: true, graphicsTier: 'low' });
    store.setItem(SETTINGS_STORAGE_KEY, original);
    const read = vi.spyOn(store, 'getItem').mockImplementationOnce(() => {
      throw new Error('temporarily unreadable');
    });
    const save = new Save({ config, storage: store });
    expect(save.get()).toEqual(defaultSettings(config));
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBe(original);
    expect(save.reloadSafe).toBe(false);
    save.save({ musicVolume: 0.25 });
    expect(save.get().musicVolume).toBe(0.25);
    save.reset();
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBe(original);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    save.load();
    if (version <= 3) {
      expect(save.get().captions).toBe(true);
      save.save({ musicVolume: 0.25 });
      expect(save.reloadSafe).toBe(true);
      expect(new Save({ config, storage: store }).get().musicVolume).toBe(0.25);
    } else {
      expect(save.protectedVersion).toBe(true);
      expect(save.reloadSafe).toBe(false);
      save.save({ musicVolume: 0.25 });
      expect(store.getItem(SETTINGS_STORAGE_KEY)).toBe(original);
    }
    read.mockRestore();
    warn.mockRestore();
  });

  it('does not mask unread legacy preferences with a fresh current save', () => {
    const store = new MemoryStore();
    const original = JSON.stringify({ version: 1, captions: true });
    store.setItem('subexplorer.settings.v1', original);
    const read = vi.spyOn(store, 'getItem');
    read
      .mockImplementationOnce(() => null)
      .mockImplementationOnce(() => {
        throw new Error('legacy temporarily unreadable');
      });
    const save = new Save({ config, storage: store });
    expect(save.reloadSafe).toBe(false);
    save.save({ musicVolume: 0.25 });
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    expect(store.getItem('subexplorer.settings.v1')).toBe(original);
    save.load();
    expect(save.get().captions).toBe(true);
    expect(save.reloadSafe).toBe(true);
    expect(new Save({ config, storage: store }).get().captions).toBe(true);
    read.mockRestore();
  });

  it('detects silently dropped writes and retries unchanged session settings', () => {
    const store = new MemoryStore();
    const save = new Save({ config, storage: store });
    const original = store.getItem(SETTINGS_STORAGE_KEY);
    const write = vi.spyOn(store, 'setItem').mockImplementation(() => {});
    save.save({ masterVolume: 0.23, muted: true });
    expect(save.get()).toMatchObject({ masterVolume: 0.23, muted: true });
    expect(save.reloadSafe).toBe(false);
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBe(original);
    write.mockRestore();
    save.save({ masterVolume: 0.23, muted: true });
    expect(save.reloadSafe).toBe(true);
    expect(new Save({ config, storage: store }).get()).toEqual(save.get());
  });

  it('keeps the original detail default after live config changes', () => {
    const live = structuredClone(config);
    const s = new Save({ config: live, storage: null });
    const original = live.terrain.detailStrength;
    live.terrain.detailStrength = 0.25;
    s.save({ detailStrength: 0.75 });
    expect(s.reset().detailStrength).toBe(original);
  });
});

describe('Phase D gameplay settings', () => {
  it('migrates v1 display settings once while preserving the old key', () => {
    const store = new MemoryStore();
    store.setItem(
      'subexplorer.settings.v1',
      JSON.stringify({ version: 1, postFx: false, captions: true, sonarPalette: 'highContrast' }),
    );
    const save = new Save({ config, storage: store });
    expect(save.get()).toMatchObject({
      version: 3,
      postFx: false,
      captions: true,
      sonarPalette: 'highContrast',
      gameplayMode: 'arcade',
      uiScale: 100,
    });
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toContain('"version":3');
    expect(store.getItem('subexplorer.settings.v1')).not.toBeNull();
    save.reset();
    expect(new Save({ config, storage: store }).get()).toEqual(defaultSettings(config));
  });

  it('switches whole presets and preserves every other option on one edit', () => {
    const save = new Save({ config, storage: null });
    save.setGameplayMode('realistic');
    expect(save.get().gameplay).toEqual(config.settings.gameplayPresets.realistic);
    save.setGameplayOption('visualHints', true);
    expect(save.get().gameplayMode).toBe('custom');
    expect(save.get().gameplayBaseMode).toBe('realistic');
    save.setGameplayOption('visualHints', true);
    save.setGameplayMode('custom');
    expect(save.get().gameplay.visualHints).toBe(true);
    save.setGameplayMode('arcade');
    expect(save.get().gameplay).toEqual(config.settings.gameplayPresets.arcade);
    save.save({ hullWarningStyle: 'gauge' });
    expect(save.get().hullWarningStyle).toBe('gauge');
    expect(save.get().gameplayMode).toBe('arcade');
  });

  it('repairs invalid Custom fields individually and overrides mismatched named presets', () => {
    const custom = migrate(
      {
        version: 2,
        gameplayMode: 'custom',
        gameplay: { speedProfile: 'research', lights: 'bad', simSpeed: 99 },
        uiScale: 999,
      },
      config,
    );
    expect(custom.gameplay).toMatchObject({
      ...config.settings.gameplayPresets.realistic,
    });
    expect(custom.uiScale).toBe(150);
    // The retired Control tips key is dropped, not carried forward.
    expect(migrate({ version: 2, controlTips: false }, config)).not.toHaveProperty('controlTips');
    const retiredStore = new MemoryStore();
    retiredStore.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, controlTips: false, uiScale: 120 }),
    );
    const loaded = new Save({ config, storage: retiredStore });
    expect(loaded.get().uiScale).toBe(120);
    expect(retiredStore.getItem(SETTINGS_STORAGE_KEY)).not.toContain('controlTips');
    const named = migrate(
      { version: 2, gameplayMode: 'realistic', gameplay: { speedProfile: 'fast' } },
      config,
    );
    expect(named.gameplay).toEqual(config.settings.gameplayPresets.realistic);
  });

  it('emits once per changed settings key, including a Custom mode transition', () => {
    const events: Array<{ key: string; value: unknown }> = [];
    const bus = new EventBus();
    bus.on('settings:changed', (payload) => events.push(payload));
    const save = new Save({
      config,
      storage: null,
      bus,
    });
    save.save({ captions: true });
    save.save({ captions: true });
    save.setGameplayOption('visualHints', true);
    expect(events.map((event) => event.key)).toEqual(['captions', 'gameplayMode']);
    expect(events.at(-1)?.value).toBe('custom');
  });

  it('leaves a newer legacy save untouched when v2 is absent', () => {
    const store = new MemoryStore();
    const future = JSON.stringify({ version: 4, captions: true });
    store.setItem('subexplorer.settings.v1', future);
    const save = new Save({ config, storage: store });
    expect(save.protectedVersion).toBe(true);
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
    save.save({ captions: true });
    expect(store.getItem('subexplorer.settings.v1')).toBe(future);
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
  });
});

const malformedCurrents: unknown[] = [
  null,
  {},
  [],
  { toString: null },
  { toString: {}, valueOf: false },
  42,
  'unknown',
];
it.each(malformedCurrents.map((currents) => ({ currents })))(
  'repairs malformed currents %j without coercing objects or losing valid settings',
  ({ currents }) => {
    for (const version of [2, 3]) {
      const store = new MemoryStore();
      store.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          version,
          gameplayMode: 'custom',
          gameplayBaseMode: 'realistic',
          captions: true,
          future: { keep: true },
          gameplay: {
            currents,
            batteryOxygen: false,
            visualHints: true,
            startPosition: 'surface',
            futureSwitch: 17,
          },
        }),
      );
      let save!: Save;
      expect(() => {
        save = new Save({ config, storage: store });
      }).not.toThrow();
      expect(save.get()).toMatchObject({
        captions: true,
        future: { keep: true },
        gameplayBaseMode: 'realistic',
        gameplay: {
          currents: 'realistic',
          batteryOxygen: false,
          visualHints: true,
          startPosition: 'surface',
          futureSwitch: 17,
        },
      });
      save.save({ captions: false });
      expect(new Save({ config, storage: store }).get()).toEqual(save.get());
    }
  },
);
