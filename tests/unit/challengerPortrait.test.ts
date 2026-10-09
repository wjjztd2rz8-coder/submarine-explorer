// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, test } from 'vitest';
import { Box2, InstancedMesh, Matrix4, Mesh, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { chooseFreeDiveHull, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const measurements: unknown[] = [];
afterAll(() => {
  mkdirSync('.cache', { recursive: true });
  writeFileSync(
    '.cache/f1020-opening-measurements.json',
    JSON.stringify(measurements, null, 2) + '\n',
  );
});

for (const site of [
  'challenger-deep',
  'endurance',
  'hunga-tonga-caldera',
  'axial-seamount-ashes',
]) {
  test(`${site}: Low portrait opening is level, centred and shows the seabed`, async () => {
    const config = makeConfig();
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
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
      expect(pose).not.toBeNull();
      const position = new Vector3(pose.x, pose.y, pose.z);
      const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
      const right = new Vector3(Math.cos(pose.yaw), 0, Math.sin(pose.yaw));
      sub.setPose(position, pose.yaw, 0, 0);
      sub.group.updateMatrixWorld(true);
      for (const [width, height] of [
        [390, 844],
        [360, 640],
      ]) {
        const rig = new CameraRig(config.camera, width / height, terrain);
        rig.setChaseRadiusDefault(
          pose.chaseRadius,
          pose.chaseOffsetX,
          pose.chaseOffsetY,
          pose.portraitChaseOffset,
        );
        rig.snap(position, pose.yaw, 0);
        rig.camera.updateMatrixWorld(true);
        const bounds = new Box2();
        const matrix = new Matrix4();
        const world = new Matrix4();
        const point = new Vector3();
        sub.group.traverseVisible((object) => {
          if (!(object instanceof Mesh)) return;
          const vertices = object.geometry.getAttribute('position');
          for (let i = 0; i < (object instanceof InstancedMesh ? object.count : 1); i++) {
            if (object instanceof InstancedMesh) object.getMatrixAt(i, matrix);
            else matrix.identity();
            world.multiplyMatrices(object.matrixWorld, matrix);
            for (let j = 0; j < vertices.count; j++) {
              point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(rig.camera);
              expect(point.z).toBeGreaterThan(-1);
              expect(point.z).toBeLessThan(1);
              bounds.expandByPoint(
                new Vector2(((point.x + 1) * width) / 2, ((1 - point.y) * height) / 2),
              );
            }
          }
        });
        expect(bounds.min.x).toBeGreaterThan(12);
        expect(bounds.max.x).toBeLessThan(width - 12);
        expect(bounds.min.y).toBeGreaterThan(211);
        expect(bounds.max.y).toBeLessThan(height * 0.79);
        expect(bounds.getCenter(new Vector2()).x).toBeCloseTo(width / 2, 4);
        const port = position.clone().addScaledVector(right, -4).project(rig.camera);
        const starboard = position.clone().addScaledVector(right, 4).project(rig.camera);
        expect(port.y).toBeCloseTo(starboard.y, 8);
        const floor = position.clone().addScaledVector(forward, 30);
        floor.y = terrain.sampleHeight(floor.x, floor.z);
        const seabedNdc = floor.project(rig.camera);
        expect(Math.abs(seabedNdc.x)).toBeLessThan(0.9);
        expect(Math.abs(seabedNdc.y)).toBeLessThan(0.9);
        expect(seabedNdc.z).toBeGreaterThan(-1);
        expect(seabedNdc.z).toBeLessThan(1);
        expect(rig.camera.position.y).toBeGreaterThanOrEqual(
          terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z) +
            config.camera.terrainClearance,
        );
        expect(rig.camera.position.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
        for (let i = 1; i <= 6; i++)
          expect(
            props.collide(position.clone().lerp(rig.camera.position, i / 6), 6, new Vector3()),
            'portrait chase arm clear of props',
          ).toBe(false);
        const eye = rig.camera.position.clone();
        rig.setAspect(844 / 390);
        rig.snap(position, pose.yaw, 0);
        rig.setAspect(width / height);
        rig.orbit(0.2, 0.1, 0.2);
        rig.resetView();
        rig.snap(position, pose.yaw, 0);
        expect(rig.camera.position).toEqual(eye);
        measurements.push({
          site,
          viewport: [width, height],
          hull: hull.classId,
          subBounds: [bounds.min.toArray(), bounds.max.toArray()],
          seabedNdc: seabedNdc.toArray(),
          camera: eye.toArray(),
        });
      }
    } finally {
      sub.dispose();
      terrain.dispose();
    }
  });
}
