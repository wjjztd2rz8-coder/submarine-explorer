// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { AnchoredEvents, placeEventContacts } from '../../src/game/Events.js';
import {
  parseSecrets,
  placeSecrets,
  secretInRange,
  secretProgress,
} from '../../src/game/Secrets.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';
import { Samples, placeSamples, type SampleTarget } from '../../src/game/Samples.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { parseMission, parseMissionIndex } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import { buildEntries, parseLifeDoc } from '../../src/world/life/tables.js';
import { buildSecret, seatOnSeabed, disposeExploreMesh } from '../../src/game/SecretsVisual.js';
import { EventsVisual } from '../../src/game/EventsVisual.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  isSiteUnlocked,
  lifeDiscoveryId,
} from '../../src/game/JournalData.js';
import type { TileMeta } from '../../src/util/types.js';

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

describe('coexisting discovery identities', () => {
  const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
  const life = parseLifeDoc(readJson('data/life/life.json'));
  // The shipped index excludes synthetic fixtures. Flat ground only supplies positions;
  // this contract checks identities, not terrain, placement or simultaneous visibility.
  const sites = parseMissionIndex(readJson('data/landmarks/index.json')).map((site) => {
    const mission = parseMission(readJson(`data/landmarks/${site}/mission.json`), site)!;
    const meta = readJson(`data/tiles/${mission.tile}/meta.json`) as TileMeta;
    const pois = placePois(
      parsePois(readJson(`data/landmarks/${mission.landmark}/pois.json`)),
      meta,
      { sampleHeight: () => -100 },
      DEFAULT_CONFIG.scan,
      mission.landmark,
    );
    const path = `data/secrets/${mission.landmark}.json`;
    const doc = parseSecrets(existsSync(path) ? readJson(path) : null);
    const secrets = placeSecrets(doc, mission.landmark, meta, () => -100);
    const samples = placeSamples(doc.samples, mission.landmark, meta, () => -100);
    const table = life.sites[mission.landmark];
    const species = new Set(buildEntries(table).map((row) => row.def.id));
    if (table?.rare && SPECIES_BY_ID.has(table.rare.species)) species.add(table.rare.species);
    const targets = [
      ...pois.map((t) => ({ ...t, pool: 'poi' })),
      ...secrets.map((t) => ({ ...t, pool: 'secret' })),
      ...samples.map((t) => ({ ...t, pool: 'sample' })),
      ...[...species].map((id) => ({
        id: lifeDiscoveryId(id),
        landmarkId: mission.landmark,
        pool: 'life',
      })),
    ];
    return { site, mission, targets };
  });

  it.each(sites)(
    '$site keeps optional, fixed and supported life identities independent',
    ({ mission, targets }) => {
      expect(new Set(targets.map((t) => t.id)).size, JSON.stringify(targets)).toBe(targets.length);
      for (const objective of mission.objectives) {
        // Mission completion matches the final POI ID; another pool must not satisfy it.
        expect(targets.filter((t) => t.id === objective.poi).map((t) => t.pool)).toEqual(['poi']);
      }
      // Life's completion listener resolves against the whole catalogue, even when
      // that animal is absent from this site's natural spawn table.
      const catalogueIds = new Set([...SPECIES_BY_ID.keys()].map(lifeDiscoveryId));
      for (const t of targets.filter((t) => t.pool !== 'life'))
        expect(catalogueIds.has(t.id)).toBe(false);
    },
  );

  type Identity = { id: string; landmarkId: string };
  const allTargets = sites.flatMap((s) => s.targets);
  function expectIsolatedReload(target: Identity, neighbors: Identity[]): void {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const store = new DiscoveryStore(storage);
    expect(store.record(target.landmarkId, target.id).firstTime).toBe(true);
    const reloaded = new DiscoveryStore(storage);
    expect(reloaded.keys()).toEqual([`${target.landmarkId}/${target.id}`]);
    expect(reloaded.get(target.landmarkId, target.id)).toEqual(
      store.get(target.landmarkId, target.id),
    );
    for (const neighbor of neighbors)
      expect(
        reloaded.isDiscovered(neighbor.landmarkId, neighbor.id),
        JSON.stringify(neighbor),
      ).toBe(false);
  }

  // Repeated local IDs at different sites are allowed; choose shipped examples
  // where available rather than requiring any site to author optional content.
  const repeated = ['secret', 'sample', 'life'].flatMap((pool) => {
    const target = allTargets.find(
      (t) =>
        t.pool === pool &&
        allTargets.some(
          (other) => other.pool === pool && other.id === t.id && other.landmarkId !== t.landmarkId,
        ),
    );
    return target ? [target] : [];
  });
  it.each(repeated)('$pool $id reloads only at $landmarkId among shipped contacts', (target) => {
    expectIsolatedReload(
      target,
      allTargets.filter((other) => other !== target),
    );
  });

  // Synthetic same-local-ID controls exercise the supported kind namespaces;
  // they are not claims that these rows occur in shipped content.
  const localId = 'comb-jelly';
  const meta = { center: { lat: 0, lon: 0 } } as TileMeta;
  const row = { id: localId, name: 'Contact', lat: 0, lon: 0 };
  const doc = parseSecrets({
    version: 1,
    secrets: [{ ...row, kind: 'rock', text: 'A rock.' }],
    samples: [row],
  });
  const controls = [
    { id: parsePois([row])[0].id, landmarkId: 'fixture' },
    ...placeSecrets(doc, 'fixture', meta, () => -100),
    ...placeSamples(doc.samples, 'fixture', meta, () => -100),
    { id: lifeDiscoveryId(localId), landmarkId: 'fixture' },
  ];
  it.each(controls)(
    'synthetic $id stays independent of other kinds with the same local ID',
    (target) => {
      expectIsolatedReload(
        target,
        controls.filter((other) => other !== target),
      );
    },
  );
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
