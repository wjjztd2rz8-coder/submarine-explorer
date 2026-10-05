// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box2, InstancedMesh, Matrix4, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { chooseFreeDiveHull, composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** Project the real visible hull, including instanced parts, without a renderer. */
function hullScreenBounds(
  root: Mesh | import('three').Group,
  rig: CameraRig,
  width: number,
  height: number,
): Box2 {
  const bounds = new Box2();
  const instance = new Matrix4();
  const world = new Matrix4();
  const point = new Vector3();
  const pixel = new Vector2();
  root.updateMatrixWorld(true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const vertices = object.geometry.getAttribute('position');
    const count = object instanceof InstancedMesh ? object.count : 1;
    for (let i = 0; i < count; i++) {
      if (object instanceof InstancedMesh) object.getMatrixAt(i, instance);
      else instance.identity();
      world.multiplyMatrices(object.matrixWorld, instance);
      for (let j = 0; j < vertices.count; j++) {
        point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(rig.camera);
        bounds.expandByPoint(pixel.set(((point.x + 1) * width) / 2, ((1 - point.y) * height) / 2));
      }
    }
  });
  return bounds;
}

describe('650 Beebe opening scan contact stays clear of the submarine', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    it(`${tier}: target reticle and whole hull fit desktop, touch landscape and portrait`, async () => {
      const site = 'beebe-vent-field';
      const config = makeConfig();
      // The height sampler keeps tier noise; mesh tessellation is unused here.
      config.terrain.tiers[tier].detailSubdiv = 1;
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      const hull = chooseFreeDiveHull(
        config.submarine.hullClasses,
        meta.min_m,
        config.submarine.freeDiveHullMarginM,
      )!;
      const sub = new SubMesh({ length: 26, hullClass: hull.classId, tier });
      try {
        await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
        expect(props.stats.failed).toBe(0);
        const pose = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(config),
          hull.hull.ratedDepth,
          config.camera,
        )!;
        expect(pose).not.toBeNull();
        const position = new Vector3(pose.x, pose.y, pose.z);
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const target = pois.reduce((a, b) =>
          a.position.distanceTo(position) < b.position.distanceTo(position) ? a : b,
        );
        expect(target.id).toBe('bvf-main-vents');
        expect(target.position.distanceTo(position)).toBeLessThan(target.radius);
        expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
          false,
        );
        sub.setView('chase');
        sub.setPose(position, pose.yaw, 0, 0);
        for (const [width, height] of [
          [1600, 900],
          [844, 390],
          [360, 640],
        ]) {
          const rig = new CameraRig(config.camera, width / height, terrain);
          rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
          rig.snap(position, pose.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          const point = target.position.clone().project(rig.camera);
          expect(Math.abs(point.x)).toBeLessThan(0.9);
          expect(Math.abs(point.y)).toBeLessThan(0.85);
          expect(point.z).toBeGreaterThan(-1);
          expect(point.z).toBeLessThan(1);
          const bounds = hullScreenBounds(sub.group, rig, width, height);
          expect(bounds.min.x).toBeGreaterThanOrEqual(0);
          expect(bounds.min.y).toBeGreaterThanOrEqual(0);
          expect(bounds.max.x).toBeLessThanOrEqual(width);
          expect(bounds.max.y).toBeLessThanOrEqual(height);
          const targetPixel = new Vector2(
            ((point.x + 1) * width) / 2,
            ((1 - point.y) * height) / 2,
          );
          // Clear the complete reticle, with 8 CSS px breathing room.
          const half = config.scan.reticleSizePx / 2 + 8;
          const reticle = new Box2(
            targetPixel.clone().addScalar(-half),
            targetPixel.clone().addScalar(half),
          );
          expect(bounds.intersectsBox(reticle), `${width}×${height}: target overlaps hull`).toBe(
            false,
          );
          const ray = new Raycaster();
          ray.setFromCamera(new Vector2(point.x, point.y), rig.camera);
          expect(
            ray.intersectObject(sub.vehicle.root, true),
            `${width}×${height}: hull blocks target sightline`,
          ).toHaveLength(0);
          rig.resetView();
          rig.snap(position, pose.yaw, 0);
          expect(hullScreenBounds(sub.group, rig, width, height)).toEqual(bounds);
        }
      } finally {
        sub.dispose();
        terrain.dispose();
      }
    });
  }
});
