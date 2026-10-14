import * as THREE from 'three';
import { EXPLORE_CONFIG } from '../../core/config/explore.js';
import {
  EventScheduler,
  EVENT_CAPTIONS,
  type ExploreEvent,
  type ExploreEventKind,
} from '../../game/Events.js';
import { eventDiscoveryId, EVENT_SIGHTINGS } from '../../game/JournalData.js';
import { EventsVisual } from '../../game/EventsVisual.js';
import {
  loadSecrets,
  placeSecrets,
  secretInRange,
  secretProgress,
  type SecretsDoc,
  type SecretTarget,
} from '../../game/Secrets.js';
import { buildSecret, disposeExploreMesh, seatOnSeabed } from '../../game/SecretsVisual.js';
import { Samples, placeSamples, type SampleTarget } from '../../game/Samples.js';
import type { ExplorationSummary } from '../../ui/Debrief.js';
import type { GameContext } from '../context.js';
import type { GameSystem } from '../System.js';

/** Hidden curiosities share the scan control, but never the mission target list. */
export function createExploreSystem(): GameSystem {
  let doc: SecretsDoc = { version: 1, secrets: [], samples: [] };
  let secrets: SecretTarget[] = [];
  let sampleTargets: SampleTarget[] = [];
  const samples = new Samples();
  const scheduler = new EventScheduler();
  const meshes: THREE.Mesh[] = [];
  const witnessed = new Set<ExploreEventKind>();
  let visual: EventsVisual;
  /** Event time at which the sighting was logged; its caption then clears soon after. */
  let loggedAtS = Infinity;
  let effect: THREE.Points;
  let ready = false;
  let disposed = false;
  let eventWitnessed = false;
  let sampling = false;
  const disposers: Array<() => void> = [];
  const faint: SecretTarget[] = [];
  let targets: Array<SecretTarget | SampleTarget> = [];
  const projected = new THREE.Vector3();

  const announce = (ctx: GameContext, event: ExploreEvent): boolean => {
    const placed = visual.begin(
      event,
      ctx.sub.position,
      ctx.sub.getForward(),
      (x, z) => ctx.terrain.sampleHeight(x, z),
      ctx.rig.camera,
    );
    if (!placed) {
      scheduler.reset();
      return false;
    }
    eventWitnessed = false;
    loggedAtS = Infinity;
    ctx.audio.playExploreCue();
    return true;
  };
  return {
    name: 'explore',
    init(ctx) {
      visual = new EventsVisual(ctx.tier);
      ctx.scene.add(visual.group);
      const positions = Float32Array.from({ length: 36 }, (_, i) =>
        i % 3 === 1 ? (i / 36) * 1.5 : Math.sin(i * 7) * 1.5,
      );
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      effect = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: 0xb7c3b2,
          size: 0.14,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        }),
      );
      effect.visible = false;
      ctx.scene.add(effect);
      const summary = (): ExplorationSummary => {
        const count = secretProgress(ctx.contentLandmark, doc.secrets, ctx.discovery.store);
        return {
          ...count,
          secrets: secrets
            .filter((t) => ctx.discovery.scanner.isScanned(t.landmarkId, t.id))
            .map((t) => t.def.name),
          samples: [...samples.collected.values()],
          events: [...witnessed].map((k) => EVENT_SIGHTINGS[k].title.replace('Sighting: ', '')),
        };
      };
      ctx.discovery.debrief.exploration = summary;
      if (ctx.missionRouter) ctx.missionRouter.exploration = summary;
      ctx.expose({
        explore: {
          get ready() {
            return ready;
          },
          get secrets() {
            return secrets;
          },
          get sampleTargets() {
            return sampleTargets;
          },
          get faintContacts() {
            return faint;
          },
          samples,
          scheduler,
          summary,
          /** Deterministic screenshot hook. Normal play uses the scheduler's quiet gaps. */
          previewEvent(kind: ExploreEventKind): boolean {
            const e = scheduler.preview(kind);
            if (!e) return false;
            return announce(ctx, e);
          },
        },
      });
      void Promise.all([loadSecrets(ctx.contentLandmark), ctx.discovery.ready]).then(([loaded]) => {
        if (disposed) return;
        doc = loaded;
        const ground = (x: number, z: number): number => ctx.terrain.sampleHeight(x, z);
        secrets = placeSecrets(doc, ctx.contentLandmark, ctx.meta, ground);
        sampleTargets = placeSamples(doc.samples, ctx.contentLandmark, ctx.meta, ground);
        for (const target of secrets) {
          const mesh = buildSecret(target.def.kind);
          seatOnSeabed(mesh, target.position.x, target.position.z, ground);
          mesh.visible = false;
          meshes.push(mesh);
          ctx.scene.add(mesh);
          if (ctx.discovery.store.isDiscovered(target.landmarkId, target.id))
            target.name = target.def.name;
        }
        for (const target of sampleTargets) {
          // Loose material on the sediment, away from heritage structures and living coral.
          const mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.5, 0),
            new THREE.MeshStandardMaterial({ color: 0xb0a88d, roughness: 1 }),
          );
          mesh.scale.set(1.5, 0.6, 1);
          mesh.position.copy(target.position).add(new THREE.Vector3(0, -0.3, 0));
          meshes.push(mesh);
          ctx.scene.add(mesh);
        }
        targets = [...secrets, ...sampleTargets];
        ctx.discovery.scanner.setSupplementalTargets(targets);
        ready = true;
      });
      disposers.push(
        ctx.bus.on('scan:complete', (e) => {
          if (e.landmarkId !== ctx.contentLandmark) return;
          const secret = secrets.find((t) => t.id === e.poiId);
          if (secret) {
            secret.name = secret.def.name;
            ctx.discovery.onLifeScan(secret.def.name, e.firstTime, `secret/${secret.def.id}`);
            ctx.journal.focus(secret.def.id);
            ctx.bus.emit('discovery:secret', {
              landmarkId: e.landmarkId,
              secretId: secret.def.id,
              name: secret.def.name,
              firstTime: e.firstTime,
            });
            ctx.progress.award('secret', `${e.landmarkId}/${secret.def.id}`);
            return;
          }
          const target = sampleTargets.find((t) => t.id === e.poiId);
          if (!target || !samples.collect(target)) return;
          ctx.discovery.onLifeScan(target.def.name, e.firstTime, `sample/${target.def.id}`);
          ctx.journal.focus(`sample:${target.def.id}`);
          ctx.bus.emit('discovery:sample', {
            landmarkId: e.landmarkId,
            sampleId: target.def.id,
            name: target.def.name,
          });
          ctx.progress.award('sample', `${e.landmarkId}/${target.def.id}`);
        }),
        ctx.bus.on('mission:restart', () => {
          samples.reset();
          witnessed.clear();
          scheduler.reset();
          ctx.guidance.offer('event', 'discovery', null);
          sampling = false;
          effect.visible = false;
        }),
        ctx.bus.on('app:state', ({ state }) => {
          if (state !== 'dive') ctx.guidance.offer('event', 'discovery', null);
        }),
      );
    },
    frame: {
      'world.life': (f, ctx) => {
        if (!ready) return;
        const dt = f.blocked || f.frozen ? 0 : f.clockDt;
        const ground = ctx.terrain.sampleHeight(f.pilotPosition.x, f.pilotPosition.z);
        const event = scheduler.update(dt, {
          site: ctx.contentLandmark,
          depthM: -f.pilotPosition.y,
          altitudeM: f.pilotPosition.y - ground,
        });
        if (event) announce(ctx, event);
        visual.update(scheduler.active);
        visual.group.visible &&= !f.blocked && ctx.app.state === 'dive';
        if (
          scheduler.active &&
          !eventWitnessed &&
          dt > 0 &&
          scheduler.active.elapsedS >= EXPLORE_CONFIG.eventWitnessDelayS &&
          secretInRange(f.pilotPosition, visual.origin, EXPLORE_CONFIG.eventWitnessM)
        ) {
          ctx.rig.camera.updateMatrixWorld();
          projected.copy(visual.origin).project(ctx.rig.camera);
          if (
            Math.abs(projected.x) < 1 &&
            Math.abs(projected.y) < 1 &&
            projected.z > -1 &&
            projected.z < 1
          ) {
            eventWitnessed = true;
            loggedAtS = scheduler.active.elapsedS;
            const kind = scheduler.active.kind;
            witnessed.add(kind);
            const id = eventDiscoveryId(kind);
            if (!ctx.discovery.store.isDiscovered(ctx.contentLandmark, id))
              ctx.discovery.store.record(ctx.contentLandmark, id);
            ctx.journal.focus(id);
            ctx.journal.refresh();
            ctx.bus.emit('event:witnessed', {
              landmarkId: ctx.contentLandmark,
              eventId: kind,
              kind,
            });
          }
        }
        const live = scheduler.active;
        const showing = !!live && !f.blocked && !f.frozen && live.elapsedS - loggedAtS < 3;
        ctx.guidance.offer(
          'event',
          'discovery',
          showing
            ? {
                kicker: 'SIGHTING',
                text: EVENT_CAPTIONS[live.kind],
                detail: eventWitnessed
                  ? 'Sighting logged in Journal'
                  : secretInRange(f.pilotPosition, visual.origin, EXPLORE_CONFIG.eventWitnessM)
                    ? undefined
                    : 'Get closer to log it',
                tone: 'cyan',
              }
            : null,
        );
        for (const [i, target] of targets.entries())
          meshes[i].visible = secretInRange(
            f.pilotPosition,
            target.position,
            EXPLORE_CONFIG.propCullM,
          );
        faint.length = 0;
        for (const target of secrets)
          if (
            !ctx.discovery.scanner.isScanned(target.landmarkId, target.id) &&
            secretInRange(f.pilotPosition, target.position)
          )
            faint.push(target);
        ctx.sonar.setFaintContacts(faint);
      },
      'scan.discovery': (f, ctx) => {
        const scanner = ctx.discovery.scanner;
        const target = sampleTargets.find((t) => t.id === scanner.view.activeId);
        const working = !!target && scanner.isScanning && !f.frozen && !f.blocked;
        if (working && !sampling) ctx.audio.playManipulator();
        sampling = working;
        effect.visible = working;
        if (working && target) {
          effect.position.copy(target.position);
          effect.rotation.y += f.dt * 0.7;
          effect.scale.setScalar(0.6 + scanner.view.progress);
        }
      },
    },
    dispose() {
      disposed = true;
      for (const off of disposers) off();
      for (const mesh of meshes) disposeExploreMesh(mesh);
      visual?.dispose();
      effect?.geometry.dispose();
      (effect?.material as THREE.Material | undefined)?.dispose();
      effect?.removeFromParent();
    },
  };
}
