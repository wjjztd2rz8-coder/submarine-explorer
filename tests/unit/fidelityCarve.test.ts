// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import type { TileMeta } from '../../src/util/types.js';

for (const site of ['monterey-canyon', 'great-blue-hole']) {
  for (const tier of ['medium', 'high', 'ultra'] as const) {
    it(`${site} ${tier}: cubic surface, collision and mesh retain the analytic carve`, () => {
      const config = makeConfig().terrain;
      expect(config.fidelity?.[site]).toBeDefined();
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config, tier);
      try {
        const { x, z } = terrainCarveFor(meta)!.centre;
        if (site === 'monterey-canyon') {
          expect(x).toBeCloseTo(-3230.9, 0);
          expect(z).toBeCloseTo(-1358.8, 0);
          expect(terrain.sampleDataHeight(x, z)).toBeCloseTo(-860, 6);
        } else expect(terrain.sampleDataHeight(x, z)).toBeCloseTo(-125, 6);
        const offsets =
          site === 'monterey-canyon'
            ? [
                [0, 0],
                [0, -300],
              ]
            : [
                [0, 0],
                [140, 0],
              ];
        const ray = new Raycaster();
        for (const [dx, dz] of offsets) {
          const px = x + dx!,
            pz = z + dz!;
          // Subtract bounded procedural detail: the reconstructed base must match the
          // carved survey, not raw cubic data (~-696 m / -4 m in the broken version).
          const surface = (
            terrain as unknown as { surfaceHeight(x: number, z: number): number }
          ).surfaceHeight(px, pz);
          expect(surface - terrain.detailHeight(px, pz)).toBeCloseTo(
            terrain.sampleDataHeight(px, pz),
            6,
          );
          ray.set(new Vector3(px, 100, pz), new Vector3(0, -1, 0));
          const hit = ray.intersectObject(terrain.group, true)[0];
          expect(hit).toBeDefined();
          expect(Math.abs(hit.point.y - terrain.sampleHeight(px, pz))).toBeLessThan(0.001);
          expect(Math.abs(hit.point.y - surface)).toBeLessThan(2);
          if (dx === 0 && dz === 0)
            expect(Math.abs(hit.point.y - terrain.sampleDataHeight(px, pz))).toBeLessThan(3);
        }
      } finally {
        terrain.dispose();
      }
    });
  }
}
