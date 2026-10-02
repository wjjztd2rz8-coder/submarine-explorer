import * as THREE from 'three';
import { EXPLORE_CONFIG } from '../../core/config/explore.js';
import {
  EventScheduler,
  EVENT_CAPTIONS,
  type ExploreEvent,
  type ExploreEventKind,
} from '../../game/Events.js';
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
import { ExploreNotice } from '../../ui/ExploreNotice.js';
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
  let notice: ExploreNotice;
  let effect: THREE.Points;
  let ready = false;
  let disposed = false;
  let eventWitnessed = false;
  let sampling = false;
  const disposers: Array<() => void> = [];
  const faint: SecretTarget[] = [];
  let targets: Array<SecretTarget | SampleTarget> = [];
  const projected = new THREE.Vector3();

  const announce = (ctx: GameContext, event: ExploreEvent): void => {
    visual.begin(
      event,
      ctx.rov.deployed ? ctx.rov.position : ctx.sub.position,
      ctx.rov.deployed ? ctx.rov.forward : ctx.sub.getForward(),
      (x, z) => ctx.terrain.sampleHeight(x, z),
    );
    eventWitnessed = false;
    notice.show(EVENT_CAPTIONS[event.kind]);
    ctx.audio.playExploreCue();
  };
  return {
    name: 'explore',
    init(ctx) {
      visual = new EventsVisual(ctx.tier);
      notice = new ExploreNotice();
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
          events: [...witnessed].map((k) => EVENT_CAPTIONS[k]),
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
            announce(ctx, e);
            return true;
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
            optionalProgress()?.award('secret', `${e.landmarkId}/${secret.def.id}`);
            return;
          }
          const target = sampleTargets.find((t) => t.id === e.poiId);
          if (!target || !samples.collect(target)) return;
          ctx.discovery.onSampleCollected(`Sample collected · ${target.def.name}`);
          ctx.bus.emit('discovery:sample', {
            landmarkId: e.landmarkId,
            sampleId: target.def.id,
            name: target.def.name,
          });
          optionalProgress()?.award('sample', `${e.landmarkId}/${target.def.id}`);
        }),
        ctx.bus.on('mission:restart', () => {
          samples.reset();
          witnessed.clear();
          scheduler.reset();
          notice.clear();
          sampling = false;
          effect.visible = false;
        }),
        ctx.bus.on('app:state', ({ state }) => {
          if (state !== 'dive') notice.clear();
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
          secretInRange(f.pilotPosition, visual.origin, EXPLORE_CONFIG.eventWitnessM)
        ) {
          projected.copy(visual.origin).project(ctx.rig.camera);
          if (
            Math.abs(projected.x) < 1 &&
            Math.abs(projected.y) < 1 &&
            projected.z > -1 &&
            projected.z < 1
          ) {
            eventWitnessed = true;
            const kind = scheduler.active.kind;
            witnessed.add(kind);
            ctx.bus.emit('event:witnessed', {
              landmarkId: ctx.contentLandmark,
              eventId: kind,
              kind,
            });
            optionalProgress()?.award('event', `${ctx.contentLandmark}/${kind}`);
          }
        }
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
        notice.update(f.dt, f.blocked || f.frozen);
      },
      'scan.rovRangeRestore': (f, ctx) => {
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
      notice?.dispose();
      effect?.geometry.dispose();
      (effect?.material as THREE.Material | undefined)?.dispose();
      effect?.removeFromParent();
    },
  };
}
/** Reads the optional merge-time extension only after window.__game is published. */
function optionalProgress(): GameContext['progress'] | undefined {
  const game = (window as unknown as { __game?: { progress?: GameContext['progress'] } }).__game;
  return game?.progress;
}
