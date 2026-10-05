import { describe, expect, it } from 'vitest';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import * as THREE from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { buildCarbonateTower } from '../../src/world/props/geo/towers.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';
import type { Tile } from '../../src/util/types.js';
import { lostCitySlopeTint } from '../../src/world/LostCityBands.js';

describe('lost-city biome', () => {
  const b = biomeFor('lost-city');
  it('scatters talus blocks and rubble larger than the default, on slopes', () => {
    const rubble = b.scatter.find((s) => s.kind === 'rubble');
    const boulder = b.scatter.find((s) => s.kind === 'boulder');
    expect(rubble?.sizeMul).toBeGreaterThan(1);
    expect(boulder?.sizeMul).toBeGreaterThan(1);
    expect(rubble!.slopeMaxDeg).toBeGreaterThanOrEqual(40);
  });
  it('bands its slopes', () => {
    expect(b.strata?.periodM).toBeGreaterThan(0);
    expect(b.strata?.amount).toBeGreaterThan(0);
  });

  it('reveals broad beds on gentle slopes while preserving level silt and a light floor', () => {
    expect(lostCitySlopeTint(0, -800, 0, 1)).toEqual([1, 1, 1]);
    const tones = Array.from({ length: 120 }, (_, i) =>
      lostCitySlopeTint(20, -800 + i * 0.25, 30, Math.cos((15 * Math.PI) / 180)),
    ).flat();
    expect(Math.max(...tones) - Math.min(...tones)).toBeGreaterThan(0.2);
    expect(Math.min(...tones)).toBeGreaterThan(0.7);
    expect(tones.reduce((sum, tone) => sum + tone, 0) / tones.length).toBeGreaterThan(0.94);
  });

  it('only opts Lost City into baked colour, leaving geometry and LOD budgets unchanged', () => {
    const makeTile = (id: string): Tile => ({
      meta: { id, cols: 9, rows: 9, cellsize_m_x: 20, cellsize_m_y: 20 } as Tile['meta'],
      heights: Float32Array.from({ length: 81 }, (_, i) => -800 + (i % 9) * 5),
    });
    const lost = new Terrain(makeTile('lost-city'), DEFAULT_CONFIG.terrain, 'low');
    const control = new Terrain(makeTile('monterey-canyon'), DEFAULT_CONFIG.terrain, 'low');
    try {
      expect(lost.stats.vertices).toBe(control.stats.vertices);
      expect(lost.stats.triangles).toBe(control.stats.triangles);
      expect(lost.stats.chunks).toBe(control.stats.chunks);
      for (const child of lost.group.children) {
        if (!(child instanceof THREE.Mesh)) continue;
        const colors = child.geometry.getAttribute('color');
        expect(colors.count).toBe(child.geometry.getAttribute('position').count);
        expect((child.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
        expect(
          (child.material as THREE.MeshStandardMaterial).userData.uniforms.uStrata.value.y,
        ).toBe(0);
        expect(Array.from(colors.array).every(Number.isFinite)).toBe(true);
      }
      for (const child of control.group.children) {
        if (child instanceof THREE.Mesh)
          expect(child.geometry.getAttribute('color')).toBeUndefined();
      }
    } finally {
      lost.dispose();
      control.dispose();
    }
  });
});

describe('Poseidon base life', () => {
  for (const tier of ['low', 'medium', 'high']) {
    it(`${tier}: two small instanced thickets have roots seated in the rendered sloping apron`, () => {
      const built = buildCarbonateTower({
        def: { id: 'poseidon-tower' } as PropDef,
        dims: [100, 100, 60],
        seed: hashString('poseidon-tower'),
        cfg: DEFAULT_CONFIG.props,
        tier,
        groundHeight: () => (x, z) => -0.32 * x + 0.18 * z,
      });
      const rock = built.full.children[0] as THREE.Mesh;
      const groups = built.full.children.filter((c) =>
        c.name.startsWith('poseidon-base-'),
      ) as THREE.InstancedMesh[];
      expect(groups.map((g) => g.name)).toEqual(['poseidon-base-corals', 'poseidon-base-anemones']);
      const counts = groups.map((g) => g.count);
      expect(counts.every((n) => n > 0)).toBe(true);
      expect(counts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(54);
      for (const group of groups) {
        const root = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const matrix = new THREE.Matrix4();
        const ray = new THREE.Raycaster();
        for (let i = 0; i < group.count; i++) {
          group.getMatrixAt(i, matrix);
          matrix.decompose(root, new THREE.Quaternion(), scale);
          ray.set(
            new THREE.Vector3(root.x, built.bounds.max.y + 1, root.z),
            new THREE.Vector3(0, -1, 0),
          );
          const hit = ray.intersectObject(rock, false)[0]!;
          expect(hit).toBeDefined();
          const embed = (group.name.endsWith('corals') ? 0.08 : 0.025) * scale.y;
          expect(hit.point.y - root.y).toBeCloseTo(embed, 4);
          expect(built.bounds.containsPoint(root)).toBe(true);
        }
      }
      const draws = built.full.children.filter((c) => c instanceof THREE.Mesh).length;
      // One rock mesh and two life batches; existing shimmer Points are unchanged.
      expect(draws).toBe(3);
    });
  }
});
