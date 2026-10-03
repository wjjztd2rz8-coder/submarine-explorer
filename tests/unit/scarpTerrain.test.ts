// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';

describe('Monterey wall anchors on the real sloping tile', () => {
  it.each(['low', 'medium', 'high', 'ultra'] as const)(
    '%s: every instance clears the seabed and exposed growth keeps its requested counts',
    async (tier) => {
      const meta = JSON.parse(
        readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8'),
      ) as TileMeta;
      const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const config = makeConfig();
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const content = JSON.parse(
          readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'),
        );
        content.props = content.props.filter((p: { id: string }) => p.id === 'canyon-wall-ledge');
        await props.load('props.json', 'monterey-canyon', async () => content);
        expect(props.stats.failed).toBe(0);
        const hero = props.placed[0]!;
        hero.root.updateMatrixWorld(true);
        const height = hero.localBounds.max.y - hero.localBounds.min.y;
        let count = 0;
        let sponges = 0;
        let corals = 0;
        hero.full.traverse((o) => {
          const mesh = o as InstancedMesh;
          if (!mesh.isInstancedMesh) return;
          const growth = /^wall-(sponges|corals)-/.test(mesh.name);
          if (mesh.name.startsWith('wall-sponges-')) sponges += mesh.count;
          if (mesh.name.startsWith('wall-corals-')) corals += mesh.count;
          const m = new Matrix4();
          const p = new Vector3();
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, m);
            p.setFromMatrixPosition(m.premultiply(mesh.matrixWorld));
            const clearance = p.y - terrain.sampleHeight(p.x, p.z);
            const label = `${mesh.name}[${i}]`;
            count++;
            // Keep the browser gate's bounds for ALL instances, including wall life.
            expect(clearance, label).toBeGreaterThan(-3);
            expect(clearance, label).toBeLessThan(height * 0.5);
            // Growth anchors must be exposed, not merely within the rock tolerance.
            if (growth) expect(clearance, label).toBeGreaterThanOrEqual(-1e-4);
          }
        });
        expect(count).toBeGreaterThan(20);
        const growth = Math.min(geoDetail(tier).growth, 1.2);
        expect(sponges).toBe(Math.round(90 * growth));
        expect(corals).toBe(Math.round(70 * growth));
        if (tier === 'medium') expect(count).toBe(192);
      } finally {
        terrain.dispose();
      }
    },
  );
});
