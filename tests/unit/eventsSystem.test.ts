import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { createExploreSystem } from '../../src/app/systems/explore.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Progress } from '../../src/game/Progress.js';
import { ProgressSave } from '../../src/core/Save.js';
import {
  AnchoredEvents,
  placeEventContacts,
  type ExploreEventKind,
  type EventContact,
} from '../../src/game/Events.js';
import { allSiteManifests } from '../../src/core/SiteManifest.js';
import { Scanner } from '../../src/game/Scanner.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';

afterEach(() => vi.unstubAllGlobals());

for (const site of allSiteManifests().filter((site) => site.events)) {
  for (const kind of Object.keys(site.events!) as ExploreEventKind[]) {
    it(`${site.id}/${kind}: contacts, arrival, witness/Journal, pause, reset and re-entry`, async () => {
      /** What the slot would show for the sighting: the last message offered, or null. */
      const slot = { shown: null as { text: string; detail?: string } | null };
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          status: 200,
          json: async () => ({ version: 1, secrets: [], samples: [] }),
        })),
      );
      const progress = new Progress(new ProgressSave(null));
      const store = new DiscoveryStore(null);
      const exposed = { progress } as unknown as {
        progress: Progress;
        explore: {
          ready: boolean;
          events: AnchoredEvents;
          eventContacts: EventContact[];
          summary(): { events: string[] };
        };
      };
      vi.stubGlobal('window', { __game: exposed });
      const meta = {
        center: { lat: site.events![kind]!.anchor.lat, lon: site.events![kind]!.anchor.lon },
      } as never;
      const contact = placeEventContacts(site.id, meta, () => -100).find((c) => c.kind === kind)!;
      const position = contact.position.clone().add(new THREE.Vector3(0, 12, 60));
      const camera = new THREE.PerspectiveCamera(60, 844 / 390, 0.1, 1000);
      camera.position.set(0, -68, 20);
      camera.lookAt(0, -85, -45);
      camera.updateMatrixWorld();
      let occluded = false;
      const focus = vi.fn();
      const bus = new EventBus();
      const witnessed = vi.fn();
      bus.on('event:witnessed', witnessed);
      const context = {
        tier: 'low',
        contentLandmark: site.id,
        meta,
        bus,
        scene: new THREE.Scene(),
        sub: { position, getForward: () => new THREE.Vector3(0, 0, -1) },
        rig: { camera },
        terrain: {
          sampleHeight: (_x: number, z: number) => (occluded && z > 20 && z < 40 ? 1000 : -100),
        },
        app: { state: 'dive' },
        guidance: {
          offer: (_source: string, _kind: string, message: typeof slot.shown) => {
            slot.shown = message;
          },
        },
        discovery: {
          ready: Promise.resolve(),
          store,
          debrief: {},
          scanner: new Scanner(DEFAULT_CONFIG.scan, bus, store),
        },
        journal: { focus, refresh: vi.fn() },
        sonar: { setFaintContacts: vi.fn() },
        audio: { playExploreCue: vi.fn() },
        expose: (extra: object) => Object.assign(exposed, extra),
      } as unknown as GameContext;
      const system = createExploreSystem();
      system.init!(context);
      try {
        await vi.waitFor(() => expect(exposed.explore.ready).toBe(true));
        const frame = (dt: number, blocked = false, frozen = false) => {
          system.frame!['world.life']!(
            { pilotPosition: position, clockDt: dt, dt, blocked, frozen } as FrameState,
            context,
          );
        };
        expect(exposed.explore.eventContacts.map((c) => c.kind)).toContain(kind);
        const scanner = context.discovery.scanner;
        scanner.update(1, position, new THREE.Vector3(0, 0, -1), true);
        expect(scanner.getSupplementalTargets()).toContain(
          exposed.explore.eventContacts.find((c) => c.kind === kind),
        );
        expect(scanner.view.nearestName).toBe(contact.name);
        expect(scanner.view.candidateId).toBeNull();
        expect(store.keys()).toEqual([]);
        frame(10000);
        expect(exposed.explore.events.active).toBeNull();
        position.copy(contact.position).add(new THREE.Vector3(0, 12, 30));
        frame(100, true);
        frame(100, false, true);
        expect(exposed.explore.events.active).toBeNull();
        frame(0.1);
        expect(exposed.explore.events.active?.kind).toBe(kind);
        expect(scanner.getSupplementalTargets()).not.toContain(
          exposed.explore.eventContacts.find((c) => c.kind === kind),
        );
        const group = context.scene.getObjectByName('exploreEvent')!;
        expect(group.position.distanceTo(contact.position)).toBeLessThan(0.01);
        // No remote witness and no log just for arriving or for looking away.
        position.z += 100;
        frame(1);
        expect(slot.shown?.detail).toBe('Get closer to log it');
        expect(store.keys()).toEqual([]);
        position.copy(contact.position).add(new THREE.Vector3(0, 12, 30));
        camera.position.copy(position).add(new THREE.Vector3(0, 5, 10));
        camera.lookAt(position.clone().add(new THREE.Vector3(0, 0, 100)));
        frame(0.1);
        expect(store.keys()).toEqual([]);
        camera.lookAt(
          contact.position
            .clone()
            .add(new THREE.Vector3(0, kind === 'plume' ? 12 : kind === 'turbidity' ? 6 : 0, 0)),
        );
        occluded = true;
        frame(0.1);
        expect(store.keys()).toEqual([]);
        occluded = false;
        frame(0.1);
        expect(slot.shown?.detail).toBe('Sighting logged in Journal');
        expect(store.keys()).toEqual([`${site.id}/event:${kind}`]);
        expect(focus).toHaveBeenCalledWith(`event:${kind}`);
        expect(exposed.explore.summary().events).toHaveLength(1);
        const elapsed = exposed.explore.events.active!.elapsedS;
        frame(100, true);
        expect(slot.shown).toBeNull();
        expect(exposed.explore.events.active!.elapsedS).toBe(elapsed);
        frame(100, false, true);
        expect(exposed.explore.events.active!.elapsedS).toBe(elapsed);
        context.app.state = 'pause';
        bus.emit('app:state', { state: 'pause' });
        frame(100);
        expect(slot.shown).toBeNull();
        expect(exposed.explore.events.active!.elapsedS).toBe(elapsed);
        context.app.state = 'dive';
        frame(0.1);
        expect(slot.shown).not.toBeNull();
        expect(slot.shown?.detail).toBe('Sighting logged in Journal');
        expect(witnessed).toHaveBeenCalledTimes(1);
        expect(progress.points).toBe(0);
        expect(progress.bonus).toBe(false);
        expect(store.snapshot().discovered[`${site.id}/event:${kind}`].count).toBe(1);
        frame(18);
        expect(exposed.explore.events.active).toBeNull();
        expect(slot.shown).toBeNull();
        frame(10000);
        expect(exposed.explore.events.active).toBeNull();
        // A paused excursion cannot rearm the arrival latch.
        position.z += 200;
        frame(0, false, true);
        position.z -= 200;
        frame(1);
        expect(exposed.explore.events.active).toBeNull();
        position.z += 200;
        frame(1);
        position.z -= 200;
        frame(1);
        expect(exposed.explore.events.active?.kind).toBe(kind);
        frame(1);
        expect(witnessed).toHaveBeenCalledTimes(2);
        expect(store.snapshot().discovered[`${site.id}/event:${kind}`].count).toBe(1);
        bus.emit('mission:restart', { missionId: site.id });
        expect(group.visible).toBe(false);
        expect(exposed.explore.events.active).toBeNull();
        expect(exposed.explore.summary().events).toEqual([]);
        expect(store.isDiscovered(site.id, `event:${kind}`)).toBe(true);
      } finally {
        system.dispose!();
      }
    });
  }
}
