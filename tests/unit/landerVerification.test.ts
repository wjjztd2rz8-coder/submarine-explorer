import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { buildBenthicLander } from '../../src/world/props/geo/lander.js';
import { countGeo } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';

const build = (tier: string) =>
  buildBenthicLander({
    def: { feature: 'benthic-lander', raw: {} } as PropDef,
    dims: [9, 9, 12],
    seed: 42,
    cfg: DEFAULT_CONFIG.props,
    tier,
    groundHeight: () => undefined,
  });

function meshes(built: ReturnType<typeof build>): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  for (const root of [built.full, built.impostor])
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) result.push(object);
    });
  return result;
}

function release(built: ReturnType<typeof build>): void {
  for (const mesh of meshes(built)) {
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      material.dispose();
  }
}

describe('merged Challenger lander', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    it(`${tier}: three opaque draw calls, bounded triangles and finite vertex tint`, () => {
      const built = build(tier);
      try {
        const cost = countGeo(built.full);
        console.log(`LANDER ${tier}: ${JSON.stringify(cost)}`);
        expect(cost.draws).toBe(3);
        expect(cost.triangles).toBeGreaterThan(500);
        expect(cost.triangles).toBeLessThanOrEqual(tier === 'low' ? 2000 : 3000);
        expect(countGeo(built.impostor)).toEqual({ draws: 1, triangles: 12 });
        expect(built.full.children.map((child) => child.name)).toEqual([
          'lander-frame',
          'lander-flag',
          'lander-strobe',
        ]);
        for (const mesh of meshes(built)) {
          expect(mesh).not.toBeInstanceOf(THREE.InstancedMesh);
          expect(Array.isArray(mesh.material)).toBe(false);
          expect((mesh.material as THREE.Material).transparent).toBe(false);
          for (const value of mesh.geometry.getAttribute('position').array)
            expect(Number.isFinite(value)).toBe(true);
        }
        const frame = built.full.getObjectByName('lander-frame') as THREE.Mesh;
        const colors = frame.geometry.getAttribute('color');
        expect(colors.count).toBe(frame.geometry.getAttribute('position').count);
        for (const color of colors.array) {
          expect(color).toBeGreaterThanOrEqual(0);
          expect(color).toBeLessThanOrEqual(1);
        }
      } finally {
        release(built);
      }
    });
  }

  it('separate landers own independent geometry and materials, including the impostor', () => {
    const a = build('low');
    const b = build('low');
    try {
      expect(meshes(a)).toHaveLength(4);
      expect(meshes(b)).toHaveLength(4);
      const geometries = new Set(meshes(a).map((mesh) => mesh.geometry));
      const materials = new Set(meshes(a).map((mesh) => mesh.material));
      expect(geometries.size).toBe(4);
      expect(materials.size).toBe(4);
      for (const mesh of meshes(b)) {
        expect(geometries.has(mesh.geometry)).toBe(false);
        expect(materials.has(mesh.material)).toBe(false);
      }
    } finally {
      release(a);
      release(b);
    }
  });
});
