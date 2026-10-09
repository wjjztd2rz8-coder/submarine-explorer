// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { BIOMES, DEFAULT_BIOME, type Biome } from '../../src/world/TerrainBiome.js';
import { Scatter } from '../../src/world/scatter/Scatter.js';
import { makeConfig } from '../../src/core/Config.js';

const digest = (value: string | ArrayBufferView): string =>
  createHash('sha256').update(value).digest('hex');

afterEach(() => vi.unstubAllGlobals());

function populated(biome: Biome, density = 1, rangeM = 128): Scatter {
  // Scatter only needs the presence of document to enable its GPU-independent meshes.
  vi.stubGlobal('document', {});
  const scatter = new Scatter({
    biome,
    ground: {
      sampleHeight: (x, z) => -100 + x * 0.05 - z * 0.1,
      normalAt: (_x, _z, out) => {
        out[0] = -0.05;
        out[1] = Math.sqrt(1 - 0.05 ** 2 - 0.1 ** 2);
        out[2] = 0.1;
      },
      contains: () => true,
    },
    density,
    rangeM,
    seed: 1130,
    rockLo: 0.02,
    rockHi: 0.3,
  });
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(32, -85, 32);
  for (let i = 0; i < 128; i++) scatter.update(camera);
  return scatter;
}

it('1130: other sites retain byte-identical scatter geometry, placement, colors and draw counts', () => {
  const evidence: Record<string, unknown> = {};
  for (const [id, biome] of [...Object.entries(BIOMES), ['unknown', DEFAULT_BIOME] as const]) {
    if (id === 'beebe-vent-field') continue;
    const scatter = populated(biome);
    try {
      const meshes = (scatter.group.children as THREE.InstancedMesh[]).map((mesh) => ({
        name: mesh.name,
        count: mesh.count,
        attributes: Object.fromEntries(
          Object.entries(mesh.geometry.attributes).map(([key, attr]) => [key, digest(attr.array)]),
        ),
        index: mesh.geometry.index ? digest(mesh.geometry.index.array) : null,
        matrices: digest(mesh.instanceMatrix.array),
        colors: digest(mesh.instanceColor!.array),
      }));
      evidence[id] = { stats: { ...scatter.stats }, meshes: digest(JSON.stringify(meshes)) };
    } finally {
      scatter.dispose();
    }
  }
  expect(evidence).toMatchSnapshot();
});

it('1130: Beebe rocks darken and fracture in the same three draws with identical placement at every tier', () => {
  const biome = BIOMES['beebe-vent-field']!;
  const cfg = makeConfig();
  const evidence: Record<string, unknown> = {};
  for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
    const { scatterDensity, scatterRangeM } = cfg.terrain.tiers[tier];
    const original = populated({ ...biome, scatterRock: undefined }, scatterDensity, scatterRangeM);
    const changed = populated(biome, scatterDensity, scatterRangeM);
    try {
      expect(changed.stats).toEqual(original.stats);
      expect(changed.stats.drawCalls).toBe(3);
      const meshes = changed.group.children as THREE.InstancedMesh[];
      evidence[tier] = meshes.map((mesh, index) => {
        const before = original.group.children[index] as THREE.InstancedMesh;
        expect(mesh.name).toBe(before.name);
        expect(mesh.count).toBe(before.count);
        expect(digest(mesh.instanceMatrix.array)).toBe(digest(before.instanceMatrix.array));
        expect(digest(mesh.instanceColor!.array)).toBe(digest(before.instanceColor!.array));
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const beforeMat = before.material as THREE.MeshStandardMaterial;
        expect([mat.color.getHex(), mat.roughness, mat.vertexColors, mat.map]).toEqual([
          beforeMat.color.getHex(),
          beforeMat.roughness,
          beforeMat.vertexColors,
          beforeMat.map,
        ]);
        const position = mesh.geometry.getAttribute('position');
        const normal = mesh.geometry.getAttribute('normal');
        const color = mesh.geometry.getAttribute('color');
        const beforeColor = before.geometry.getAttribute('color');
        const meanColor = (
          attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
        ): number => {
          let sum = 0;
          for (let i = 0; i < attribute.count; i++) {
            sum += attribute.getX(i) + attribute.getY(i) + attribute.getZ(i);
          }
          return sum / (attribute.count * 3);
        };
        expect(meanColor(color)).toBeLessThan(meanColor(beforeColor) * 0.6);
        expect(position.count).toBeLessThanOrEqual(before.geometry.getAttribute('position').count);
        expect(digest(position.array)).not.toBe(
          digest(before.geometry.getAttribute('position').array),
        );
        expect(mesh.geometry.boundingBox!.min.y).toBeCloseTo(0, 6);
        for (let f = 0; f < position.count; f += 3) {
          const a = new THREE.Vector3().fromBufferAttribute(position, f);
          const b = new THREE.Vector3().fromBufferAttribute(position, f + 1);
          const c = new THREE.Vector3().fromBufferAttribute(position, f + 2);
          expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-8);
          for (let k = 0; k < 3; k++) {
            const n = new THREE.Vector3().fromBufferAttribute(normal, f + k);
            expect(n.length()).toBeCloseTo(1, 5);
            expect(n.distanceTo(new THREE.Vector3().fromBufferAttribute(normal, f))).toBeLessThan(
              1e-6,
            );
          }
        }
        return {
          name: mesh.name,
          triangles: position.count / 3,
          position: digest(position.array),
          normal: digest(normal.array),
          color: digest(color.array),
          instances: mesh.count,
        };
      });
    } finally {
      original.dispose();
      changed.dispose();
    }
  }
  expect(evidence).toMatchSnapshot();
});
