// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

/** Real sloping bathymetry and authored transforms expose buried wall-life seats. */
describe('Monterey wall life on surveyed terrain', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    it(`${tier}: wall colonies sit above the seabed and apron without removing the planted life`, async () => {
      const site = 'monterey-canyon';
      const config = makeConfig();
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        await props.load('props.json', site, async () => doc);
        expect(props.stats.failed).toBe(0);
        for (const hero of props.placed.filter((prop) => prop.def.feature === 'canyon-ledge')) {
          hero.root.updateMatrixWorld(true);
          const ranges: Record<string, { count: number; min: number; max: number }> = {};
          hero.full.traverse((object) => {
            const mesh = object as THREE.InstancedMesh;
            if (!mesh.isInstancedMesh) return;
            const range = { count: mesh.count, min: Infinity, max: -Infinity };
            const instance = new THREE.Matrix4();
            const world = new THREE.Matrix4();
            const position = new THREE.Vector3();
            for (let i = 0; i < mesh.count; i++) {
              mesh.getMatrixAt(i, instance);
              world.multiplyMatrices(hero.root.matrixWorld, instance);
              position.setFromMatrixPosition(world);
              const clearance = position.y - terrain.sampleHeight(position.x, position.z);
              range.min = Math.min(range.min, clearance);
              range.max = Math.max(range.max, clearance);
            }
            ranges[mesh.name] = range;
          });
          const life = Object.entries(ranges).filter(([name]) => name.startsWith('wall-'));
          expect(life.length, hero.def.id).toBe(5); // three sponge shapes and two coral shapes remain
          let count = 0;
          let colonies = 0;
          for (const [name, range] of Object.entries(ranges)) {
            count += range.count;
            expect(range.min, `${hero.def.id} ${name}`).toBeGreaterThan(-3);
            if (name.startsWith('wall-')) {
              colonies += range.count;
              expect(range.min, `${hero.def.id} ${name}: exposed seat`).toBeGreaterThan(0.11);
            }
            if (hero.def.id === 'canyon-wall-ledge') {
              // Retain the unchanged browser gate's upper and lower limits.
              expect(range.max, name).toBeLessThan(
                (hero.localBounds.max.y - hero.localBounds.min.y) * 0.5,
              );
            }
          }
          expect(count, hero.def.id).toBeGreaterThan(20);
          if (tier === 'medium' && hero.def.id === 'canyon-wall-ledge') {
            expect(count).toBe(192);
            expect(colonies).toBe(96);
            console.log('Monterey medium hero after fix', ranges);
          }
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});
