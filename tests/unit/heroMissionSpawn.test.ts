// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it } from 'vitest';
import { Box2, InstancedMesh, Mesh, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import type { InputState } from '../../src/core/Input.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { hullClearance } from './helpers/hullClearance.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
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
    primary: ['stalactites', 'outer-dropoff'],
    before: ['outer-dropoff', 'western-dropoff'],
  },
  { site: 'beebe-vent-field', primary: ['main-vents', 'shrimp'], before: ['main-vents', 'shrimp'] },
  {
    site: 'monterey-canyon',
    primary: ['canyon-wall', 'upper-channel'],
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
    it(`${site} ${tier}: default mission shares free dive's opening and first primary is within 120 m`, async () => {
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
        const primaries = pois.filter((p) => objectives.some((o) => o.poi === p.id));
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
        // Includes the camera framing overrides as well as translation/yaw.
        expect(pose).toEqual(free);
        const first = pois.find((p) => p.id === objectives[0].poi)!;
        const range = Math.hypot(
          first.position.x - pose.x,
          first.position.y - pose.y,
          first.position.z - pose.z,
        );
        expect(range).toBeLessThanOrEqual(120);

        if (site === 'titanic') {
          const sub = new SubMesh({ length: 26, hullClass: mission.hull_class!, tier });
          try {
            const position = new Vector3(pose.x, pose.y, pose.z);
            sub.setPose(position, pose.yaw, 0, 0);
            sub.group.updateMatrixWorld(true);
            const rig = new CameraRig(config.camera, 16 / 9, terrain);
            rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
            const globalRadius = Math.hypot(
              config.camera.chaseOffset.x,
              config.camera.chaseOffset.y,
              config.camera.chaseOffset.z,
            );
            expect(pose.chaseRadius, 'Titanic inherits the global reset radius').toBeUndefined();
            expect(rig.chaseRadius).toBe(globalRadius);
            expect(rig.chaseRadius).toBeGreaterThan(95);
            rig.snap(position, pose.yaw, 0);
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
            expect(rig.chaseRadius).toBeGreaterThan(globalRadius);
            rig.resetView();
            expect(rig.chaseRadius).toBe(globalRadius);
            rig.snap(position, pose.yaw, 0);
            expect(rig.camera.position).toEqual(openingEye);
          } finally {
            sub.dispose();
          }
        }

        if (site === 'great-blue-hole' || site === 'monterey-canyon') {
          // Exercise actual Arcade physics and scanner time, rather than infer
          // accessibility from distance or teleport the pilot to the contact.
          const mode = config.settings.gameplayPresets.arcade;
          const sub = new Submarine(config.submarine, terrain);
          sub.setHullClass(mission.hull_class!);
          sub.applyProfiles(
            config.speedProfiles[mode.speedProfile],
            config.descentProfiles[mode.descentProfile],
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
          const scanner = new Scanner(config.scan, bus);
          const multiplier = config.sensorPresets[mode.sensors].scanRadiusMultiplier;
          scanner.setTargets(pois.map((p) => ({ ...p, radius: p.radius * multiplier })));
          const input = {
            throttle: 0,
            yaw: 0,
            pitch: 0,
            ballast: 0,
            lookDx: 0,
            lookDy: 0,
            toggleCamera: false,
            toggleSonar: false,
            boost: false,
            toggleLights: false,
            ping: false,
            scan: true,
            cycleSimSpeed: false,
            togglePhotoMode: false,
          } satisfies InputState;
          let completedAt: number | null = null;
          let minimumClearance = Infinity;
          const rigs = [1600 / 900, 390 / 844].map((aspect) => {
            const rig = new CameraRig(config.camera, aspect, terrain);
            rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
            return rig;
          });
          for (let tick = 0; tick < 3600; tick++) {
            sub.step(input, 1 / 60);
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
          expect(completedAt, 'first primary can be scanned without any transit').not.toBeNull();
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
            transit: 0,
            minimumClearance,
            visualClearance,
          });
          console.log(
            `VERIFY-1000 ${site} ${tier}: scan=${completedAt}s transit=0m minClearance=${minimumClearance.toFixed(2)}m`,
          );
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
          `MISSION-HERO ${site} ${tier}: beforeFirst=${oldRange.toFixed(2)} beforeFreeDelta=${oldDelta.toFixed(2)} afterFirst=${range.toFixed(2)} afterFreeDelta=0.00`,
        );
      } finally {
        terrain.dispose();
      }
    });
  }
}
