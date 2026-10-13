import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { EventScheduler, eventKinds, type ExploreEventKind } from '../../src/game/Events.js';
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

for (const aspect of [844 / 390, 1280 / 720]) {
  describe(`Low event geometry in landscape ${aspect}`, () => {
    for (const kind of ['plume', 'turbidity', 'whale'] as const) {
      it(`${kind} starts visible, ahead and 30–70 m away, with bounded render work`, () => {
        const visual = new EventsVisual('low');
        const event = { kind, elapsedS: 0, durationS: EXPLORE_CONFIG.eventDurationS };
        const view = camera(aspect);
        try {
          expect(visual.begin(event, pilot, forward, floor, view)).toBe(true);
          const centre = visual.origin.clone().project(view);
          expect(Math.abs(centre.x)).toBeLessThan(EXPLORE_CONFIG.eventViewMargin);
          expect(Math.abs(centre.y)).toBeLessThan(EXPLORE_CONFIG.eventViewMargin);
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

it('defers when looking backwards or when the bed cannot be placed in the view', () => {
  const visual = new EventsVisual('low');
  const view = camera();
  view.lookAt(0, -80, 100);
  view.updateMatrixWorld();
  const event = { kind: 'plume' as const, elapsedS: 0, durationS: 18 };
  expect(visual.begin(event, pilot, forward, floor, view)).toBe(false);
  expect(visual.group.visible).toBe(false);
  expect(visual.begin(event, pilot, forward, () => 100, camera())).toBe(false);
  visual.dispose();
});

it('defers a whale when there is no underwater space above the pilot', () => {
  const visual = new EventsVisual('low');
  const view = camera();
  const nearSurface = new THREE.Vector3(0, -3, 0);
  view.position.set(0, 5, 20);
  view.lookAt(0, -5, -40);
  const event = { kind: 'whale' as const, elapsedS: 0, durationS: 18 };
  expect(visual.begin(event, nearSurface, forward, () => -100, view)).toBe(false);
  expect(visual.group.visible).toBe(false);
  visual.dispose();
});

it('logs explained sightings without adding secrets, species or snow to counts or bonuses', () => {
  for (const [siteId, kinds] of [
    ['beebe-vent-field', ['plume']],
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
  progress.award('event', 'monterey-canyon/turbidity');
  progress.creditDiscovery('monterey-canyon/event:turbidity');
  expect(progress.points).toBe(5);
  expect(progress.bonus).toBe(false);
  expect(progress.snapshot().awarded).toEqual(['event:monterey-canyon/turbidity']);
  const restored = new Progress(new ProgressSave(null), ['monterey-canyon/event:turbidity']);
  expect(restored.points).toBe(5);
  expect(restored.divePoints).toBe(0);
  expect(restored.award('event', 'monterey-canyon/turbidity')).toBe(0);
  expect(restored.bonus).toBe(false);
});

it('quiet sites never schedule undefined events even after repeated overdue updates', () => {
  const scheduler = new EventScheduler(() => 1);
  const habitat = { site: 'titanic', depthM: 3800, altitudeM: 20 };
  expect(eventKinds(habitat)).toEqual([]);
  for (let i = 0; i < 10; i++) {
    expect(scheduler.update(10000, habitat)).toBeNull();
    expect(scheduler.active).toBeNull();
  }
});
