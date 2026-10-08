// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';
import poses from '../../tools/blue-hole-poses.json';

describe('Blue Hole wall relief preserves opening and golden approaches', () => {
  for (const tier of ['low', 'high'] as const) {
    it(`${tier}: keeps the first-target approach and all five canonical poses clear`, async () => {
      const cfg = makeConfig();
      const meta = JSON.parse(
        readFileSync('data/tiles/great-blue-hole/meta.json', 'utf8'),
      ) as TileMeta;
      const bytes = readFileSync('data/tiles/great-blue-hole/heightmap.bin');
      const terrain = new Terrain(
        { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
        cfg.terrain,
        tier,
      );
      const galleries = new Props(meta, terrain, cfg.props, tier);
      const withWall = new Props(meta, terrain, cfg.props, tier);
      try {
        await galleries.placeAll(
          { ...doc, props: doc.props.filter((p) => p.id !== 'blue-hole-wall-relief') },
          'great-blue-hole',
        );
        await withWall.placeAll(doc, 'great-blue-hole');
        expect(withWall.stats.failed).toBe(0);
        expect(withWall.stats.skipped).toBe(0);
        const opening = (props: Props) =>
          composedFreeDiveSpawn(
            'great-blue-hole',
            meta,
            terrain,
            props,
            spawnSettings(cfg),
            -11000,
          );
        const original = opening(galleries)!;
        const updated = opening(withWall)!;
        expect(updated).toEqual(original);
        const spawn = new THREE.Vector3(updated.x, updated.y, updated.z);
        expect(withWall.collide(spawn.clone(), cfg.submarine.hullRadius, new THREE.Vector3())).toBe(
          false,
        );

        const rig = new CameraRig(cfg.camera, 16 / 9, terrain);
        rig.setChaseRadiusDefault(updated.chaseRadius, updated.chaseOffsetX, updated.chaseOffsetY);
        rig.snap(spawn, updated.yaw, 0);
        expect(withWall.collide(rig.camera.position.clone(), 0.3, new THREE.Vector3())).toBe(false);
        for (const [id, fixed] of [
          [
            'karst-grotto',
            {
              direction: [1, 0, 0],
              above: 5,
              approachRange: 40,
              target: null,
              close: { range: 36, above: 9, lateral: 10 },
            },
          ],
          ['karst-grotto-east', poses.east],
        ] as const) {
          const hero = withWall.placed.find((p) => p.def.id === id)!;
          hero.root.updateMatrixWorld(true);
          const target = hero.root.localToWorld(
            fixed.target
              ? new THREE.Vector3().fromArray(fixed.target)
              : hero.localBounds.getCenter(new THREE.Vector3()),
          );
          for (const close of [false, true]) {
            const range = close ? fixed.close.range : fixed.approachRange;
            const side = close ? fixed.close.lateral : 0;
            const [dx, , dz] = fixed.direction;
            const sub = new THREE.Vector3(
              target.x + dx * range - dz * side,
              hero.root.position.y + (close ? fixed.close.above : fixed.above),
              target.z + dz * range + dx * side,
            );
            const yaw = Math.atan2(target.x - sub.x, -(target.z - sub.z));
            const pitch = THREE.MathUtils.clamp(
              Math.atan2(target.y - sub.y, range),
              -cfg.submarine.maxPitch,
              cfg.submarine.maxPitch,
            );
            rig.resetView();
            rig.setMode('first-person');
            rig.snap(sub, yaw, pitch);
            const eye = rig.camera.position;
            rig.lookElevation =
              (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) -
                pitch) /
              0.55;
            rig.snap(sub, yaw, pitch);
            expect(sub.y - terrain.sampleHeight(sub.x, sub.z)).toBeGreaterThan(
              cfg.submarine.hullRadius,
            );
            expect(
              withWall.collide(sub.clone(), cfg.submarine.hullRadius, new THREE.Vector3()),
              `${id} ${close ? 'close' : 'approach'} submarine`,
            ).toBe(false);
            expect(
              withWall.collide(eye.clone(), 0.3, new THREE.Vector3()),
              `${id} ${close ? 'close' : 'approach'} camera`,
            ).toBe(false);
            rig.camera.updateMatrixWorld(true);
            const screen = target.clone().project(rig.camera);
            expect(Math.abs(screen.x)).toBeLessThan(0.9);
            expect(Math.abs(screen.y)).toBeLessThan(0.9);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
          }
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});
