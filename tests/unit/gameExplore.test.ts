import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { AnchoredEvents, placeEventContacts } from '../../src/game/Events.js';
import { parseSecrets, secretInRange, secretProgress } from '../../src/game/Secrets.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';
import { Samples, type SampleTarget } from '../../src/game/Samples.js';
import { buildSecret, seatOnSeabed, disposeExploreMesh } from '../../src/game/SecretsVisual.js';
import { EventsVisual } from '../../src/game/EventsVisual.js';
import { buildJournalSite, isEntryUnlocked, isSiteUnlocked } from '../../src/game/JournalData.js';

const eventMeta = {
  center: { lat: 18.54635, lon: -81.71795 },
} as import('../../src/util/types.js').TileMeta;
const eventContacts = placeEventContacts('beebe-vent-field', eventMeta, () => -100);
const contact: ScanTarget = {
  id: 'secret:arch',
  name: 'Unidentified contact',
  landmarkId: 'lost-city',
  position: new Vector3(0, 0, -20),
  radius: 45,
  scanSeconds: 3,
};

describe('local curiosity range', () => {
  it('includes the exact boundary, excludes distant and vertically separated contacts', () => {
    expect(secretInRange(new Vector3(), new Vector3(110, 0, 0))).toBe(true);
    expect(secretInRange(new Vector3(), new Vector3(110.01, 0, 0))).toBe(false);
    expect(secretInRange(new Vector3(0, 150, 0), new Vector3())).toBe(false);
  });
  it('keeps secrets separate from POIs and animals, with no hint outside scan range', () => {
    const bus = new EventBus();
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
    scanner.setTargets([]);
    scanner.setSupplementalTargets([contact]);
    scanner.setExtraTargets([]); // Life may replace its own pool after loading.
    scanner.update(1, new Vector3(0, 0, 100), new Vector3(0, 0, -1), false);
    expect(scanner.view.nearestId).toBeNull();
    expect(scanner.getTargets()).toEqual([]);
    const events: string[] = [];
    bus.on('scan:complete', (e) => events.push(e.poiId));
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toEqual(['secret:arch']);
    scanner.update(5, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toHaveLength(1);
    scanner.resetDive();
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toHaveLength(2);
  });
  it('aborts a supplemental scan when the target leaves range and resumes with decay', () => {
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
    scanner.setSupplementalTargets([contact]);
    scanner.update(1, new Vector3(), new Vector3(0, 0, -1), true);
    scanner.update(0.1, new Vector3(100, 0, 0), new Vector3(0, 0, -1), true);
    expect(scanner.view.lastAbort).toBe('range');
    expect(scanner.view.progress).toBeLessThan(1 / 3);
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(scanner.isScanned('lost-city', contact.id)).toBe(true);
  });
});

describe('anchored event arrivals', () => {
  it('never starts remotely, even after hours of active time', () => {
    const events = new AnchoredEvents();
    const remote = eventContacts[0].position.clone().add(new Vector3(0, 0, 111));
    const above = eventContacts[0].position.clone().add(new Vector3(0, 111, 0));
    for (const position of [remote, above])
      for (let i = 0; i < 10; i++) expect(events.update(10000, position, eventContacts)).toBeNull();
    expect(events.active).toBeNull();
    expect(placeEventContacts('titanic', eventMeta, () => -100)).toEqual([]);
  });
  it('enters at the inclusive boundary and requires exit before another arrival', () => {
    const events = new AnchoredEvents();
    const position = eventContacts[0].position.clone().add(new Vector3(0, 0, 40.01));
    expect(events.update(1, position, eventContacts)).toBeNull();
    position.z -= 0.01;
    expect(events.update(1, position, eventContacts)?.kind).toBe('plume');
    expect(events.available(eventContacts[0])).toBe(false);
    events.update(EXPLORE_CONFIG.eventDurationS, position, eventContacts);
    expect(events.active).toBeNull();
    expect(events.update(10000, position, eventContacts)).toBeNull();
    position.z += 1;
    events.update(1, position, eventContacts);
    expect(events.available(eventContacts[0])).toBe(true);
    position.z -= 1;
    expect(events.update(1, position, eventContacts)?.kind).toBe('plume');
  });
  it('ignores paused/invalid steps, does not overlap or queue arrivals, and resets', () => {
    const events = new AnchoredEvents();
    const first = eventContacts[0];
    const second = {
      ...first,
      id: 'other',
      position: first.position.clone().add(new Vector3(200, 0, 0)),
    };
    const contacts = [first, second];
    for (const dt of [0, -1, NaN, Infinity])
      expect(events.update(dt, first.position, contacts)).toBeNull();
    events.update(1, first.position, contacts);
    events.update(0, second.position, contacts);
    expect(events.active?.elapsedS).toBe(0);
    expect(events.update(1, second.position, contacts)).toBeNull();
    events.update(18, second.position, contacts);
    expect(events.update(100, second.position, contacts)).toBeNull();
    events.reset();
    expect(events.active).toBeNull();
    expect(events.update(1, second.position, contacts)?.contact.id).toBe('other');
  });
  it('consumes coincident arrivals together without replaying an occupied spot', () => {
    const first = eventContacts[0];
    const second = { ...first, id: 'event:turbidity', kind: 'turbidity' as const };
    for (const contacts of [
      [first, second],
      [second, first],
    ]) {
      const events = new AnchoredEvents();
      expect(events.update(1, first.position, contacts)?.contact).toBe(contacts[0]);
      expect(contacts.every((contact) => !events.available(contact))).toBe(true);
      events.update(EXPLORE_CONFIG.eventDurationS, first.position, contacts);
      expect(events.update(10000, first.position, contacts)).toBeNull();
      expect(contacts.every((contact) => !events.available(contact))).toBe(true);
      const outside = first.position.clone().add(new Vector3(0, 0, 41));
      events.update(1, outside, contacts);
      expect(contacts.every((contact) => events.available(contact))).toBe(true);
      expect(events.update(1, first.position, contacts)?.contact).toBe(contacts[0]);
    }
  });
});

describe('content, collection and Journal', () => {
  const def = {
    id: 'arch',
    name: 'Carbonate arch',
    kind: 'alcove',
    lat: 30,
    lon: -42,
    text: 'A quiet shelter.',
  };
  it('ignores malformed optional content and duplicate IDs', () => {
    expect(parseSecrets(null).secrets).toEqual([]);
    expect(parseSecrets({ version: 99, secrets: [def] }).secrets).toEqual([]);
    const doc = parseSecrets({
      version: 1,
      secrets: [def, def, { ...def, id: 'bad', lat: NaN }, { ...def, id: 'bad2', kind: 'fantasy' }],
      samples: [{ id: 'mud', name: 'Sediment', lat: 30, lon: -42 }],
    });
    expect(doc.secrets).toHaveLength(1);
    expect(doc.samples).toHaveLength(1);
  });
  it('unlocks a hidden Journal entry and site from a secret, and counts persistent finds', () => {
    const doc = parseSecrets({ version: 1, secrets: [def] });
    const site = buildJournalSite({
      id: 'lost-city',
      guide: null,
      pois: [],
      species: null,
      secrets: doc.secrets,
    });
    const store = { isDiscovered: (_site: string, id: string): boolean => id === 'secret:arch' };
    expect(isEntryUnlocked(site, site.entries[0], store)).toBe(true);
    expect(isSiteUnlocked(site, store)).toBe(true);
    expect(secretProgress(site.id, doc.secrets, store)).toEqual({ found: 1, total: 1 });
  });
  it('collects one sample per dive and allows it again after restarting', () => {
    const samples = new Samples();
    const target: SampleTarget = {
      ...contact,
      id: 'sample:mud',
      def: { id: 'mud', name: 'Sediment core', lat: 30, lon: -42 },
    };
    expect(samples.collect(target)).toBe(true);
    expect(samples.collect(target)).toBe(false);
    expect([...samples.collected.values()]).toEqual(['Sediment core']);
    samples.reset();
    expect(samples.collect(target)).toBe(true);
  });
});

describe('procedural visuals', () => {
  it('seats each base on the detailed seabed and merges props to one draw', () => {
    for (const kind of ['frame', 'alcove', 'seep', 'bone', 'wood', 'chain', 'rock'] as const) {
      const mesh = buildSecret(kind);
      const pos = mesh.geometry.getAttribute('position');
      const original = Array.from({ length: pos.count }, (_, i) => pos.getY(i));
      seatOnSeabed(mesh, 40, 80, (x, z) => -100 + x * 0.1 + z * 0.2);
      expect(mesh.position.y).toBeCloseTo(-80);
      for (let i = 0; i < pos.count; i++)
        expect(pos.getY(i)).toBeCloseTo(original[i] + pos.getX(i) * 0.1 + pos.getZ(i) * 0.2, 4);
      expect(mesh.geometry.getAttribute('color')).toBeDefined();
      disposeExploreMesh(mesh);
    }
  });
  it('keeps event visuals bounded and hides them when the event ends', () => {
    const visual = new EventsVisual('low');
    const event = { kind: 'plume' as const, elapsedS: 3, durationS: 9 };
    const anchored = {
      ...event,
      contact: { ...eventContacts[0], position: new Vector3(0, -94, -40) },
    };
    visual.begin(anchored, () => -100);
    expect(visual.origin.y).toBe(-82);
    visual.update(anchored);
    expect(visual.group.visible).toBe(true);
    expect(visual.group.children).toHaveLength(2);
    visual.update({ ...anchored, kind: 'whale' });
    expect(visual.group.children[1].visible).toBe(true);
    visual.update(null);
    expect(visual.group.visible).toBe(false);
    visual.dispose();
  });
});
