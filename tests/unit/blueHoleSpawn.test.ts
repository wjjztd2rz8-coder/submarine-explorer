// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

for (const tier of ['low', 'high'] as const) {
  it(`Blue Hole ${tier}: both modes clear the wall with the authored chase tilt at both touch sizes`, async () => {
    const config = makeConfig();
    const meta = read('data/tiles/great-blue-hole/meta.json') as TileMeta;
    const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      tier,
    );
    const props = new Props(meta, terrain, config.props, tier);
    const sub = new SubMesh({ length: 26, hullClass: 'B', tier });
    try {
      await props.placeAll(read('data/landmarks/great-blue-hole/props.json'), meta.id);
      expect(props.stats).toMatchObject({ count: 2, failed: 0, skipped: 0 });
      for (const mode of ['arcade', 'realistic'] as const) {
        const pose = composedFreeDiveSpawn(
          meta.id,
          meta,
          terrain,
          props,
          spawnSettings(config),
          -6000,
          config.camera,
          mode,
        )!;
        expect(pose).not.toBeNull();
        expect(pose.chaseOffsetY).toBe(22);
        const position = new Vector3(pose.x, pose.y, pose.z);
        expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
          false,
        );
        sub.setPose(position, pose.yaw, 0, 0);
        sub.vehicle.root.updateWorldMatrix(true, true);
        let vertices = 0;
        let minClearance = Infinity;
        sub.vehicle.root.traverseVisible((object) => {
          if (!(object instanceof Mesh)) return;
          const attribute = object.geometry.getAttribute('position');
          const instance = new Matrix4();
          const count = object instanceof InstancedMesh ? object.count : 1;
          for (let j = 0; j < count; j++) {
            if (object instanceof InstancedMesh) object.getMatrixAt(j, instance);
            else instance.identity();
            const transform = object.matrixWorld.clone().multiply(instance);
            for (let i = 0; i < attribute.count; i++) {
              const p = new Vector3().fromBufferAttribute(attribute, i).applyMatrix4(transform);
              minClearance = Math.min(minClearance, p.y - terrain.sampleHeight(p.x, p.z));
              vertices++;
            }
          }
        });
        expect(vertices).toBeGreaterThan(100);
        expect(minClearance, `${mode} hull vertex inside terrain`).toBeGreaterThan(0);
        for (const aspect of [844 / 390, 390 / 844]) {
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
          rig.snap(position, pose.yaw, 0);
          const eye = rig.camera.position;
          expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
          expect(eye.y).toBeGreaterThanOrEqual(
            terrain.sampleHeight(eye.x, eye.z) + config.camera.terrainClearance - 1e-8,
          );
          expect(props.collide(eye.clone(), 1, new Vector3())).toBe(false);
          rig.camera.updateMatrixWorld(true);
          for (const x of [-1, 1])
            for (const y of [-1, 1]) {
              const corner = new Vector3(x, y, -1).unproject(rig.camera);
              expect(corner.y).toBeGreaterThan(terrain.sampleHeight(corner.x, corner.z));
            }
          const initialEye = eye.clone();
          rig.orbit(0.3, -0.1, 0.2);
          rig.resetView();
          rig.snap(position, pose.yaw, 0);
          expect(eye.distanceTo(initialEye)).toBeLessThan(1e-6);
        }
      }
    } finally {
      sub.dispose();
      terrain.dispose();
    }
  }, 20_000);
}
