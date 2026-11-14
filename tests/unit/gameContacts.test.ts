import { describe, expect, it } from 'vitest';
import {
  contactLabel,
  unknownContactsForSite,
  foundContactCount,
  legacyFoundContactIds,
  contactStars,
} from '../../src/game/Contacts.js';
import { Mission, parseMission, nextScanObjective } from '../../src/game/Mission.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';

const pois = [
  { id: 'bow', name: 'Bow', guideEntry: 'bow' },
  { id: 'boiler', name: 'Boiler', guideEntry: 'boiler' },
  { id: 'anchor', name: 'Anchor', guideEntry: 'anchor' },
  { id: 'optional', name: 'Optional', guideEntry: null },
  { id: 'unlogged', name: 'Unlogged', guideEntry: null },
  { id: 'secret:chest', name: 'Chest', guideEntry: 'chest' },
  { id: 'life:ray', name: 'Ray', guideEntry: 'ray' },
  { id: 'sample:rock', name: 'Rock', guideEntry: 'rock' },
];
describe('fixed contacts', () => {
  it('keeps primaries first then chooses the nearest unfound contact', () => {
    const rows = ['primary', 'far', 'near'].map((id) => ({
      id,
      poiId: id,
      title: id,
      hint: '',
      primary: id === 'primary',
      resolved: true,
      complete: false,
    }));
    const distance = (id: string) => (id === 'far' ? 900 : 200);
    expect(nextScanObjective(rows, distance)?.id).toBe('primary');
    rows[0]!.complete = true;
    expect(nextScanObjective(rows, distance)?.id).toBe('near');
    rows[2]!.complete = true;
    expect(nextScanObjective(rows, distance)?.id).toBe('far');
  });
  it('visits a contact on the way to the next primary once the dive has opened', () => {
    const at: Record<string, [number, number]> = {
      p1: [0, 0],
      p2: [600, 0],
      onway: [300, 40],
      aside: [250, 400],
    };
    const rows = Object.keys(at).map((id) => ({
      id,
      poiId: id,
      title: id,
      hint: '',
      primary: id.startsWith('p'),
      resolved: true,
      complete: false,
    }));
    const from = (x: number, z: number) => (id: string) =>
      Math.hypot(at[id]![0] - x, at[id]![1] - z);
    const between = (a: string, b: string) =>
      Math.hypot(at[a]![0] - at[b]![0], at[a]![1] - at[b]![1]);
    // The first primary leads even when a contact is nearer.
    expect(nextScanObjective(rows, from(250, 0), between)?.id).toBe('p1');
    rows[0]!.complete = true;
    expect(nextScanObjective(rows, from(0, 0), between)?.id).toBe('onway');
    rows[2]!.complete = true;
    expect(nextScanObjective(rows, from(300, 40), between)?.id).toBe('p2');
    rows[1]!.complete = true;
    expect(nextScanObjective(rows, from(600, 0), between)?.id).toBe('aside');
  });
  it('counts only contacts joined to a primary by short hops', () => {
    const placed = [
      { id: 'a', name: 'A', guideEntry: 'a', position: { x: 0, z: 0 } },
      { id: 'b', name: 'B', guideEntry: 'b', position: { x: 300, z: 0 } },
      { id: 'c', name: 'C', guideEntry: 'c', position: { x: 600, z: 0 } },
      { id: 'far', name: 'Far', guideEntry: 'far', position: { x: 2000, z: 0 } },
    ];
    expect(unknownContactsForSite(placed, ['a']).map((p) => p.id)).toEqual(['b', 'c']);
    expect(unknownContactsForSite(placed, ['far']).map((p) => p.id)).toEqual([]);
  });
  it('conceals only unfound non-primary names', () => {
    expect(contactLabel(pois[1]!, { primary: false, found: false })).toBe('Unknown contact');
    expect(contactLabel(pois[1]!, { primary: false, found: true })).toBe('Boiler');
    expect(contactLabel(pois[0]!, { primary: true, found: false })).toBe('Bow');
  });
  it('includes placed journal POIs and authored optionals once, excludes primary, wildlife and secrets', () => {
    const contacts = unknownContactsForSite([...pois, pois[1]!], ['bow'], ['optional', 'missing']);
    expect(contacts.map((p) => p.id)).toEqual(['boiler', 'anchor', 'optional']);
    expect(foundContactCount(contacts, (p) => p.id === 'anchor')).toBe(1);
    expect(unknownContactsForSite(pois, ['bow']).map((p) => p.id)).toEqual(['boiler', 'anchor']);
  });
  it('uses half rounded up and all contacts for the second and third stars', () => {
    const primary = { primary: true, complete: true };
    for (const total of [0, 1, 2, 3, 5]) {
      for (let found = 0; found <= total; found++) {
        const objectives = [
          primary,
          ...Array.from({ length: total }, (_, i) => ({ primary: false, complete: i < found })),
        ];
        expect(contactStars(objectives)).toBe(
          found === total ? 3 : found >= Math.ceil(total / 2) ? 2 : 1,
        );
        expect(contactStars(objectives, true)).toBe(0);
      }
    }
    expect(contactStars([])).toBe(0);
    expect(contactStars([{ primary: true, complete: false }])).toBe(0);
    expect(contactStars([primary, { primary: false, complete: false, resolved: false }])).toBe(3);
  });
  it('maps old optional tokens to discoveries and retains them across restart', () => {
    const def = parseMission(
      {
        spawn: { lat: 0, lon: 0 },
        objectives: [
          { id: 'scan-bow', poi: 'bow', primary: true, title: 'Scan bow' },
          { id: 'scan-boiler', poi: 'boiler', primary: false, title: 'Survey boiler' },
        ],
      },
      'site',
      () => {},
    )!;
    expect(legacyFoundContactIds(def.objectives, 'site', null)).toEqual([]);
    const ids = legacyFoundContactIds(def.objectives, 'site', [
      null,
      'objective:site/scan-boiler',
      'objective:site/scan-bow',
      'objective:other/scan-boiler',
    ]);
    expect(ids).toEqual(['boiler']);
    const store = new DiscoveryStore(null);
    ids.forEach((id) => store.record('site', id));
    const bus = new EventBus();
    const mission = new Mission({ def, bus });
    mission.resolve(pois.map((p) => p.id));
    mission.setContacts(pois, (id) => store.isDiscovered('site', id));
    expect(mission.objectives.find((o) => o.poiId === 'boiler')).toMatchObject({
      title: 'Boiler',
      complete: true,
    });
    expect(mission.objectives.find((o) => o.poiId === 'anchor')).toMatchObject({
      title: 'Unknown contact',
      complete: false,
    });
    mission.start('site');
    bus.emit('scan:complete', { landmarkId: 'site', poiId: 'anchor', firstTime: true });
    expect(mission.objectives.find((o) => o.poiId === 'anchor')?.title).toBe('Anchor');
    mission.restart();
    expect(mission.objectives.find((o) => o.poiId === 'boiler')?.complete).toBe(true);
    expect(mission.primaryComplete).toBe(false);
    mission.dispose();
  });
});
