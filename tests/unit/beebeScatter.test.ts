// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { BIOMES, DEFAULT_BIOME, type Biome } from '../../src/world/TerrainBiome.js';
import { Scatter, type ScatterOptions } from '../../src/world/scatter/Scatter.js';
import { placeCell, type ScatterGround } from '../../src/world/scatter/ScatterPlacement.js';
import { SCATTER_TYPES } from '../../src/world/scatter/ScatterTypes.js';
import { Terrain } from '../../src/world/Terrain.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { hashStringSigned } from '../../src/util/rng.js';
import type { TileMeta } from '../../src/util/types.js';
import { makeConfig } from '../../src/core/Config.js';

const digest = (value: string | ArrayBufferView): string =>
  createHash('sha256').update(value).digest('hex');

afterEach(() => vi.unstubAllGlobals());

function populated(
  biome: Biome,
  density = 1,
  rangeM = 128,
  options: Partial<Pick<ScatterOptions, 'ground' | 'seed' | 'rockLo' | 'rockHi'>> = {},
  position: readonly [number, number] = [32, 32],
): Scatter {
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
    ...options,
  });
  settle(scatter, ...position);
  return scatter;
}

function settle(
  scatter: Scatter,
  x: number,
  z: number,
  check?: (previousCells: number) => void,
): void {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, -85, z);
  for (let i = 0; i < 128; i++) {
    const previousCells = scatter.stats.cells;
    scatter.update(camera);
    check?.(previousCells);
  }
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
  for (const tier of ['low', 'medium', 'high'] as const) {
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

it('1310: larger Challenger boulders retain every tier instance and triangle budget', () => {
  const biome = BIOMES['challenger-deep']!;
  const previous = {
    ...biome,
    scatter: biome.scatter.map((spec) =>
      spec.kind === 'boulder' ? { ...spec, sizeMul: 1.1 } : spec,
    ),
  };
  const cfg = makeConfig();
  const matrix = new THREE.Matrix4();
  const oldMatrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const oldScale = new THREE.Vector3();
  for (const tier of ['low', 'medium', 'high'] as const) {
    const { scatterDensity, scatterRangeM } = cfg.terrain.tiers[tier];
    const before = populated(previous, scatterDensity, scatterRangeM);
    const after = populated(biome, scatterDensity, scatterRangeM);
    try {
      expect(after.stats).toEqual(before.stats);
      expect(after.stats.drawCalls).toBe(4);
      for (const [index, child] of after.group.children.entries()) {
        const mesh = child as THREE.InstancedMesh;
        const oldMesh = before.group.children[index] as THREE.InstancedMesh;
        expect(mesh.count).toBe(oldMesh.count);
        expect(mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count).toBe(
          oldMesh.geometry.index?.count ?? oldMesh.geometry.getAttribute('position').count,
        );
        expect(digest(mesh.instanceColor!.array)).toBe(digest(oldMesh.instanceColor!.array));
        if (mesh.name !== 'scatter:boulder') {
          expect(digest(mesh.instanceMatrix.array)).toBe(digest(oldMesh.instanceMatrix.array));
          continue;
        }
        expect(mesh.count).toBeGreaterThan(0);
        let large = 0;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          oldMesh.getMatrixAt(i, oldMatrix);
          expect(matrix.elements[12]).toBe(oldMatrix.elements[12]);
          expect(matrix.elements[14]).toBe(oldMatrix.elements[14]);
          scale.setFromMatrixScale(matrix);
          oldScale.setFromMatrixScale(oldMatrix);
          expect(scale.x / oldScale.x).toBeCloseTo(2.6 / 1.1, 5);
          expect(scale.y / oldScale.y).toBeCloseTo(2.6 / 1.1, 5);
          expect(scale.z / oldScale.z).toBeCloseTo(2.6 / 1.1, 5);
          if (scale.x >= 3) large++;
        }
        expect(large, `${tier}: some blocks read at approach range`).toBeGreaterThan(0);
      }
    } finally {
      before.dispose();
      after.dispose();
    }
  }
});

it('late ground keepout filters already-resident scatter without moving the camera', () => {
  const scatter = populated(BIOMES['great-blue-hole']!);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(32, -85, 32);
  const meshes = scatter.group.children as THREE.InstancedMesh[];
  const counts = meshes.map((mesh) => mesh.count);
  expect(counts.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  try {
    // Props finish after cells are cached. The next stationary frame must
    // re-gather every kind through the completed footprint predicate.
    scatter.setGroundKeepout(() => true);
    scatter.update(camera);
    expect(meshes.every((mesh) => mesh.count === 0)).toBe(true);
    scatter.setGroundKeepout(() => false);
    scatter.update(camera);
    expect(meshes.map((mesh) => mesh.count)).toEqual(counts);
  } finally {
    scatter.dispose();
  }
});

// Tier ranges differ from the legacy 128 m isolation fixture.
it.each([
  ['low', 9, [12, 13], [190, 68, 13]],
  ['medium', 25, [75, 30], [1228, 164, 30]],
  ['high', 45, [268, 55], [4096, 270, 55]],
] as const)(
  'wreck-floor %s streaming retains its seeded costs and grounded transforms',
  (tier, cells, oldCounts, counts) => {
    const biome = BIOMES.titanic!;
    const previous: Biome = {
      ...biome,
      scatter: [
        { kind: 'dropstone', density: 1.8, slopeMaxDeg: 18, on: 'flat' },
        { kind: 'mound', density: 3.5, slopeMaxDeg: 10, on: 'flat' },
      ],
    };
    const { scatterDensity, scatterRangeM } = makeConfig().terrain.tiers[tier];
    const before = populated(previous, scatterDensity, scatterRangeM);
    const after = populated(biome, scatterDensity, scatterRangeM);
    const replay = populated(biome, scatterDensity, scatterRangeM);
    try {
      expect(before.stats).toEqual({ cells, instances: oldCounts[0] + oldCounts[1], drawCalls: 2 });
      expect(after.stats).toEqual({
        cells,
        instances: counts[0] + counts[1] + counts[2],
        drawCalls: 3,
      });
      expect(replay.stats).toEqual(after.stats);
      const trianglesPerKind = [180, 20, 100];
      let triangles = 0;
      for (const [index, child] of after.group.children.entries()) {
        const mesh = child as THREE.InstancedMesh;
        const repeated = replay.group.children[index] as THREE.InstancedMesh;
        expect(mesh.name).toBe(['scatter:dropstone', 'scatter:rubble', 'scatter:mound'][index]);
        expect(mesh.count).toBe(counts[index]);
        expect(mesh.count).toBeLessThanOrEqual(4096);
        expect(mesh.instanceMatrix.count).toBe(4096);
        const faces =
          (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
        expect(faces).toBe(trianglesPerKind[index]);
        triangles += mesh.count * faces;
        expect(digest(mesh.instanceMatrix.array)).toBe(digest(repeated.instanceMatrix.array));
        expect(digest(mesh.instanceColor!.array)).toBe(digest(repeated.instanceColor!.array));
        const position = mesh.geometry.getAttribute('position');
        const matrix = new THREE.Matrix4();
        const vertex = new THREE.Vector3();
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          expect(matrix.elements.every(Number.isFinite)).toBe(true);
          expect(matrix.determinant()).toBeGreaterThan(0);
          let min = Infinity;
          let max = -Infinity;
          for (let j = 0; j < position.count; j++) {
            vertex.fromBufferAttribute(position, j).applyMatrix4(matrix);
            const distance = vertex.y - (-100 + vertex.x * 0.05 - vertex.z * 0.1);
            min = Math.min(min, distance);
            max = Math.max(max, distance);
          }
          // The rendered shape straddles the bed, rather than floating or disappearing below it.
          expect(min).toBeLessThan(0);
          expect(max).toBeGreaterThan(0);
        }
      }
      expect(triangles).toBe(counts[0] * 180 + counts[1] * 20 + counts[2] * 100);
      const oldMound = before.group.getObjectByName('scatter:mound') as THREE.InstancedMesh;
      const newMound = after.group.getObjectByName('scatter:mound') as THREE.InstancedMesh;
      expect(digest(newMound.instanceMatrix.array)).toBe(digest(oldMound.instanceMatrix.array));
      expect(digest(newMound.instanceColor!.array)).toBe(digest(oldMound.instanceColor!.array));
    } finally {
      before.dispose();
      after.dispose();
      replay.dispose();
    }
  },
);

// Compare live data independently of buffer slots: resident-cell insertion order
// can change after eviction, while placement promises deterministic cell contents.
function liveScatter(scatter: Scatter) {
  return (scatter.group.children as THREE.InstancedMesh[]).map((mesh) => {
    const instances = Array.from({ length: mesh.count }, (_, i) =>
      JSON.stringify([
        ...mesh.instanceMatrix.array.slice(i * 16, (i + 1) * 16),
        ...mesh.instanceColor!.array.slice(i * 3, (i + 1) * 3),
      ]),
    ).sort();
    const faces = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
    return {
      name: mesh.name,
      count: mesh.count,
      triangles: mesh.count * faces,
      instances: digest(instances.join('\n')),
    };
  });
}

it.each(['low', 'medium', 'high'] as const)(
  'carbonate scatter %s streams bounded, repeatable populations seated on its supplied ground',
  (tier) => {
    const biome = BIOMES['lost-city']!;
    // Restore only density for the resource comparison; never mutate the site registry.
    const previous: Biome = {
      ...biome,
      scatter: biome.scatter.map((spec) =>
        spec.kind === 'rubble' ? { ...spec, density: 14 } : spec,
      ),
    };
    const config = makeConfig().terrain;
    const { scatterDensity, scatterRangeM } = config.tiers[tier];
    const meta = JSON.parse(readFileSync('data/tiles/lost-city/meta.json', 'utf8')) as TileMeta;
    const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
    // Construct terrain before enabling the headless scatter meshes, so texture
    // loading stays disabled. This is the shipped sampler, without prop keepouts.
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config,
      tier,
    );
    const normal = new THREE.Vector3();
    const focus = latLonToWorld(
      meta,
      config.fidelity!['lost-city']!.focus.lat,
      config.fidelity!['lost-city']!.focus.lon,
    );
    const grounds: Array<[string, ScatterGround, readonly [number, number]]> = [
      [
        'plane',
        {
          sampleHeight: (x, z) => -100 + x * 0.05 - z * 0.1,
          normalAt: (_x, _z, out) => {
            out[0] = -0.05;
            out[1] = Math.sqrt(1 - 0.05 ** 2 - 0.1 ** 2);
            out[2] = 0.1;
          },
          contains: () => true,
        },
        [32, 32],
      ],
      [
        'survey',
        {
          sampleHeight: (x, z) => terrain.sampleHeight(x, z),
          normalAt: (x, z, out) => {
            terrain.getNormal(x, z, normal);
            out[0] = normal.x;
            out[1] = normal.y;
            out[2] = normal.z;
          },
          contains: (x, z) => terrain.contains(x, z),
        },
        [Math.floor(focus.x / 64) * 64 + 32, Math.floor(focus.z / 64) * 64 + 32],
      ],
    ];
    try {
      for (const [_label, ground, origin] of grounds) {
        for (const seed of [1130, config.detailSeed ^ hashStringSigned(meta.id)]) {
          const options = {
            ground,
            seed,
            rockLo: 1 - Math.cos((config.rockSlopeLoDeg * Math.PI) / 180),
            rockHi: 1 - Math.cos((config.rockSlopeHiDeg * Math.PI) / 180),
          };
          const before = populated(previous, scatterDensity, scatterRangeM, options, origin);
          const after = populated(biome, scatterDensity, scatterRangeM, options, origin);
          try {
            const initial = liveScatter(after);
            const initialBefore = liveScatter(before);
            const costs = [];
            for (let cycle = 0; cycle < 2; cycle++) {
              for (const [dx, dz] of [
                [0, 0],
                [64, 0],
                [-64, 0],
                [1024, 1024],
                [0, 0],
              ]) {
                const x = origin[0] + dx!;
                const z = origin[1] + dz!;
                settle(before, x, z);
                settle(after, x, z, (previousCells) => {
                  expect(after.stats.cells - previousCells).toBeLessThanOrEqual(2);
                  expect(after.stats.instances).toBeLessThanOrEqual(4 * 4096);
                });
                expect(after.stats.cells).toBe(before.stats.cells);
                expect(after.stats.drawCalls).toBe(before.stats.drawCalls);
                expect(after.stats.drawCalls).toBeLessThanOrEqual(biome.scatter.length);
                const state = liveScatter(after);
                const oldState = liveScatter(before);
                expect(state.map((mesh) => mesh.count).reduce((a, b) => a + b, 0)).toBe(
                  after.stats.instances,
                );
                for (const [i, mesh] of state.entries()) {
                  expect(mesh.triangles).toBe(mesh.count * [80, 20, 180, 162][i]!);
                  const old = oldState[i]!;
                  if (mesh.name === 'scatter:rubble') {
                    expect(mesh.count).toBeGreaterThan(old.count);
                  } else {
                    // Each kind has its own seed stream; a density-only change
                    // must preserve the other kinds' complete live data.
                    expect(mesh).toEqual(old);
                  }
                }
                // The existing 4096-instance buffers, four biome kinds and
                // eviction radius bound the population; no new budget is imposed.
                expect(after.stats.instances).toBeLessThanOrEqual(4 * 4096);
                const evictionDiameter = 2 * (scatterRangeM + 64 * 2.2);
                expect(after.stats.cells).toBeLessThanOrEqual(
                  (Math.ceil(evictionDiameter / 64) + 1) ** 2,
                );
                for (const [kindIndex, mesh] of (
                  after.group.children as THREE.InstancedMesh[]
                ).entries()) {
                  const kind = biome.scatter[kindIndex]!.kind;
                  expect(mesh.name).toBe(`scatter:${kind}`);
                  const range = Math.min(scatterRangeM, SCATTER_TYPES[kind].drawRangeM);
                  expect(mesh.count).toBeLessThanOrEqual(mesh.instanceMatrix.count);
                  expect(mesh.instanceMatrix.count).toBe(4096);
                  expect(
                    Array.from(mesh.instanceMatrix.array.slice(0, mesh.count * 16)).every(
                      Number.isFinite,
                    ),
                  ).toBe(true);
                  expect(
                    Array.from(mesh.instanceColor!.array.slice(0, mesh.count * 3)).every(
                      Number.isFinite,
                    ),
                  ).toBe(true);
                  const m = new THREE.Matrix4();
                  const scale = new THREE.Vector3();
                  for (let i = 0; i < mesh.count; i++) {
                    mesh.getMatrixAt(i, m);
                    expect(m.determinant()).toBeGreaterThan(0);
                    expect(
                      Math.hypot(m.elements[12]! - x, m.elements[14]! - z),
                    ).toBeLessThanOrEqual(range + 0.001);
                    scale.setFromMatrixScale(m);
                    const bed = ground.sampleHeight(m.elements[12]!, m.elements[14]!);
                    const burial = bed - m.elements[13]!;
                    // Float32 translations at survey depth have sub-mm rounding.
                    expect(burial).toBeGreaterThanOrEqual(-0.001);
                    expect(burial).toBeLessThan(scale.y + 0.001);
                  }
                }
                costs.push({
                  cycle,
                  dx,
                  dz,
                  cells: after.stats.cells,
                  before: liveScatter(before).map(({ name, count, triangles }) => ({
                    name,
                    count,
                    triangles,
                  })),
                  after: state.map(({ name, count, triangles }) => ({ name, count, triangles })),
                });
                if (dx === 0 && dz === 0) {
                  expect(state).toEqual(initial);
                  expect(liveScatter(before)).toEqual(initialBefore);
                }
              }
            }
            expect(costs.slice(5).map(({ cycle: _cycle, ...cost }) => cost)).toEqual(
              costs.slice(0, 5).map(({ cycle: _cycle, ...cost }) => cost),
            );
            const cellOptions = {
              cellSizeM: 64,
              density: scatterDensity,
              seed,
              rockLo: options.rockLo,
              rockHi: options.rockHi,
            };
            const cx = Math.floor(origin[0] / 64),
              cz = Math.floor(origin[1] / 64);
            const first = placeCell(cx, cz, ground, biome, cellOptions);
            expect(placeCell(cx, cz, ground, biome, cellOptions)).toEqual(first);
            const shifted = placeCell(
              cx,
              cz,
              { ...ground, sampleHeight: (x, z) => ground.sampleHeight(x, z) + 37 },
              biome,
              cellOptions,
            );
            for (const spec of biome.scatter) {
              const list = first[spec.kind] ?? [];
              expect(shifted[spec.kind]?.length ?? 0).toBe(list.length);
              for (const [i, inst] of list.entries()) {
                expect(Object.values(inst).every(Number.isFinite)).toBe(true);
                expect(shifted[spec.kind]![i]!.y - inst.y).toBeCloseTo(37, 8);
                expect({ ...shifted[spec.kind]![i], y: inst.y }).toEqual(inst);
              }
            }
          } finally {
            before.dispose();
            after.dispose();
          }
        }
      }
    } finally {
      terrain.dispose();
    }
  },
);
