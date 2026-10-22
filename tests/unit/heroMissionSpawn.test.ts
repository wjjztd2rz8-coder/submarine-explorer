// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import { Box2, InstancedMesh, Mesh, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { InputState } from '../../src/core/Input.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { isEntryUnlocked, loadJournalSite } from '../../src/game/JournalData.js';
import { PropContact } from '../../src/world/props/Wiring.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { hullClearance } from './helpers/hullClearance.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
  missionApproachScanRadius,
  MISSION_APPROACH_M,
} from '../../src/game/Spawn.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const heroes = [
  { site: 'titanic', primary: ['find-bow', 'find-stern'], before: ['find-bow', 'find-stern'] },
  {
    site: 'lost-city',
    primary: ['find-poseidon', 'imax-tower'],
    before: ['find-poseidon', 'imax-tower'],
  },
  {
    site: 'great-blue-hole',
    primary: ['stalactites', 'stalactites-east'],
    before: ['outer-dropoff', 'western-dropoff'],
  },
  { site: 'beebe-vent-field', primary: ['main-vents', 'shrimp'], before: ['main-vents', 'shrimp'] },
  {
    site: 'monterey-canyon',
    primary: ['canyon-wall', 'canyon-axis'],
    before: ['canyon-head', 'upper-channel'],
  },
];
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const audit: unknown[] = [];
afterAll(() => {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
  if (env?.F_VERIFY_1000_AUDIT === '1')
    writeFileSync('.cache/verify-1000-missions.json', JSON.stringify(audit, null, 2) + '\n');
});

for (const { site, primary, before } of heroes) {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${site} ${tier}: mission opens on a safe approach outside scan range`, async () => {
      const config = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        config.terrain,
        tier,
      );
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const content = json(`data/landmarks/${site}/props.json`);
        content.props = content.props.filter((p: { model: string }) =>
          p.model.startsWith('procedural:'),
        );
        await props.placeAll(content, site);
        expect(props.stats.failed).toBe(0);
        const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        const objectives = mission.objectives.filter((o) => o.primary);
        expect(objectives.map((o) => o.id)).toEqual(primary);
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const primaries = objectives.map((o) => pois.find((p) => o.poi === p.id)!);
        const safeDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
        const poseFor = (targets: typeof primaries) =>
          composedMissionSpawn(
            site,
            targets,
            meta,
            terrain,
            props,
            spawnSettings(config),
            safeDepth,
            config.camera,
          )!;
        const free = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(config),
          safeDepth,
          config.camera,
        )!;
        expect(free).not.toBeNull();
        const pose = poseFor(primaries);
        expect(pose).not.toBeNull();
        expect(pose).not.toEqual(free);
        const first = pois.find((p) => p.id === objectives[0].poi)!;
        const range = Math.hypot(
          first.position.x - pose.x,
          first.position.y - pose.y,
          first.position.z - pose.z,
        );
        expect(range).toBeCloseTo(MISSION_APPROACH_M[site], 2);
        expect(range).toBeGreaterThanOrEqual(150);
        expect(range).toBeLessThanOrEqual(300);
        expect(range).toBeGreaterThan(missionApproachScanRadius(site, first.radius) * 2);
        const toTarget = first.position
          .clone()
          .sub(new Vector3(pose.x, pose.y, pose.z))
          .setY(0)
          .normalize();
        expect(
          new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)).dot(toTarget),
        ).toBeGreaterThan(0.999);
        expect(
          props.collide(
            new Vector3(pose.x, pose.y, pose.z),
            config.submarine.hullRadius + 4,
            new Vector3(),
          ),
        ).toBe(false);
        expect(pose.y).toBeGreaterThanOrEqual(safeDepth + config.submarine.hullRadius);

        if (site === 'titanic') {
          const sub = new SubMesh({ length: 26, hullClass: mission.hull_class!, tier });
          try {
            const position = new Vector3(free.x, free.y, free.z);
            sub.setPose(position, free.yaw, 0, 0);
            sub.group.updateMatrixWorld(true);
            const rig = new CameraRig(config.camera, 16 / 9, terrain);
            rig.setChaseRadiusDefault(free.chaseRadius, free.chaseOffsetX, free.chaseOffsetY);
            const openingRadius = free.chaseRadius!;
            expect(pose.chaseRadius, 'mission keeps the global reset radius').toBeUndefined();
            expect(rig.chaseRadius).toBe(openingRadius);
            rig.snap(position, free.yaw, 0);
            rig.camera.updateMatrixWorld(true);
            const openingEye = rig.camera.position.clone();
            const screenHull = new Box2();
            // Hidden headlight cones extend far beyond the hull. Project only
            // visible meshes, keeping instanced fittings in their actual bounds.
            sub.vehicle.root.traverseVisible((object) => {
              if (!(object instanceof Mesh)) return;
              let bounds;
              if (object instanceof InstancedMesh) {
                object.computeBoundingBox();
                bounds = object.boundingBox;
              } else {
                object.geometry.computeBoundingBox();
                bounds = object.geometry.boundingBox;
              }
              if (!bounds || bounds.isEmpty()) return;
              for (const x of [bounds.min.x, bounds.max.x])
                for (const y of [bounds.min.y, bounds.max.y])
                  for (const z of [bounds.min.z, bounds.max.z]) {
                    const projected = new Vector3(x, y, z)
                      .applyMatrix4(object.matrixWorld)
                      .project(rig.camera);
                    screenHull.expandByPoint(new Vector2(projected.x, projected.y));
                  }
            });
            const view = new Box2(new Vector2(-0.95, -0.95), new Vector2(0.95, 0.95));
            expect(view.containsBox(screenHull), 'whole submarine inside view').toBe(true);
            const hero = props.placed.find((prop) => prop.def.id === 'bow-hull')!;
            hero.root.updateMatrixWorld(true);
            const hullMesh = hero.full.getObjectByName('titanic-bow-hull') as Mesh;
            const vertices = hullMesh.geometry.getAttribute('position');
            const bow = new Box2();
            for (let i = 0; i < vertices.count; i++) {
              const point = new Vector3()
                .fromBufferAttribute(vertices, i)
                .applyMatrix4(hullMesh.matrixWorld)
                .project(rig.camera);
              bow.expandByPoint(new Vector2(point.x, point.y));
            }
            expect(view.containsBox(bow), 'whole bow hull inside view').toBe(true);
            const contact = new Vector3(
              first.position.x,
              first.position.y,
              first.position.z,
            ).project(rig.camera);
            expect(Math.abs(contact.x), 'bow scan contact inside view').toBeLessThan(0.95);
            expect(Math.abs(contact.y), 'bow scan contact inside view').toBeLessThan(0.95);
            expect(contact.z).toBeGreaterThan(-1);
            expect(contact.z).toBeLessThan(1);
            expect(
              screenHull.expandByScalar(0.02).containsPoint(new Vector2(contact.x, contact.y)),
              'bow scan contact clears the submarine silhouette',
            ).toBe(false);
            rig.orbit(0.2, 0.1, 0.5);
            expect(rig.chaseRadius).toBeGreaterThan(openingRadius);
            rig.resetView();
            expect(rig.chaseRadius).toBe(openingRadius);
            rig.snap(position, free.yaw, 0);
            expect(rig.camera.position).toEqual(openingEye);
          } finally {
            sub.dispose();
          }
        }

        // Retain the original hero routes; Monterey also exercises the runtime
        // contact stage and resolved equipment before the beam sees the position.
        for (const runtimeContacts of site === 'monterey-canyon' ? [false, true] : [false]) {
          const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
          // Exercise actual Arcade physics and scanner time, rather than infer
          // accessibility from distance or teleport the pilot to the contact.
          const sub = new Submarine(config.submarine, terrain);
          sub.setHullClass(mission.hull_class!);
          sub.setConfig(
            runtimeContacts
              ? effective.submarine
              : { ...config.submarine, ...config.speedProfiles.fast },
          );
          sub.reset(pose.x, pose.y, pose.z, pose.yaw);
          const mesh = new SubMesh({ length: 26, hullClass: mission.hull_class!, tier });
          mesh.setView('chase');
          mesh.setPose(sub.position, sub.yaw, sub.pitch, sub.roll);
          const visualClearance = hullClearance(mesh.group, terrain);
          mesh.dispose();
          expect(visualClearance, 'visible hull clears the terrain at the opening').toBeGreaterThan(
            0,
          );
          const bus = new EventBus();
          const run = new Mission({ def: mission, bus });
          run.resolve(pois.map((p) => p.id));
          run.start(site);
          const saved = new Map<string, string>();
          const storage = {
            getItem: (key: string) => saved.get(key) ?? null,
            setItem: (key: string, value: string) => {
              saved.set(key, value);
            },
          };
          const store = new DiscoveryStore(storage);
          const scanConfig = runtimeContacts ? effective.scan : config.scan;
          const scanner = new Scanner(scanConfig, bus, runtimeContacts ? store : null);
          const multiplier = runtimeContacts
            ? effective.sensor.scanRadiusMultiplier
            : config.sensorPresets.extended.scanRadiusMultiplier;
          const contact = new PropContact(props, bus, config.props, config.submarine.hullRadius);
          let contactFrames = 0;
          let correctionM = 0;
          let maximumStress = 0;
          const beforeContact = new Vector3();
          scanner.setTargets(
            pois.map((p) => ({
              ...p,
              radius: runtimeContacts
                ? resolveScanRadius(
                    (objectives.some((o) => o.poi === p.id)
                      ? missionApproachScanRadius(site, p.radius)
                      : p.radius) * multiplier,
                    scanConfig,
                  )
                : missionApproachScanRadius(site, p.radius) * multiplier,
            })),
          );
          const input = {
            throttle: 0,
            yaw: 0,
            pitch: 0,
            ballast: 0,
            lookDx: 0,
            lookDy: 0,
            toggleCamera: false,
            toggleSonar: false,
            toggleLights: false,
            scan: true,
            cycleSimSpeed: false,
            togglePhotoMode: false,
          } satisfies InputState;
          const scanRadius = runtimeContacts
            ? resolveScanRadius(
                missionApproachScanRadius(site, first.radius) * multiplier,
                scanConfig,
              )
            : missionApproachScanRadius(site, first.radius) * multiplier;
          if (runtimeContacts) {
            expect(range, 'resolved sensors still require an approach').toBeGreaterThan(scanRadius);
            expect(store.isDiscovered(site, first.id)).toBe(false);
          }
          let completedAt: number | null = null;
          let minimumClearance = Infinity;
          const rigs = [1600 / 900, 390 / 844].map((aspect) => {
            const rig = new CameraRig(config.camera, aspect, terrain);
            rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
            return rig;
          });
          for (let tick = 0; tick < 7200; tick++) {
            const delta = first.position.clone().sub(sub.position);
            input.throttle = delta.length() > scanRadius * 0.8 ? 1 : 0;
            const desiredYaw = Math.atan2(delta.x, -delta.z);
            input.yaw = Math.max(
              -1,
              Math.min(
                1,
                Math.atan2(Math.sin(desiredYaw - sub.yaw), Math.cos(desiredYaw - sub.yaw)),
              ),
            );
            const desiredPitch = Math.atan2(delta.y, Math.hypot(delta.x, delta.z));
            input.pitch = Math.max(-1, Math.min(1, (desiredPitch - sub.pitch) * 4));
            // Close in, then trim depth: a gallery may need the sub below its minimum depth.
            input.ballast =
              Math.hypot(delta.x, delta.z) < scanRadius * 0.8
                ? Math.max(-1, Math.min(1, (delta.y + 16) / 10))
                : 0;
            sub.step(input, 1 / 60);
            if (runtimeContacts) {
              // Runtime sim.contact follows sim.vehicles once per frame. This
              // fixture uses one fixed physics step per 60 Hz frame at 1x.
              beforeContact.copy(sub.position);
              if (contact.resolve(sub, 1 / 60)) contactFrames++;
              correctionM += beforeContact.distanceTo(sub.position);
              maximumStress = Math.max(maximumStress, sub.getState().hullStress);
              scanner.setObjective(
                run.objectives.find((o) => o.primary && !o.complete)?.poiId ?? null,
              );
            }
            scanner.update(1 / 60, sub.position, sub.getForward(), input.scan);
            run.update(1 / 60);
            if (completedAt === null && scanner.isScanned(site, first.id))
              completedAt = (tick + 1) / 60;
            minimumClearance = Math.min(
              minimumClearance,
              sub.position.y - terrain.sampleHeight(sub.position.x, sub.position.z),
            );
            if (tick % 60 === 0)
              for (const rig of rigs) {
                rig.snap(sub.position, sub.yaw, sub.pitch);
                expect(
                  rig.camera.position.y -
                    terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
                ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
              }
          }
          expect(
            completedAt,
            'first primary can be scanned after navigating the approach',
          ).not.toBeNull();
          expect(completedAt!).toBeLessThanOrEqual(120);
          expect(run.objectives[0].complete).toBe(true);
          expect(sub.hullBreached).toBe(false);
          expect(minimumClearance).toBeGreaterThanOrEqual(
            config.submarine.hullRadius + config.submarine.seabedClearance - 1e-6,
          );
          audit.push({
            site,
            tier,
            range,
            completedAt,
            transit: Math.hypot(sub.position.x - pose.x, sub.position.z - pose.z),
            minimumClearance,
            visualClearance,
          });
          console.log(
            `VERIFY-1000 ${site} ${tier}: scan=${completedAt}s transit=${Math.hypot(sub.position.x - pose.x, sub.position.z - pose.z).toFixed(1)}m minClearance=${minimumClearance.toFixed(2)}m`,
          );
          if (runtimeContacts) {
            expect(completedAt!).toBeGreaterThan(first.scanSeconds);
            expect(store.get(site, first.id)?.count).toBe(1);
            expect(store.isDiscovered(site, first.id), 'real scan records the discovery').toBe(
              true,
            );
            const journal = await loadJournalSite(site, new Map(), async (url) => {
              try {
                const text = readFileSync(url.replace(/^\//, ''), 'utf8');
                return { ok: true, text: async () => text };
              } catch {
                return { ok: false, status: 404, text: async () => '' };
              }
            });
            const entry = journal.entries.find((e) => e.id === first.guideEntry)!;
            expect(entry.poiIds).toContain(first.id);
            expect(isEntryUnlocked(journal, entry, new DiscoveryStore(storage))).toBe(true);
            expect(run.objectives[1].complete, 'first scan does not grant the canyon floor').toBe(
              false,
            );
            expect(sub.getState().hullClass).toBe(mission.hull_class);
            expect(maximumStress).toBe(0);
            console.log(
              `MISSION-CONTACT ${site} ${tier}: scan=${completedAt}s contactFrames=${contactFrames} correction=${correctionM}m discovery=${first.id} journal=${entry.id}`,
            );
          }
          run.dispose();
        }

        // Keep the old primary selection measurable for the progress note.
        const oldObjectives = before.map((id) => mission.objectives.find((o) => o.id === id)!);
        const oldPrimaries = pois.filter((p) => oldObjectives.some((o) => o.poi === p.id));
        const oldPose = poseFor(oldPrimaries);
        const oldFirst = pois.find((p) => p.id === oldObjectives[0].poi)!;
        const oldRange = Math.hypot(
          oldFirst.position.x - oldPose.x,
          oldFirst.position.y - oldPose.y,
          oldFirst.position.z - oldPose.z,
        );
        const oldDelta = Math.hypot(oldPose.x - free.x, oldPose.y - free.y, oldPose.z - free.z);
        console.log(
          `MISSION-HERO ${site} ${tier}: beforeFirst=${oldRange.toFixed(2)} beforeFreeDelta=${oldDelta.toFixed(2)} afterFirst=${range.toFixed(2)} afterFreeDelta=${Math.hypot(pose.x - free.x, pose.y - free.y, pose.z - free.z).toFixed(2)}`,
        );
      } finally {
        terrain.dispose();
      }
    });
  }
}
