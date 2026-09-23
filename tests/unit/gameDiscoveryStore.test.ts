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
    const future = JSON.stringify({ version: 99, whatever: true });
    storage.setItem(DISCOVERY_STORAGE_KEY, future);
    const store = new DiscoveryStore(storage);
    expect(store.readOnly).toBe(true);
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

  it('returns an empty document for garbage', () => {
    for (const junk of [null, undefined, 42, 'x', { version: 1, discovered: 7 }]) {
      expect(migrate(junk, at)).toEqual({ version: 1, discovered: {}, stats: { scans: 0 } });
    }
  });
});
