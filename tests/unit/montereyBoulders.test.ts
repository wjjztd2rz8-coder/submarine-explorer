// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';

/** Check each fractured instance: group-wide bounds can hide a buried rock. */
describe('650 Monterey fractured boulders on surveyed seabed', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    it(`${tier}: all four canyon walls retain exposed rocks; Low omits rubble`, async () => {
      const site = 'monterey-canyon';
      const config = makeConfig();
      config.terrain.tiers[tier].detailSubdiv = 1;
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const doc = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        await props.placeAll(doc, site);
        expect(props.stats.failed).toBe(0);
        const walls = props.placed.filter((p) => p.def.feature === 'canyon-ledge');
        expect(walls).toHaveLength(4);
        const instance = new Matrix4();
        const world = new Matrix4();
        const position = new Vector3();
        for (const wall of walls) {
          wall.root.updateMatrixWorld(true);
          let count = 0;
          let batches = 0;
          wall.full.traverse((object) => {
            if (!(object instanceof InstancedMesh) || !object.name.startsWith('boulders-')) return;
            batches++;
            const vertices = object.geometry.getAttribute('position');
            for (let i = 0; i < object.count; i++) {
              object.getMatrixAt(i, instance);
              world.multiplyMatrices(object.matrixWorld, instance);
              position.setFromMatrixPosition(world);
              const label = `${wall.def.id} ${object.name}[${i}]`;
              expect(
                position.y - terrain.sampleHeight(position.x, position.z),
                `${label}: centre buried`,
              ).toBeGreaterThan(0);
              let exposed = -Infinity;
              for (let j = 0; j < vertices.count; j++) {
                position.fromBufferAttribute(vertices, j).applyMatrix4(world);
                exposed = Math.max(
                  exposed,
                  position.y - terrain.sampleHeight(position.x, position.z),
                );
              }
              // Embedded undersides are intentional; every individual rock must be visible above ground.
              expect(exposed, `${label}: rock buried`).toBeGreaterThan(0.25);
              count++;
            }
          });
          expect(batches).toBe(tier === 'low' ? 0 : 3);
          expect(count).toBe(tier === 'low' ? 0 : Math.round(160 * geoDetail(tier).growth));
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});
