import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_STORAGE_KEY,
  DiscoveryStore,
  migrate,
  type StorageLike,
} from '../../src/game/DiscoveryStore.js';

class MemoryStorage implements StorageLike {
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

const T0 = new Date('2026-09-22T10:00:00.000Z');
const T1 = new Date('2026-09-22T11:00:00.000Z');

describe('DiscoveryStore', () => {
  it.each([
    ['2026-09-22T11:00:00+02:00', '2026-09-22T09:30:00Z'],
    ['2026-09-22T09:00:00Z', '2026-09-22T09:00:00.500Z'],
  ])('orders migrated timestamps by instant: %s before %s', (early, late) => {
    const storage = new MemoryStorage();
    storage.setItem(
      DISCOVERY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        discovered: { 'site/late': late, 'site/early': early },
      }),
    );
    const store = new DiscoveryStore(storage, () => T1);
    expect(store.discoveredFor('site')).toEqual(['early', 'late']);
    expect(store.stats.firstAt).toBe(early);
    store.record('site', 'late');
    expect(new DiscoveryStore(storage).discoveredFor('site')).toEqual(['early', 'late']);
  });

  it('records first discovery and persists under the versioned key', () => {
    const storage = new MemoryStorage();
    const store = new DiscoveryStore(storage, () => T0);
    expect(store.isDiscovered('titanic', 'bow')).toBe(false);
    expect(store.record('titanic', 'bow').firstTime).toBe(true);
    const saved = JSON.parse(storage.getItem(DISCOVERY_STORAGE_KEY)!);
    expect(DISCOVERY_STORAGE_KEY).toBe('subexplorer.discoveries.v1');
    expect(saved).toEqual({
      version: 1,
      discovered: { 'titanic/bow': { at: T0.toISOString(), count: 1 } },
      stats: { scans: 1, firstAt: T0.toISOString() },
    });
  });

  it('survives a reload and keeps the first-discovery time on repeat scans', () => {
    const storage = new MemoryStorage();
    new DiscoveryStore(storage, () => T0).record('titanic', 'bow');
    const again = new DiscoveryStore(storage, () => T1);
    expect(again.isDiscovered('titanic', 'bow')).toBe(true);
    expect(again.record('titanic', 'bow').firstTime).toBe(false);
    expect(again.get('titanic', 'bow')).toEqual({ at: T0.toISOString(), count: 2 });
    expect(again.stats.scans).toBe(2);
  });

  it('discoveredFor lists one landmark in discovery order', () => {
    let now = T1;
    const store = new DiscoveryStore(null, () => now);
    store.record('titanic', 'stern');
    now = T0; // earlier timestamp sorts first
    store.record('titanic', 'bow');
    store.record('other', 'x');
    expect(store.discoveredFor('titanic')).toEqual(['bow', 'stern']);
    expect(store.discoveredFor('nope')).toEqual([]);
  });

  it.each([
    {
      label: 'duplicate legacy list',
      raw: ['titanic/bow', null, 'titanic/bow', 7, 'retired-site/bow', 'junk'],
      count: 1,
    },
    {
      label: 'partial current map',
      raw: {
        version: 1,
        discovered: {
          'titanic/bow': { at: T0.toISOString(), count: 3 },
          'titanic/stern': null,
          'retired-site/bow': true,
          junk: { count: 1 },
        },
        stats: { scans: 'damaged' },
      },
      count: 3,
    },
  ])(
    'retains valid discoveries from a $label through the next scan and reload',
    ({ raw, count }) => {
      const storage = new MemoryStorage();
      const original = JSON.stringify(raw);
      storage.setItem(DISCOVERY_STORAGE_KEY, original);
      const store = new DiscoveryStore(storage, () => T0);
      expect(store.keys()).toEqual(['titanic/bow', 'retired-site/bow']);
      expect(store.stats).toEqual({ scans: count + 1, firstAt: T0.toISOString() });
      expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBe(original);
      expect(store.isDiscovered('titanic', 'stern')).toBe(false);
      expect(store.record('titanic', 'stern').firstTime).toBe(true);
      const reloaded = new DiscoveryStore(storage, () => T1);
      expect(reloaded.snapshot()).toEqual(store.snapshot());
      expect(reloaded.get('titanic', 'bow')).toEqual({ at: T0.toISOString(), count });
      expect(reloaded.discoveredFor('retired-site')).toEqual(['bow']);
      expect(reloaded.stats.scans).toBe(count + 2);
    },
  );

  it.each([
    { discovered: [], bow: { at: T1.toISOString(), count: 1 } },
    { discovered: false, bow: { at: T1.toISOString(), count: 1 } },
    {
      discovered: { 'titanic/bow': { at: T0.toISOString(), count: 4 } },
      bow: { at: T0.toISOString(), count: 4 },
    },
  ])(
    'recovers legacy discoveries beside a partial current field $discovered without replacing current metadata',
    ({ discovered, bow }) => {
      const storage = new MemoryStorage();
      storage.setItem(
        DISCOVERY_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          discovered,
          discoveries: ['titanic/bow', 'titanic/stern', 'titanic/stern', 'retired-site/bow'],
        }),
      );
      const store = new DiscoveryStore(storage, () => T1);
      expect(store.keys()).toEqual(['titanic/bow', 'titanic/stern', 'retired-site/bow']);
      expect(store.get('titanic', 'bow')).toEqual(bow);
      expect(store.record('titanic', 'stern').firstTime).toBe(false);
      const reloaded = new DiscoveryStore(storage, () => T1);
      expect(reloaded.snapshot()).toEqual(store.snapshot());
      expect(reloaded.get('titanic', 'bow')).toEqual(bow);
      expect(reloaded.get('titanic', 'stern')?.count).toBe(2);
    },
  );

  it('reset() clears memory and storage', () => {
    const storage = new MemoryStorage();
    const store = new DiscoveryStore(storage);
    store.record('a', 'b');
    store.reset();
    expect(store.isDiscovered('a', 'b')).toBe(false);
    expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBeNull();
  });

  it('never throws when storage is missing or hostile', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    };
    for (const s of [null, hostile]) {
      const store = new DiscoveryStore(s);
      expect(store.record('a', 'b').firstTime).toBe(true);
      expect(store.isDiscovered('a', 'b')).toBe(true);
      expect(() => store.reset()).not.toThrow();
    }
  });

  it('starts empty on corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(DISCOVERY_STORAGE_KEY, '{not json');
    expect(new DiscoveryStore(storage).keys()).toEqual([]);
  });

  it('does not overwrite a save from a newer version', () => {
    const storage = new MemoryStorage();
    const future = JSON.stringify({
      version: 99,
      discovered: { 'titanic/bow': true },
      discoveries: ['titanic/stern'],
    });
    storage.setItem(DISCOVERY_STORAGE_KEY, future);
    const store = new DiscoveryStore(storage);
    expect(store.readOnly).toBe(true);
    expect(store.keys()).toEqual([]);
    store.record('a', 'b');
    store.reset();
    expect(storage.getItem(DISCOVERY_STORAGE_KEY)).toBe(future);
  });
});

describe('migrate', () => {
  const at = T0.toISOString();

  it('upgrades a bare array of keys (v0)', () => {
    const d = migrate(['titanic/bow', 'junk', 5], at);
    expect(d.discovered).toEqual({ 'titanic/bow': { at, count: 1 } });
    expect(d.stats).toEqual({ scans: 1, firstAt: at });
  });

  it('upgrades { discoveries: [...] } and key -> ISO/true maps', () => {
    expect(Object.keys(migrate({ discoveries: ['a/b'] }, at).discovered)).toEqual(['a/b']);
    const d = migrate({ discovered: { 'a/b': '2020-01-01T00:00:00Z', 'a/c': true } }, at);
    expect(d.discovered['a/b']).toEqual({ at: '2020-01-01T00:00:00Z', count: 1 });
    expect(d.discovered['a/c']).toEqual({ at, count: 1 });
    expect(d.stats.firstAt).toBe('2020-01-01T00:00:00Z');
  });

  it('sanitises a v1 document field by field', () => {
    const d = migrate(
      {
        version: 1,
        discovered: { 'a/b': { at: 'not a date', count: -3 }, nokey: { at, count: 1 } },
        stats: { scans: 0 },
      },
      at,
    );
    expect(d.discovered).toEqual({ 'a/b': { at, count: 1 } });
    expect(d.stats.scans).toBe(1);
  });

  it('fills damaged current map entries from a legacy map and counts each discovery once', () => {
    const d = migrate(
      {
        version: 1,
        discovered: { 'a/b': { at, count: 4 }, 'a/c': null },
        discoveries: {
          'a/b': { at: T1.toISOString(), count: 9 },
          'a/c': { at, count: 2 },
          'retired-site/b': true,
          junk: true,
        },
        stats: { scans: 0 },
      },
      at,
    );
    expect(d.discovered).toEqual({
      'a/b': { at, count: 4 },
      'a/c': { at, count: 2 },
      'retired-site/b': { at, count: 1 },
    });
    expect(d.stats).toEqual({ scans: 7, firstAt: at });
  });

  it('returns an empty document for garbage', () => {
    for (const junk of [null, undefined, 42, 'x', { version: 1, discovered: 7 }]) {
      expect(migrate(junk, at)).toEqual({ version: 1, discovered: {}, stats: { scans: 0 } });
    }
  });
});
