/**
 * C5 settings persistence (src/core/Save.ts): defaults from Config, per-field
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
    expect(d.version).toBe(2);
    expect(d.gameplayMode).toBe('arcade');
    expect(d.gameplay).toEqual(config.settings.gameplayPresets.arcade);
    expect(d.graphicsTier).toBe(config.graphicsTier);
    expect(d.detailStrength).toBe(config.terrain.detailStrength);
    expect(d.captions).toBe(config.settings.defaults.captions);
    expect(d.bindings).toBe(SAVE_KEYS.bindings);
  });

  it('keeps saved tiers from before quality tiers v2 and accepts auto and ultra', () => {
    for (const tier of ['low', 'medium', 'high', 'ultra', 'auto'] as const) {
      expect(migrate({ version: 1, graphicsTier: tier }, config).graphicsTier).toBe(tier);
    }
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
    expect(m.simSpeedDefault).toBe(config.settings.defaults.simSpeedDefault);
    expect(m.reduceMotion).toBe(true);
    expect(m.captions).toBe(config.settings.defaults.captions);
    expect(m.sonarPalette).toBe('deuteranopia');
  });

  it('garbage, arrays and newer versions fall back to defaults', () => {
    const d = defaultSettings(config);
    expect(migrate(null, config)).toEqual(d);
    expect(migrate([1, 2], config)).toEqual(d);
    expect(migrate({ version: 3, captions: true }, config)).toEqual(d);
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
    const newer = JSON.stringify({ version: 3, captions: true });
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
      version: 2,
      postFx: false,
      captions: true,
      sonarPalette: 'highContrast',
      gameplayMode: 'arcade',
      uiScale: 100,
      controlTips: true,
    });
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toContain('"version":2');
    expect(store.getItem('subexplorer.settings.v1')).not.toBeNull();
    save.reset();
    expect(new Save({ config, storage: store }).get()).toEqual(defaultSettings(config));
  });

  it('switches whole presets and preserves every other option on one edit', () => {
    const save = new Save({ config, storage: null });
    save.setGameplayMode('realistic');
    expect(save.get().gameplay).toEqual(config.settings.gameplayPresets.realistic);
    save.setGameplayOption('lights', 'enhanced');
    expect(save.get().gameplayMode).toBe('custom');
    expect(save.get().gameplay.speedProfile).toBe('research');
    save.setGameplayOption('lights', 'enhanced');
    save.setGameplayMode('custom');
    expect(save.get().gameplay.lights).toBe('enhanced');
    save.setGameplayMode('arcade');
    expect(save.get().gameplay).toEqual(config.settings.gameplayPresets.arcade);
    save.save({ controlTips: false });
    expect(save.get().controlTips).toBe(false);
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
      speedProfile: 'research',
      lights: 'enhanced',
      simSpeed: 1,
    });
    expect(custom.uiScale).toBe(150);
    expect(custom.controlTips).toBe(true);
    expect(migrate({ version: 2, controlTips: false }, config).controlTips).toBe(false);
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
    save.setGameplayOption('lights', 'enhanced');
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
