/**
 * C5 settings persistence (src/core/Save.ts): defaults from Config, per-field
 * sanitising, reload round trip, and hostile storage that must never throw.
 */

import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
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
    expect(d.version).toBe(1);
    expect(d.graphicsTier).toBe(config.graphicsTier);
    expect(d.detailStrength).toBe(config.terrain.detailStrength);
    expect(d.captions).toBe(config.settings.defaults.captions);
    expect(d.bindings).toBe(SAVE_KEYS.bindings);
  });

  it('keeps valid fields and replaces bad ones one by one', () => {
    const m = migrate(
      {
        version: 1,
        graphicsTier: 'ultra',
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
    expect(migrate({ version: 2, captions: true }, config)).toEqual(d);
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
    expect(store.getItem(SETTINGS_STORAGE_KEY)).toBeNull();
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
    const newer = JSON.stringify({ version: 2, captions: true });
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
