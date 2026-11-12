import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { buildBenthicLander } from '../../src/world/props/geo/lander.js';
import { countGeo } from '../../src/world/props/geo/shared.js';
import type { PropDef } from '../../src/world/PropLoader.js';
import type { GeoBuildInput } from '../../src/world/props/geo/types.js';

const build = (
  tier: string,
  options: Partial<Pick<GeoBuildInput, 'dims' | 'seed' | 'groundHeight'>> = {},
) =>
  buildBenthicLander({
    def: { feature: 'benthic-lander', raw: {} } as PropDef,
    dims: [9, 9, 12],
    seed: 42,
    cfg: DEFAULT_CONFIG.props,
    tier,
    groundHeight: () => undefined,
    ...options,
  });

function meshes(built: ReturnType<typeof build>): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];
  for (const root of [built.full, built.impostor])
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) result.push(object);
    });
  return result;
}

/** Draws and triangles of the opaque body (frame, flag, strobe); the additive glow and swarm are budgeted separately. */
function bodyCost(built: ReturnType<typeof build>): { draws: number; triangles: number } {
  const sum = { draws: 0, triangles: 0 };
  for (const name of ['lander-frame', 'lander-flag', 'lander-strobe']) {
    const c = countGeo(built.full.getObjectByName(name)!);
    sum.draws += c.draws;
    sum.triangles += c.triangles;
  }
  return sum;
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
    it(`${tier}: three opaque body draw calls, bounded triangles and finite vertex tint`, () => {
      const built = build(tier);
      try {
        const cost = bodyCost(built);
        console.log(`LANDER ${tier}: ${JSON.stringify(cost)}`);
        expect(cost.draws).toBe(3);
        expect(cost.triangles).toBeGreaterThan(500);
        expect(cost.triangles).toBeLessThanOrEqual(tier === 'low' ? 2000 : 3000);
        expect(countGeo(built.impostor)).toEqual({ draws: 1, triangles: 12 });
        expect(built.full.children.map((child) => child.name)).toEqual([
          'lander-frame',
          'lander-flag',
          'lander-strobe',
          'lander-bait-glow',
          'lander-bait-pool',
          'lander-amphipod-swarm',
        ]);
        // Glow and swarm are additive extras; the body stays opaque.
        const swarm = built.full.getObjectByName('lander-amphipod-swarm') as THREE.Points;
        expect(swarm.geometry.getAttribute('aSeed').count).toBe(
          tier === 'low' ? 80 : tier === 'medium' ? 136 : 200,
        );
        for (const mesh of meshes(built)) {
          expect(mesh).not.toBeInstanceOf(THREE.InstancedMesh);
          expect(Array.isArray(mesh.material)).toBe(false);
          if (mesh.name !== 'lander-bait-pool')
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

    it(`${tier}: dimensions, seed and ground relief cannot exceed the geometry budget`, () => {
      const baseline = build(tier);
      try {
        const cost = bodyCost(baseline);
        for (const options of [
          { dims: [3.4, 3.4, 4.6], seed: 0, groundHeight: () => () => 0 },
          {
            dims: [26, 26, 34],
            seed: 0xffffffff,
            groundHeight: () => (x: number, z: number) => 0.1 * x - 0.2 * z,
          },
        ] satisfies Partial<GeoBuildInput>[]) {
          const built = build(tier, options);
          try {
            expect(bodyCost(built)).toEqual(cost);
            expect(bodyCost(built).triangles).toBeLessThanOrEqual(tier === 'low' ? 2000 : 3000);
          } finally {
            release(built);
          }
        }
      } finally {
        release(baseline);
      }
    });

    it(`${tier}: terrain-following dressing cannot enlarge placement bounds or colliders`, () => {
      const baseline = build(tier);
      // Separate dressing vertically so the merged mesh can be checked without part offsets.
      const ground = (x: number, z: number) => 1000 + 0.1 * x - 0.2 * z;
      const raised = build(tier, { groundHeight: () => ground });
      try {
        expect(raised.bounds).toEqual(baseline.bounds);
        expect(raised.colliders).toEqual(baseline.colliders);
        const frame = raised.full.getObjectByName('lander-frame') as THREE.Mesh;
        const vertices = frame.geometry.getAttribute('position');
        let dressingVertices = 0;
        let maximumRelief = 0;
        for (let i = 0; i < vertices.count; i++) {
          if (vertices.getY(i) < 500) continue;
          dressingVertices++;
          maximumRelief = Math.max(
            maximumRelief,
            Math.abs(vertices.getY(i) - ground(vertices.getX(i), vertices.getZ(i))),
          );
        }
        expect(dressingVertices).toBeGreaterThan(0);
        expect(maximumRelief).toBeLessThan(1);
        expect(frame.geometry.boundingBox!.max.y).toBeGreaterThan(1000);
        expect(raised.bounds.max.y).toBeLessThan(20);
      } finally {
        release(baseline);
        release(raised);
      }
    });
  }

  it('separate landers own independent geometry and materials, including the impostor', () => {
    const a = build('low');
    const b = build('low');
    try {
      expect(meshes(a)).toHaveLength(5);
      expect(meshes(b)).toHaveLength(5);
      const geometries = new Set(meshes(a).map((mesh) => mesh.geometry));
      const materials = new Set(meshes(a).map((mesh) => mesh.material));
      expect(geometries.size).toBe(5);
      expect(materials.size).toBe(5);
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
