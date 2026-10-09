// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Box2, InstancedMesh, Mesh, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
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
