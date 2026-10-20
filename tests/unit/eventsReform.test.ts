import { describe, expect, it } from 'vitest';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { allSiteManifests } from '../../src/core/SiteManifest.js';
import { Save } from '../../src/core/Save.js';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { EventBus } from '../../src/core/EventBus.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';
import {
  AnchoredEvents,
  placeEventContacts,
  type ExploreEventKind,
} from '../../src/game/Events.js';
import { EventsVisual } from '../../src/game/EventsVisual.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  isSiteUnlocked,
  siteProgress,
  EVENT_SIGHTINGS,
  eventDiscoveryId,
} from '../../src/game/JournalData.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';

function camera(aspect = 844 / 390): THREE.PerspectiveCamera {
  const view = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  view.position.set(0, -68, 20);
  view.lookAt(0, -85, -45);
  view.updateMatrixWorld();
  return view;
}
const pilot = new THREE.Vector3(0, -85, 0);
const forward = new THREE.Vector3(0, 0, -1);
const floor = (x: number, _z: number): number => -100 + x * 0.08;

for (const site of allSiteManifests().filter((site) => site.events)) {
  it(`${site.id}: Low contacts keep arrival separate from Arcade scanning and bounded through playback`, () => {
    const config = makeConfig();
    const settings = new Save({ config, storage: null }).get();
    const scan = resolveEffective(settings, 'arcade', null, config).scan;
    const meta = JSON.parse(readFileSync(`data/tiles/${site.id}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site.id}/heightmap.bin`);
    const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
    const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
    const ground = (x: number, z: number) => terrain.sampleHeight(x, z);
    const visual = new EventsVisual('low');
    try {
      for (const contact of placeEventContacts(site.id, meta, ground)) {
        const { kind } = contact;
        const events = new AnchoredEvents();
        const bus = new EventBus();
        let scans = 0;
        bus.on('scan:complete', () => scans++);
        const scanner = new Scanner(scan, bus);
        scanner.setSupplementalTargets([contact]);
        expect(scan.radiusFloorM).toBe(100);
        expect(contact.arrivalRadiusM).toBe(40);
        expect(contact.radius).toBe(110);
        expect(contact.arrivalRadiusM).toBeLessThan(scan.radiusFloorM);
        expect(contact.radius).toBeGreaterThan(scan.radiusFloorM);
        for (const range of [110.001, 109.999, 100, 40.001]) {
          const pilot = contact.position.clone().add(new THREE.Vector3(0, 0, range));
          scanner.update(100, pilot, forward, true);
          expect(scanner.view.nearestId).toBe(range > contact.radius ? null : contact.id);
          expect(scanner.view.candidateId).toBeNull();
          expect(events.update(100, pilot, [contact])).toBeNull();
        }
        expect(scans).toBe(0);
        // The inclusive 3D arrival starts once; occupation cannot retrigger at expiry.
        const arrival = contact.position.clone().add(new THREE.Vector3(0, 40, 0));
        const event = events.update(0.25, arrival, [contact])!;
        expect(event?.contact).toBe(contact);
        expect(event.elapsedS).toBe(0);
        expect(event.durationS).toBe(18);
        visual.begin(event, ground);
        const object = visual.group.children[kind === 'whale' ? 1 : 0] as THREE.Mesh;
        const positions = object.geometry.getAttribute('position');
        const budget = kind === 'whale' ? positions.count / 3 : positions.count;
        expect(budget).toBe(kind === 'whale' ? 588 : 100);
        for (const elapsedS of [0, 0.8, 7, 15, 17.75]) {
          visual.update({ ...event, elapsedS });
          visual.group.updateMatrixWorld(true);
          expect(visual.group.visible).toBe(true);
          expect(visual.group.children.filter((child) => child.visible)).toEqual([object]);
          expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
          expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true);
          expect(visual.origin.toArray().every(Number.isFinite)).toBe(true);
          if (kind !== 'whale') {
            const material = object.material as THREE.PointsMaterial;
            expect(Number.isFinite(material.size) && material.size > 0).toBe(true);
            expect(Number.isFinite(material.opacity) && material.opacity > 0).toBe(true);
          }
        }
        for (let i = 1; i <= 72; i++) {
          expect(events.update(0.25, arrival, [contact])).toBeNull();
          if (i < 72) expect(events.active?.elapsedS).toBe(i / 4);
        }
        expect(events.active).toBeNull();
        visual.update(events.active);
        expect(visual.group.visible).toBe(false);
        expect(events.update(10000, arrival, [contact])).toBeNull();
        const outside = arrival.clone().add(new THREE.Vector3(0, 1, 0));
        expect(events.update(1, outside, [contact])).toBeNull();
        expect(events.update(1, arrival, [contact])?.contact).toBe(contact);
      }
    } finally {
      visual.dispose();
      terrain.dispose();
    }
  });
}

for (const aspect of [844 / 390, 1280 / 720]) {
  describe(`Low event geometry in landscape ${aspect}`, () => {
    for (const kind of ['plume', 'turbidity', 'whale'] as const) {
      it(`${kind} has projected geometry at a fixed anchor 30–70 m away, with bounded render work`, () => {
        const visual = new EventsVisual('low');
        const event = {
          kind,
          contact: {
            ...placeEventContacts(
              'beebe-vent-field',
              { center: { lat: 0, lon: 0 } } as never,
              floor,
            )[0],
            position: new THREE.Vector3(0, kind === 'whale' ? -71 : -94, -40),
          },
          elapsedS: 0,
          durationS: EXPLORE_CONFIG.eventDurationS,
        };
        const view = camera(aspect);
        try {
          visual.begin(event, floor);
          const centre = visual.origin.clone().project(view);
          expect(Math.abs(centre.x)).toBeLessThan(0.82);
          expect(Math.abs(centre.y)).toBeLessThan(0.82);
          expect(centre.z).toBeGreaterThan(-1);
          expect(centre.z).toBeLessThan(1);
          expect(visual.origin.distanceTo(pilot)).toBeGreaterThanOrEqual(30);
          expect(visual.origin.distanceTo(pilot)).toBeLessThanOrEqual(70);
          expect(visual.origin.clone().sub(pilot).dot(forward)).toBeGreaterThan(0);
          const sightline = new THREE.Ray(
            view.position,
            visual.origin.clone().sub(view.position).normalize(),
          );
          expect(sightline.distanceToPoint(pilot)).toBeGreaterThanOrEqual(7);
          expect(visual.group.children).toHaveLength(2);
          const points = visual.group.children[0] as THREE.Points<
            THREE.BufferGeometry,
            THREE.PointsMaterial
          >;
          const whale = visual.group.children[1] as THREE.Mesh;
          expect(points.geometry.getAttribute('position').count).toBe(100);
          expect(points.material.map).toBeNull();
          expect(whale.geometry.groups).toHaveLength(0);
          expect(whale.geometry.getAttribute('position').count / 3).toBeLessThan(1500);
          expect(visual.group.children.filter((o) => o.visible)).toHaveLength(1);
          if (kind !== 'whale') {
            expect(points.material.opacity).toBeGreaterThan(0.7);
            expect(points.material.size).toBeGreaterThanOrEqual(7);
            const positions = points.geometry.getAttribute('position');
            for (let i = 0; i < positions.count; i++) {
              const x = positions.getX(i) + visual.group.position.x;
              const z = positions.getZ(i) + visual.group.position.z;
              expect(
                positions.getY(i) + visual.group.position.y - points.material.size / 2,
              ).toBeGreaterThanOrEqual(floor(x, z) + EXPLORE_CONFIG.eventFloorClearanceM - 0.0001);
            }
            const heights = Array.from({ length: positions.count }, (_, i) => positions.getY(i));
            expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(
              kind === 'plume' ? 24 : 4,
              0,
            );
          }
          const start = visual.origin.clone();
          visual.update({ ...event, elapsedS: 6 });
          if (kind === 'turbidity') {
            expect(visual.origin.x).toBeLessThan(start.x);
            expect(visual.origin.y).toBeLessThan(start.y);
          }
          if (kind === 'whale') {
            expect(visual.origin.distanceTo(start)).toBeGreaterThan(8);
            expect(visual.origin.y).toBeGreaterThan(pilot.y);
          }
          visual.update(null);
          expect(visual.group.visible).toBe(false);
        } finally {
          visual.dispose();
        }
      });
    }
  });
}

it('keeps its authored origin regardless of where the pilot looks', () => {
  const visual = new EventsVisual('low');
  const contact = {
    ...placeEventContacts('beebe-vent-field', { center: { lat: 0, lon: 0 } } as never, floor)[0],
    position: new THREE.Vector3(0, -94, -40),
  };
  visual.begin({ kind: 'plume', contact, elapsedS: 0, durationS: 18 }, floor);
  expect(visual.group.position.toArray()).toEqual([0, -94, -40]);
  expect(visual.origin.toArray()).toEqual([0, -82, -40]);
  visual.dispose();
});

it('logs explained sightings without adding secrets, species or snow to counts or bonuses', () => {
  for (const [siteId, kinds] of [
    ['axial-seamount-ashes', ['plume']],
    ['hunga-tonga-caldera', ['turbidity']],
    ['beebe-vent-field', ['plume']],
    ['hudson-canyon', ['turbidity', 'whale']],
    ['kamaehuakanaloa', ['plume']],
    ['monterey-canyon', ['turbidity', 'whale']],
    ['titanic', []],
    ['lost-city', []],
  ] as Array<[string, ExploreEventKind[]]>) {
    const site = buildJournalSite({ id: siteId, guide: null, pois: [], species: null });
    const store = new DiscoveryStore(null);
    expect(site.entries.map((e) => e.id)).toEqual(kinds.map(eventDiscoveryId));
    expect(siteProgress(site, store)).toEqual({
      logged: 0,
      total: kinds.length,
      species: 0,
      speciesTotal: 0,
    });
    expect(site.entries.filter((e) => e.kind === 'secret')).toHaveLength(0);
    for (const kind of kinds) {
      const entry = site.entries.find((e) => e.id === eventDiscoveryId(kind))!;
      expect(isEntryUnlocked(site, entry, store)).toBe(false);
      store.record(siteId, eventDiscoveryId(kind));
      expect(isEntryUnlocked(site, entry, store)).toBe(true);
      expect(isSiteUnlocked(site, store)).toBe(true);
      expect(entry.guide?.paragraphs.join(' ')).toBe(EVENT_SIGHTINGS[kind].paragraphs[0]);
      expect(entry.guide?.sources).toHaveLength(1);
      expect(entry.recreation).toBe(true);
    }
  }
  const progress = new Progress(new ProgressSave(null));
  progress.creditDiscovery('monterey-canyon/event:turbidity');
  expect(progress.points).toBe(0);
  expect(progress.bonus).toBe(false);
  expect(progress.snapshot().awarded).toEqual([]);
  const restored = new Progress(new ProgressSave(null), ['monterey-canyon/event:turbidity']);
  expect(restored.points).toBe(0);
  expect(restored.divePoints).toBe(0);
  expect(restored.snapshot().awarded).toEqual([]);
  expect(restored.bonus).toBe(false);
});

it('sites without authored contacts remain quiet', () => {
  const events = new AnchoredEvents();
  const contacts = placeEventContacts('titanic', { center: { lat: 0, lon: 0 } } as never, floor);
  expect(contacts).toEqual([]);
  for (let i = 0; i < 10; i++) {
    expect(events.update(10000, pilot, contacts)).toBeNull();
    expect(events.active).toBeNull();
  }
});
