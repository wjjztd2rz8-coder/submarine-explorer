import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { MONTEREY_FIDELITY } from '../../src/core/config/terrain.js';
import { Terrain } from '../../src/world/Terrain.js';
import { monotoneCubic } from '../../src/world/TerrainNoise.js';
import { makeSyntheticTile } from './helpers.js';
import { buildTalusMesh, talusMeshSampler } from '../../src/world/props/geo/talus.js';
import { canyonRockDetail, geoMaterial, vertexGlow } from '../../src/world/props/geo/materials.js';
import { geoDetail } from '../../src/world/props/geo/detail.js';

const tile = (id = 'monterey-canyon') =>
  makeSyntheticTile({
    id,
    cols: 65,
    rows: 65,
    cellsizeDeg: 0.0005,
    centerLat: MONTEREY_FIDELITY.focus.lat,
    centerLon: MONTEREY_FIDELITY.focus.lon,
    height: (c, r) => -700 + c * 9 + 8 * Math.sin(c * 0.7) + 4 * Math.cos(r * 0.3),
  });
function config() {
  const cfg = makeConfig().terrain;
  cfg.chunkCells = 16;
  cfg.maxVertices = 120_000;
  cfg.fidelity = {
    'monterey-canyon': {
      ...MONTEREY_FIDELITY,
      chunkCells: 8,
      focus: { ...MONTEREY_FIDELITY.focus, radiusM: 150, fadeM: 100 },
    },
  };
  return cfg;
}
function meshes(t: Terrain): THREE.Mesh[] {
  return t.group.children.filter((o) => (o as THREE.Mesh).isMesh) as THREE.Mesh[];
}

describe('Monterey fidelity profile', () => {
  it('adds local density within the resident budget and shades mixed-density seams consistently', () => {
    const t = new Terrain(tile(), config(), 'high');
    try {
      expect(t.stats.vertices).toBeLessThanOrEqual(config().maxVertices);
      expect(Object.keys(t.stats.subdivisionCounts!)).toEqual(['2', '8']);
      const seen = new Map<string, { y: number; normal: THREE.Vector3; cavity: number }>();
      let seams = 0;
      for (const m of meshes(t)) {
        const p = m.geometry.getAttribute('position');
        const n = m.geometry.getAttribute('normal');
        const cav = m.geometry.getAttribute('aCavity');
        const nx = new Set(Array.from({ length: p.count }, (_, i) => p.getX(i))).size;
        const nz = new Set(Array.from({ length: p.count }, (_, i) => p.getZ(i))).size;
        for (let i = 0; i < p.count - 2 * nx - 2 * nz; i++) {
          const key = `${p.getX(i).toFixed(3)}|${p.getZ(i).toFixed(3)}`;
          const normal = new THREE.Vector3().fromBufferAttribute(n, i);
          const prev = seen.get(key);
          if (prev) {
            seams++;
            expect(p.getY(i)).toBeCloseTo(prev.y, 4);
            expect(normal.distanceTo(prev.normal)).toBeLessThan(1e-5);
            expect(cav.getX(i)).toBe(prev.cavity);
          } else seen.set(key, { y: p.getY(i), normal, cavity: cav.getX(i) });
        }
        // Every LOD index lands on a valid integer vertex (including the local 8/2/1 strides).
        const chunks = (
          t as unknown as { chunks: Array<{ mesh: THREE.Mesh; setLod(n: number): void }> }
        ).chunks;
        const chunk = chunks.find((c) => c.mesh === m)!;
        for (const lod of [0, 1, 2]) {
          chunk.setLod(lod);
          const indices = m.geometry.getIndex()!;
          for (let i = 0; i < indices.count; i++) expect(indices.getX(i)).toBeLessThan(p.count);
        }
        chunk.setLod(0);
      }
      expect(seams).toBeGreaterThan(100);
    } finally {
      t.dispose();
    }
  });

  it('samples the actual near triangles for collision and scan seats, including coarse patches', () => {
    const t = new Terrain(tile(), config(), 'high');
    try {
      const ray = new THREE.Raycaster();
      for (const [x, z] of [
        [17, 12],
        [-93, 74],
        [224, -51],
        [600, 432],
        [-823, -781],
      ]) {
        ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(t.group, true)[0];
        expect(hit).toBeDefined();
        expect(Math.abs(t.sampleHeight(x, z) - hit.point.y)).toBeLessThan(0.001);
      }
    } finally {
      t.dispose();
    }
  });

  it('preserves Low and other sites byte-for-byte, and retains pure-survey sampling', () => {
    for (const [id, tier] of [
      ['monterey-canyon', 'low'],
      ['titanic', 'high'],
    ] as const) {
      const a = new Terrain(tile(id), config(), tier);
      const b = new Terrain(tile(id), { ...config(), fidelity: {} }, tier);
      try {
        expect(a.stats).toEqual(b.stats);
        for (let k = 0; k < meshes(a).length; k++) {
          for (const attr of ['position', 'normal', 'aCavity']) {
            expect(meshes(a)[k].geometry.getAttribute(attr).array).toEqual(
              meshes(b)[k].geometry.getAttribute(attr).array,
            );
          }
        }
        expect(a.sampleHeight(13, 28)).toBe(b.sampleHeight(13, 28));
      } finally {
        a.dispose();
        b.dispose();
      }
    }
    const pure = new Terrain(tile(), { ...config(), detailStrength: 0 }, 'high');
    try {
      expect(pure.sampleHeight(17, 29)).toBe(pure.sampleDataHeight(17, 29));
    } finally {
      pure.dispose();
    }
  });
});

it('cubic reconstruction preserves knots, tangent continuity and survey extrema', () => {
  const heights = [2, 7, 9, 3, -1];
  for (let i = 0; i <= 100; i++) {
    const y = monotoneCubic(...(heights.slice(0, 4) as [number, number, number, number]), i / 100);
    expect(y).toBeGreaterThanOrEqual(7);
    expect(y).toBeLessThanOrEqual(9);
  }
  expect(monotoneCubic(2, 7, 9, 3, 0)).toBe(7);
  expect(monotoneCubic(2, 7, 9, 3, 1)).toBe(9);
  const e = 1e-5;
  const left = (9 - monotoneCubic(2, 7, 9, 3, 1 - e)) / e;
  const right = (monotoneCubic(7, 9, 3, -1, e) - 9) / e;
  expect(Math.abs(left - right)).toBeLessThan(0.001);
});

it('apron sampler agrees with independent rays on a warped, tapered apron', () => {
  const cols = 18,
    rows = 12;
  const g = buildTalusMesh(
    {
      gnd: (x, z) => x * 0.3 + z * 0.8,
      foot: (x) => Math.sin(x * 0.1) * 6,
      reach: (x) => 10 + Math.cos(x * 0.06) * 7,
      top: () => 5,
      seed: 7,
    },
    80,
    cols,
    rows,
    5,
    (_x, _y, _z, _u, c) => c.setScalar(1),
  );
  const sampler = talusMeshSampler(g, cols, rows);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  try {
    let hits = 0;
    for (let x = -39; x < 40; x += 3.7)
      for (let z = -24; z < 10; z += 2.3) {
        ray.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(mesh)[0];
        if (hit) {
          hits++;
          expect(sampler(x, z)).toBeCloseTo(hit.point.y, 5);
        } else expect(sampler(x, z)).toBeUndefined();
      }
    expect(hits).toBeGreaterThan(50);
  } finally {
    g.dispose();
    (mesh.material as THREE.Material).dispose();
  }
});

it('composes wall erosion normals with the existing lighting hook and distinct shader cache key', () => {
  const m = geoMaterial('strata', geoDetail('high'));
  vertexGlow(m, 0.27);
  const oldKey = m.customProgramCacheKey();
  canyonRockDetail(m, 0.24);
  const shader = {
    ...THREE.ShaderLib.standard,
    uniforms: { ...THREE.ShaderLib.standard.uniforms },
  };
  m.onBeforeCompile(shader as Parameters<typeof m.onBeforeCompile>[0], {} as THREE.WebGLRenderer);
  expect(shader.fragmentShader).toContain('totalEmissiveRadiance *=');
  expect(shader.fragmentShader).toContain('normal = normalize(normal - grad');
  expect(shader.vertexShader).toContain('vCanyonPosition =');
  expect(m.customProgramCacheKey()).not.toBe(oldKey);
  m.dispose();
});
