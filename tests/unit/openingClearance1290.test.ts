// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('1290 merged opening camera clearance', () => {
  for (const site of ['endurance', 'lost-city']) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${site} ${tier}: eye, near plane and complete arm clear terrain and props at desktop/phone sizes`, async () => {
        const config = makeConfig();
        const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const terrain = new Terrain(
          {
            meta,
            heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
          },
          config.terrain,
          tier,
        );
        const props = new Props(meta, terrain, config.props, tier);
        try {
          await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
          expect(props.stats.failed).toBe(0);
          const pose = composedFreeDiveSpawn(
            site,
            meta,
            terrain,
            props,
            spawnSettings(config),
            -6500,
            config.camera,
          )!;
          expect(pose).not.toBeNull();
          expect(pose.chaseRadius).toBe(site === 'endurance' ? 70 : 66);
          const position = new Vector3(pose.x, pose.y, pose.z);
          for (const [width, height] of [
            [1600, 900],
            [390, 844],
            [844, 390],
          ]) {
            const rig = new CameraRig(config.camera, width / height, terrain);
            rig.setPhoneLandscape(width === 844);
            rig.setChaseRadiusDefault(
              pose.chaseRadius,
              pose.chaseOffsetX,
              pose.chaseOffsetY,
              pose.portraitChaseOffset,
            );
            rig.snap(position, pose.yaw, 0);
            rig.camera.updateMatrixWorld(true);
            const eye = rig.camera.position;
            expect(eye.y - terrain.sampleHeight(eye.x, eye.z)).toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-8,
            );
            expect(props.collide(eye.clone(), config.camera.near, new Vector3())).toBe(false);
            // Check the whole plane, rather than only the eye or four corners.
            for (const x of [-1, 0, 1])
              for (const y of [-1, 0, 1]) {
                const p = new Vector3(x, y, -1).unproject(rig.camera);
                expect(p.y - terrain.sampleHeight(p.x, p.z)).toBeGreaterThan(0);
                expect(props.collide(p, config.camera.near, new Vector3())).toBe(false);
              }
            for (let step = 0; step <= 100; step++) {
              const p = position.clone().lerp(eye, step / 100);
              expect(p.y - terrain.sampleHeight(p.x, p.z)).toBeGreaterThan(0);
              expect(props.collide(p, 1, new Vector3())).toBe(false);
            }
            // Independent surface ray catches meshes a collision proxy could omit.
            terrain.group.updateMatrixWorld(true);
            props.group.updateMatrixWorld(true);
            const arm = eye.clone().sub(position);
            const ray = new Raycaster(position, arm.clone().normalize(), 0, arm.length());
            expect(ray.intersectObject(terrain.group, true)).toHaveLength(0);
            expect(ray.intersectObject(props.group, true)).toHaveLength(0);
            console.log(
              JSON.stringify({
                site,
                tier,
                viewport: [width, height],
                eye: eye.toArray(),
                clearanceM: eye.y - terrain.sampleHeight(eye.x, eye.z),
              }),
            );
          }
        } finally {
          terrain.dispose();
        }
      });
    }
  }
});
