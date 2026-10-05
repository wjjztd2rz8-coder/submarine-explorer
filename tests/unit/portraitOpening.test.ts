// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Box2, InstancedMesh, Mesh, Vector2, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { chooseFreeDiveHull, composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const rect = (x: number, y: number, width: number, height: number) =>
  new Box2(new Vector2(x, y), new Vector2(x + width, y + height));

// Envelopes from the external 610 DOM dumps at 390×844, with the contact
// stack now below telemetry in that same right column. Browser specs retain
// their exact live-rectangle assertions; these are headless framing guards.
const obstacles = [
  rect(12, 12, 156, 314),
  rect(180, 72, 198, 116.2),
  rect(180, 200, 198, 160),
  rect(12, 640, 105.5, 44),
  rect(11.2, 728.8, 104, 104),
  rect(322.8, 692.8, 56, 140),
  rect(209.2, 676, 102.4, 156.8),
  rect(330, 12, 48, 48),
];

for (const site of [
  'titanic',
  'lost-city',
  'great-blue-hole',
  'beebe-vent-field',
  'monterey-canyon',
]) {
  test(`${site}: real Low opening hull fits the portrait HUD lane and survives rotation/reset`, async () => {
    const config = makeConfig();
    config.terrain.tiers.low.detailSubdiv = 1;
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
    const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
    const props = new Props(meta, terrain, config.props, 'low');
    const hull = chooseFreeDiveHull(
      config.submarine.hullClasses,
      meta.min_m,
      config.submarine.freeDiveHullMarginM,
    )!;
    const sub = new SubMesh({ length: 26, hullClass: hull.classId, tier: 'low' });
    try {
      await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
      const pose = composedFreeDiveSpawn(
        site,
        meta,
        terrain,
        props,
        spawnSettings(config),
        hull.hull.ratedDepth,
        config.camera,
      )!;
      const position = new Vector3(pose.x, pose.y, pose.z);
      sub.setPose(position, pose.yaw, 0, 0);
      sub.group.updateMatrixWorld(true);
      const rig = new CameraRig(config.camera, 390 / 844, terrain);
      rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
      const bounds = () => {
        rig.snap(position, pose.yaw, 0);
        rig.camera.updateMatrixWorld(true);
        const result = new Box2();
        sub.vehicle.root.traverseVisible((object) => {
          if (!(object instanceof Mesh)) return;
          let box;
          if (object instanceof InstancedMesh) {
            object.computeBoundingBox();
            box = object.boundingBox;
          } else {
            object.geometry.computeBoundingBox();
            box = object.geometry.boundingBox;
          }
          if (!box || box.isEmpty()) return;
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                const point = new Vector3(x, y, z)
                  .applyMatrix4(object.matrixWorld)
                  .project(rig.camera);
                expect(point.z).toBeGreaterThan(-1);
                expect(point.z).toBeLessThan(1);
                result.expandByPoint(new Vector2((point.x + 1) * 195, (1 - point.y) * 422));
              }
        });
        return result;
      };
      const opening = bounds();
      expect(opening.isEmpty()).toBe(false);
      expect(rect(0, 0, 390, 844).containsBox(opening), JSON.stringify(opening)).toBe(true);
      for (const obstacle of obstacles)
        expect(opening.intersectsBox(obstacle), JSON.stringify({ opening, obstacle })).toBe(false);
      const cameraPosition = rig.camera.position.clone();
      rig.setAspect(844 / 390);
      rig.snap(position, pose.yaw, 0);
      expect(rig.camera.fov).toBe(config.camera.fovDeg);
      expect(rig.camera.position).toEqual(cameraPosition);
      rig.setAspect(390 / 844);
      rig.resetView();
      expect(bounds()).toEqual(opening);
    } finally {
      sub.dispose();
      terrain.dispose();
    }
  });
}
