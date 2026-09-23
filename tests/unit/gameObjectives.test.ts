import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Objectives, SessionStats } from '../../src/game/Objectives.js';

const pois = [
  { id: 'bow', name: 'Bow', primary: true, guideEntry: 'bow' },
  { id: 'stern', name: 'Stern', primary: true, guideEntry: 'stern' },
  { id: 'boilers', name: 'Boilers', primary: false, guideEntry: 'debris' },
  { id: 'bollard', name: 'Bollard', primary: false, guideEntry: 'debris' },
];

describe('Objectives', () => {
  it('tracks primary completion for the current landmark only', () => {
    const store = new DiscoveryStore(null);
    const o = new Objectives(store, 'titanic', pois);
    expect(o.progress()).toMatchObject({
      total: 4,
      discovered: 0,
      primaryTotal: 2,
      primaryComplete: false,
    });
    store.record('titanic', 'bow');
    store.record('elsewhere', 'stern');
    expect(o.progress().primaryDiscovered).toBe(1);
    store.record('titanic', 'stern');
    expect(o.primaryComplete()).toBe(true);
    expect(o.progress().items.find((i) => i.poiId === 'bow')?.discovered).toBe(true);
  });

  it('is never complete without primary POIs', () => {
    const o = new Objectives(new DiscoveryStore(null), 'x', []);
    expect(o.primaryComplete()).toBe(false);
  });

  it('unlocks an entry when any referencing POI is discovered; unreferenced entries are open', () => {
    const store = new DiscoveryStore(null);
    const o = new Objectives(store, 'titanic', pois);
    expect(o.isEntryUnlocked('debris')).toBe(false);
    store.record('titanic', 'bollard');
    expect(o.isEntryUnlocked('debris')).toBe(true);
    expect(o.isEntryUnlocked('overview')).toBe(true);
  });
});

describe('SessionStats', () => {
  it('accumulates distance, max depth and time, ignoring teleports', () => {
    const s = new SessionStats(250);
    s.update(0.5, new Vector3(0, -100, 0));
    s.update(0.5, new Vector3(3, -104, 0)); // 5 m
    s.update(0.5, new Vector3(3, -3000, 0)); // teleport, ignored
    s.update(0.5, new Vector3(3, -3000, 10)); // 10 m
    expect(s.distanceM).toBeCloseTo(15, 6);
    expect(s.maxDepthM).toBe(3000);
    expect(s.elapsedS).toBe(2);
    s.markTeleport();
    s.update(0, new Vector3(100, -3000, 10));
    expect(s.distanceM).toBeCloseTo(15, 6);
  });

  it('snapshots discoveries and new entries once each', () => {
    const s = new SessionStats(250);
    s.noteScan('bow', 'Bow');
    s.noteScan('bow', 'Bow');
    s.noteNewEntry('bow', 'The bow section');
    const snap = s.snapshot({ title: 'Mission complete' });
    expect(snap.discoveries).toEqual([{ poiId: 'bow', name: 'Bow' }]);
    expect(snap.newEntries).toEqual([{ id: 'bow', title: 'The bow section' }]);
    expect(snap.title).toBe('Mission complete');
  });
});
