import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import {
  BINDINGS_STORAGE_KEY,
  LEGACY_BINDINGS_STORAGE_KEY,
  PREVIOUS_BINDINGS_STORAGE_KEY,
  Input,
} from '../../src/core/Input.js';
import {
  PROGRESS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  ProgressSave,
  Save,
  defaultSettings,
  type SettingsStorage,
} from '../../src/core/Save.js';
import { DISCOVERY_STORAGE_KEY, DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { DAILY_STORAGE_KEY, DailySave } from '../../src/game/DailySave.js';
import { PHOTO_STORAGE_KEY, PhotoStore, type Photo } from '../../src/game/PhotoStore.js';
import { ONBOARD_STORAGE_KEY, TutorialSave } from '../../src/game/TutorialSave.js';

class MemoryStorage implements SettingsStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}
const at = '2026-09-01T12:00:00.000Z';
const now = () => new Date(at);
const photo: Photo = {
  id: 'old-photo',
  image: 'data:image/jpeg;base64,YQ==',
  siteId: 'titanic',
  siteName: 'Titanic',
  poiId: 'bow',
  poiName: 'Bow',
  at,
  depthM: 3800,
};
const legacySettingsKey = 'subexplorer.settings.v1';
const damaged = [null, '', '{broken', '{"version":1,"discovered":', 'null', '[]', '42'];

describe('save schema soak', () => {
  it.each([undefined, 0, 1, 2])(
    'round trips settings v%s without losing display choices',
    (version) => {
      const storage = new MemoryStorage();
      const key = version === 2 ? SETTINGS_STORAGE_KEY : legacySettingsKey;
      const original = JSON.stringify({
        version,
        graphicsTier: 'low',
        postFx: false,
        captions: true,
        reduceMotion: true,
        detailStrength: 0.5,
        sonarPalette: 'highContrast',
        masterVolume: 0.3,
      });
      storage.setItem(key, original);
      const save = new Save({ config: DEFAULT_CONFIG, storage });
      expect(save.get()).toMatchObject({
        version: 2,
        graphicsTier: 'low',
        postFx: false,
        captions: true,
        reduceMotion: true,
        detailStrength: 0.5,
        sonarPalette: 'highContrast',
        masterVolume: 0.3,
      });
      save.save({ controlTips: false });
      expect(new Save({ config: DEFAULT_CONFIG, storage }).get()).toEqual(save.get());
      if (key !== SETTINGS_STORAGE_KEY) expect(storage.getItem(key)).toBe(original);
    },
  );

  it.each([1, 2, 3])(
    'round trips bindings v%s, custom keys and intentional unbinding',
    (version) => {
      const storage = new MemoryStorage();
      const key = [
        LEGACY_BINDINGS_STORAGE_KEY,
        PREVIOUS_BINDINGS_STORAGE_KEY,
        BINDINGS_STORAGE_KEY,
      ][version - 1];
      const original = JSON.stringify({
        version,
        keys: {
          thrustForward: ['KeyI'],
          boost: [],
          [version === 1 ? 'toggleGuide' : 'toggleJournal']: ['KeyH'],
        },
      });
      storage.setItem(key, original);
      const input = new Input({ storage });
      expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
      expect(input.getAction('boost')?.keys).toEqual([]);
      expect(input.getAction('toggleJournal')?.keys).toEqual(['KeyH']);
      input.rebind('toggleLights', ['KeyO']);
      const restored = new Input({ storage });
      expect(restored.actions).toEqual(input.actions);
      if (version < 3) expect(storage.getItem(key)).toBe(original);
      input.dispose();
      restored.dispose();
    },
  );

  it.each([
    ['bare array', ['titanic/bow', 'titanic/stern']],
    ['discovered array', { discovered: ['titanic/bow', 'titanic/stern'] }],
    ['discoveries array', { discoveries: ['titanic/bow', 'titanic/stern'] }],
    ['bare map', { 'titanic/bow': at, 'titanic/stern': true }],
    ['v0 map', { version: 0, discoveries: { 'titanic/bow': at, 'titanic/stern': true } }],
    [
      'v1',
      {
        version: 1,
        discovered: { 'titanic/bow': { at, count: 3 }, 'titanic/stern': true },
        stats: { scans: 4 },
      },
    ],
  ])('keeps every discovery from %s through a write and reload', (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(raw));
    const store = new DiscoveryStore(storage, now);
    expect(store.keys()).toEqual(['titanic/bow', 'titanic/stern']);
    expect(store.get('titanic', 'bow')?.at).toBe(at);
    const before = store.snapshot();
    store.record('titanic', 'new');
    const restored = new DiscoveryStore(storage, now);
    for (const key of store.keys())
      expect(restored.snapshot().discovered[key]).toEqual(store.snapshot().discovered[key]);
    expect(restored.stats.scans).toBe(before.stats.scans + 1);
    expect(restored.get('titanic', 'stern')?.count).toBe(1);
  });

  it.each([undefined, 0, 1])(
    'preserves progress v%s balances, rewards, upgrades, ratings and migration state',
    (version) => {
      const storage = new MemoryStorage();
      storage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({
          version,
          rp: 120,
          lifetime: 400,
          awarded: ['poi:titanic/bow'],
          upgrades: { 'light-range': 1 },
          ratings: { titanic: 3 },
          legacyCredited: false,
          legacyPending: ['titanic'],
        }),
      );
      const save = new ProgressSave(storage);
      expect(save.get()).toMatchObject({
        version: 1,
        points: 120,
        lifetime: 400,
        awarded: ['poi:titanic/bow'],
        upgrades: { 'light-range': 1 },
        ratings: { titanic: 3 },
        legacyPending: ['titanic'],
      });
      save.save(save.get());
      expect(new ProgressSave(storage).get()).toEqual(save.get());
    },
  );

  it.each([undefined, 1])('keeps onboarding v%s flags and recognised hints', (version) => {
    const storage = new MemoryStorage();
    storage.setItem(
      ONBOARD_STORAGE_KEY,
      JSON.stringify({ version, tutorialDone: true, seenHints: ['rov', 'battery-low', 'unknown'] }),
    );
    const save = new TutorialSave(storage);
    expect(save.get()).toEqual({
      version: 1,
      tutorialDone: true,
      seenHints: ['battery-low', 'rov'],
    });
    save.save({});
    expect(new TutorialSave(storage).get()).toEqual(save.get());
  });

  it('round trips the first photo and daily schemas while dropping only damaged photo entries', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      PHOTO_STORAGE_KEY,
      JSON.stringify({ version: 1, photos: [photo, null, { ...photo, depthM: 'bad' }] }),
    );
    storage.setItem(
      DAILY_STORAGE_KEY,
      JSON.stringify({ version: 1, lastCompletedDate: '2026-09-01', streak: 12 }),
    );
    const photos = new PhotoStore(storage);
    expect(photos.photos).toEqual([photo]);
    expect(photos.save({ ...photo, id: 'new-photo' }).saved).toBe(true);
    expect(new PhotoStore(storage).photos).toEqual([{ ...photo, id: 'new-photo' }, photo]);
    new DailySave(storage).complete('2026-09-02');
    expect(new DailySave(storage).get()).toEqual({
      version: 1,
      lastCompletedDate: '2026-09-02',
      streak: 13,
    });
  });
});

describe('damaged localStorage recovery', () => {
  const constructors = [
    [
      SETTINGS_STORAGE_KEY,
      (storage: MemoryStorage) =>
        new Save({ config: DEFAULT_CONFIG, storage }).save({ captions: true }),
    ],
    [
      BINDINGS_STORAGE_KEY,
      (storage: MemoryStorage) => new Input({ storage }).rebind('thrustForward', ['KeyI']),
    ],
    [
      PROGRESS_STORAGE_KEY,
      (storage: MemoryStorage) => {
        const save = new ProgressSave(storage);
        save.save({ ...save.get(), points: 10, lifetime: 10 });
      },
    ],
    [
      DISCOVERY_STORAGE_KEY,
      (storage: MemoryStorage) => new DiscoveryStore(storage, now).record('titanic', 'bow'),
    ],
    [DAILY_STORAGE_KEY, (storage: MemoryStorage) => new DailySave(storage).complete('2026-09-01')],
    [PHOTO_STORAGE_KEY, (storage: MemoryStorage) => new PhotoStore(storage).save(photo)],
    [
      ONBOARD_STORAGE_KEY,
      (storage: MemoryStorage) => new TutorialSave(storage).save({ tutorialDone: true }),
    ],
  ] as const;

  it.each(constructors)('recovering damaged %s never rewrites another collection', (key, write) => {
    for (const text of damaged) {
      const storage = new MemoryStorage();
      for (const [, seed] of constructors) seed(storage);
      const originals = new Map(storage.data);
      if (text === null) storage.removeItem(key);
      else storage.setItem(key, text);
      write(storage);
      for (const [other, original] of originals)
        if (other !== key) expect(storage.getItem(other)).toBe(original);
    }
  });

  it.each(constructors)('session edits preserve a future %s blob byte for byte', (key, write) => {
    const storage = new MemoryStorage();
    const future = '{"version":99,"unknown":{"valuable":"keep this"}}';
    storage.setItem(key, future);
    write(storage);
    if (key === BINDINGS_STORAGE_KEY) new Input({ storage }).resetBindings();
    expect(storage.getItem(key)).toBe(future);
  });

  it.each(damaged)('boots all stores for %j and persists fresh work across reload', (text) => {
    const storage = new MemoryStorage();
    for (const key of [
      SETTINGS_STORAGE_KEY,
      BINDINGS_STORAGE_KEY,
      PROGRESS_STORAGE_KEY,
      DISCOVERY_STORAGE_KEY,
      DAILY_STORAGE_KEY,
      PHOTO_STORAGE_KEY,
      ONBOARD_STORAGE_KEY,
    ])
      if (text !== null) storage.setItem(key, text);
    storage.setItem('unrelated-save', 'keep me');
    const settings = new Save({ config: DEFAULT_CONFIG, storage });
    expect(settings.get()).toEqual(defaultSettings(DEFAULT_CONFIG));
    settings.save({ captions: true });
    const input = new Input({ storage });
    expect(input.rebind('thrustForward', ['KeyI'])).toBe(true);
    const progress = new ProgressSave(storage);
    expect(progress.get().points).toBe(0);
    progress.save({ ...progress.get(), points: 10, lifetime: 10, awarded: ['poi:titanic/bow'] });
    const discoveries = new DiscoveryStore(storage, now);
    expect(discoveries.keys()).toEqual([]);
    discoveries.record('titanic', 'bow');
    const daily = new DailySave(storage);
    expect(daily.get().streak).toBe(0);
    daily.complete('2026-09-01');
    const photos = new PhotoStore(storage);
    expect(photos.photos).toEqual([]);
    expect(photos.save(photo).saved).toBe(true);
    const onboard = new TutorialSave(storage);
    expect(onboard.get().tutorialDone).toBe(false);
    onboard.save({ tutorialDone: true });
    expect(new Save({ config: DEFAULT_CONFIG, storage }).get().captions).toBe(true);
    expect(new Input({ storage }).getAction('thrustForward')?.keys).toEqual(['KeyI']);
    expect(new ProgressSave(storage).get()).toEqual(progress.get());
    expect(new DiscoveryStore(storage, now).snapshot()).toEqual(discoveries.snapshot());
    expect(new DailySave(storage).get()).toEqual(daily.get());
    expect(new PhotoStore(storage).photos).toEqual([photo]);
    expect(new TutorialSave(storage).get()).toEqual(onboard.get());
    expect(storage.getItem('unrelated-save')).toBe('keep me');
    input.dispose();
  });

  it.each(damaged.filter((value) => value !== null))(
    'recovers intact legacy settings and bindings behind damaged current keys: %j',
    (text) => {
      const storage = new MemoryStorage();
      const settings = JSON.stringify({ version: 1, captions: true, graphicsTier: 'low' });
      const bindings = JSON.stringify({ version: 1, keys: { thrustForward: ['KeyI'], boost: [] } });
      storage.setItem(legacySettingsKey, settings);
      storage.setItem(LEGACY_BINDINGS_STORAGE_KEY, bindings);
      storage.setItem(SETTINGS_STORAGE_KEY, text!);
      storage.setItem(BINDINGS_STORAGE_KEY, text!);
      storage.setItem(PREVIOUS_BINDINGS_STORAGE_KEY, text!);
      expect(new Save({ config: DEFAULT_CONFIG, storage }).get()).toMatchObject({
        captions: true,
        graphicsTier: 'low',
      });
      const input = new Input({ storage });
      expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
      expect(input.getAction('boost')?.keys).toEqual([]);
      expect(storage.getItem(legacySettingsKey)).toBe(settings);
      expect(storage.getItem(LEGACY_BINDINGS_STORAGE_KEY)).toBe(bindings);
      expect(new Save({ config: DEFAULT_CONFIG, storage }).get().captions).toBe(true);
      expect(new Input({ storage }).actions).toEqual(input.actions);
      input.dispose();
    },
  );

  it('sanitises damaged fields while preserving valid discoveries and research', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      DISCOVERY_STORAGE_KEY,
      `{"version":1,"discovered":{"titanic/bow":{"at":"${at}","count":4},"titanic/stern":{"at":"bad","count":1e999},"bad/key":[]},"stats":{"scans":1e999}}`,
    );
    const store = new DiscoveryStore(storage, now);
    expect(store.snapshot()).toEqual({
      version: 1,
      discovered: {
        'titanic/bow': { at, count: 4 },
        'titanic/stern': { at, count: 1 },
      },
      stats: { scans: 5, firstAt: at },
    });
    store.record('titanic', 'new');
    expect(new DiscoveryStore(storage, now).snapshot()).toEqual(store.snapshot());
    storage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        points: 'bad',
        lifetime: 100,
        awarded: ['poi:titanic/bow', null],
        upgrades: { 'light-range': 1 },
        ratings: { titanic: 3, bad: 'bad' },
      }),
    );
    expect(new ProgressSave(storage).get()).toMatchObject({
      points: 65,
      lifetime: 100,
      awarded: ['poi:titanic/bow'],
      upgrades: { 'light-range': 1 },
      ratings: { titanic: 3 },
    });
  });
});
