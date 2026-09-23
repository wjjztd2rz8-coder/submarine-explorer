/**
 * The procedural detail layer, chunk LOD and frustum bookkeeping added in A1.
 * See docs/terrain.md.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Terrain, fitSubdivToBudget } from '../../src/world/Terrain.js';
import { detailAmplitude, fbm2, valueNoise2 } from '../../src/world/TerrainNoise.js';
import { makeSyntheticTile } from './helpers.js';

const base = DEFAULT_CONFIG.terrain;

/** A tile with real relief so slopes (and therefore detail amplitudes) vary. */
function ridgedTile(cols = 40, rows = 34) {
  return makeSyntheticTile({
    cols,
    rows,
    height: (c, r) => -3600 + 120 * Math.sin(c / 5) * Math.cos(r / 7) + c * 2.5,
  });
}

describe('TerrainNoise', () => {
  it('value noise is deterministic and bounded to [0, 1)', () => {
    for (let i = 0; i < 2000; i++) {
      const x = ((i * 37.13) % 500) - 250;
      const y = ((i * 11.7) % 500) - 250;
      const v = valueNoise2(x, y, 17);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(valueNoise2(x, y, 17)).toBe(v);
    }
  });

  it('fbm stays inside [-1, 1] and varies with position', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 4000; i++) {
      const v = fbm2(i * 0.137, i * 0.211, 3, 5);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    // Not a constant function.
    expect(max - min).toBeGreaterThan(0.5);
  });

  it('scales amplitude up on rock and down on sediment', () => {
    const p = {
      strength: 1,
      invWavelengthM: 0.01,
      octaves: 3,
      amplitudeM: 10,
      sedimentFactor: 0.3,
      slopeLoDeg: 4,
      slopeHiDeg: 25,
      seed: 1,
    };
    expect(detailAmplitude(0, p)).toBeCloseTo(3, 6); // flat abyssal plain
    expect(detailAmplitude(40, p)).toBeCloseTo(10, 6); // scarp
    expect(detailAmplitude(14.5, p)).toBeGreaterThan(3);
    expect(detailAmplitude(14.5, p)).toBeLessThan(10);
    expect(detailAmplitude(40, { ...p, strength: 0 })).toBe(0);
  });
});

describe('Terrain detail layer', () => {
  it('detailStrength 0 leaves the measured survey surface untouched', () => {
    const tile = ridgedTile();
    const t = new Terrain(tile, { ...base, detailStrength: 0 });
    for (const [x, z] of [
      [0, 0],
      [123, -456],
      [-789, 321],
    ] as const) {
      expect(t.sampleHeight(x, z)).toBe(t.sampleDataHeight(x, z));
      expect(t.detailHeight(x, z)).toBe(0);
    }
  });

  it('never displaces by more than the configured fraction of a cell', () => {
    const tile = ridgedTile();
    const cellM = Math.min(tile.meta.cellsize_m_x, tile.meta.cellsize_m_y);
    const limit = base.detailAmplitudeCells * cellM * base.detailStrength;
    const t = new Terrain(tile, base);
    let sawSomething = false;
    for (let i = -400; i <= 400; i += 7) {
      for (let j = -400; j <= 400; j += 11) {
        const d = Math.abs(t.detailHeight(i, j));
        expect(d).toBeLessThanOrEqual(limit + 1e-9);
        if (d > limit * 0.05) sawSomething = true;
      }
    }
    expect(sawSomething).toBe(true);
    // The whole point: the limit is a small fraction of one source cell.
    expect(limit).toBeLessThan(cellM * 0.16);
  });

  it('is a pure function of world position (so chunk seams agree)', () => {
    const tile = ridgedTile();
    const a = new Terrain(tile, base);
    const b = new Terrain(tile, base);
    for (let i = 0; i < 50; i++) {
      const x = i * 13.7 - 300;
      const z = i * -9.1 + 120;
      expect(a.sampleHeight(x, z)).toBe(b.sampleHeight(x, z));
    }
  });
});

describe('Terrain mesh matches sampleHeight', () => {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`every vertex of every chunk equals sampleHeight (${tier} tier)`, () => {
      const tile = ridgedTile();
      const t = new Terrain(tile, { ...base, chunkCells: 8 }, tier);
      expect(t.stats.chunks).toBeGreaterThan(1);

      let checked = 0;
      let maxErr = 0;
      for (const child of t.group.children) {
        const geom = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
        const pos = geom.getAttribute('position');
        // Surface vertices only: the trailing run is the skirt, which is
        // deliberately dropped below the surface.
        const surface = pos.count - skirtVertexCount(geom);
        for (let i = 0; i < surface; i++) {
          const err = Math.abs(pos.getY(i) - t.sampleHeight(pos.getX(i), pos.getZ(i)));
          maxErr = Math.max(maxErr, err);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(500);
      // Float32 storage of a ~3600 m coordinate; the tolerance is quantisation,
      // not modelling error.
      expect(maxErr).toBeLessThan(0.02);
    });
  }

  it('chunk corners and centres agree with sampleHeight', () => {
    const tile = ridgedTile(33, 33);
    const t = new Terrain(tile, { ...base, chunkCells: 8 });
    for (const child of t.group.children) {
      const geom = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
      const pos = geom.getAttribute('position');
      const sphere = geom.boundingSphere as THREE.Sphere;
      // Bounding-sphere centre projected onto the seabed: the chunk's middle.
      expect(t.sampleHeight(sphere.center.x, sphere.center.z)).toBeGreaterThan(
        sphere.center.y - sphere.radius,
      );
      for (const i of [0, pos.count - 1]) {
        // Corner vertices are surface vertices at index 0 and skirt at the end;
        // check index 0 exactly and the geometric corners via sampleHeight.
        if (i === 0) {
          expect(pos.getY(i)).toBeCloseTo(t.sampleHeight(pos.getX(i), pos.getZ(i)), 2);
        }
      }
    }
  });

  it('adjacent chunks put identical heights on their shared edge', () => {
    const tile = ridgedTile(25, 25);
    const t = new Terrain(tile, { ...base, chunkCells: 8 });
    // Key every surface vertex by its XZ; any duplicate must agree exactly.
    const seen = new Map<string, number>();
    let shared = 0;
    for (const child of t.group.children) {
      const geom = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
      const pos = geom.getAttribute('position');
      const surface = pos.count - skirtVertexCount(geom);
      for (let i = 0; i < surface; i++) {
        const key = `${pos.getX(i).toFixed(2)}|${pos.getZ(i).toFixed(2)}`;
        const y = pos.getY(i);
        const prev = seen.get(key);
        if (prev === undefined) seen.set(key, y);
        else {
          shared++;
          expect(y).toBeCloseTo(prev, 3);
        }
      }
    }
    expect(shared).toBeGreaterThan(20);
  });

  it('bounding spheres enclose every vertex, skirts included', () => {
    const tile = ridgedTile();
    const t = new Terrain(tile, { ...base, chunkCells: 8 });
    const v = new THREE.Vector3();
    for (const child of t.group.children) {
      const geom = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
      const pos = geom.getAttribute('position');
      const sphere = geom.boundingSphere as THREE.Sphere;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        expect(sphere.center.distanceTo(v)).toBeLessThanOrEqual(sphere.radius + 1e-3);
      }
    }
  });
});

describe('Terrain chunk LOD', () => {
  it('drops to coarser index buffers as the camera pulls back', () => {
    const tile = ridgedTile(80, 80);
    const t = new Terrain(tile, base);
    const camera = new THREE.PerspectiveCamera(60, 1.6, 0.5, 60000);

    camera.position.set(0, -3000, 0);
    camera.lookAt(0, -3600, 0);
    t.update(camera);
    const nearLod0 = t.stats.lodCounts[0] as number;
    expect(nearLod0).toBeGreaterThan(0);

    camera.position.set(0, 20000, 0);
    camera.lookAt(0, -3600, 0);
    t.update(camera);
    expect(t.stats.lodCounts[0]).toBe(0);
    expect((t.stats.lodCounts[1] as number) + (t.stats.lodCounts[2] as number)).toBeGreaterThan(0);
    // Coarser LODs mean fewer triangles submitted.
    expect(t.stats.drawnTriangles).toBeLessThan(t.stats.triangles);
  });

  it('counts only the chunks inside the frustum', () => {
    const tile = ridgedTile(200, 200);
    const t = new Terrain(tile, base);
    const camera = new THREE.PerspectiveCamera(30, 1.6, 0.5, 4000);

    expect(t.stats.chunks).toBeGreaterThan(4);

    // A narrow cone aimed at the north-west corner cannot see the whole tile.
    camera.position.set(-t.widthM / 2, -3000, -t.depthM / 2);
    camera.lookAt(-t.widthM / 2, -3600, -t.depthM / 2 + 200);
    t.update(camera);
    const corner = t.stats.visibleChunks;
    expect(corner).toBeGreaterThan(0);
    expect(corner).toBeLessThan(t.stats.chunks);

    // Pointed straight up from well above the surface, nothing is in view.
    camera.position.set(0, 5000, 0);
    camera.lookAt(0, 9000, 0);
    t.update(camera);
    expect(t.stats.visibleChunks).toBe(0);
    expect(t.stats.drawnTriangles).toBe(0);
  });

  it('reports a tier and a subdivision factor in its stats', () => {
    const tile = ridgedTile(20, 20);
    expect(new Terrain(tile, base, 'low').stats.subdiv).toBe(base.tiers.low.detailSubdiv);
    expect(new Terrain(tile, base, 'high').stats.subdiv).toBe(base.tiers.high.detailSubdiv);
    const t = new Terrain(tile, base, 'medium');
    expect(t.stats.tier).toBe('medium');
    expect(t.debugString()).toContain('medium');
  });

  it('a higher tier resolves more vertices than a lower one', () => {
    const tile = ridgedTile(40, 40);
    const low = new Terrain(tile, base, 'low').stats.vertices;
    const med = new Terrain(tile, base, 'medium').stats.vertices;
    const high = new Terrain(tile, base, 'high').stats.vertices;
    expect(med).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(med);
  });
});

describe('Terrain vertex budget (Config.terrain.maxVertices)', () => {
  it('steps a big tile down 3 -> 2 -> 1 until cols*rows*subdiv^2 fits', () => {
    const budget = 4_000_000;
    // blake-plateau-corals: 1202 x 1201 cells.
    expect(fitSubdivToBudget(1202, 1201, 3, budget)).toBe(1); // 13.0M, 5.8M, 1.44M
    // endurance-sized, 1202 x 700: 7.6M at subdiv 3, 3.37M at 2 -> fits at 2.
    expect(fitSubdivToBudget(1202, 700, 3, budget)).toBe(2);
    expect(fitSubdivToBudget(1202, 700, 2, budget)).toBe(2);
    // Titanic 548 x 546 keeps high.
    expect(fitSubdivToBudget(548, 546, 3, budget)).toBe(3);
    // Never below 1, whatever the budget; a non-positive budget disables the cap.
    expect(fitSubdivToBudget(5000, 5000, 3, budget)).toBe(1);
    expect(fitSubdivToBudget(5000, 5000, 3, 0)).toBe(3);
  });

  it('a synthetic large tile is built at the reduced subdivision and says so', () => {
    const tile = ridgedTile(60, 50);
    // 60*50 = 3000 cells: 27k verts at subdiv 3, 12k at 2, 3k at 1.
    const cfg = { ...base, maxVertices: 15_000 };
    const t = new Terrain(tile, cfg, 'high');
    expect(t.stats.requestedSubdiv).toBe(3);
    expect(t.stats.subdiv).toBe(2);
    expect(t.debugString()).toContain('capped from 3');
    const surface = t.stats.vertices; // skirts included, still well under 2x budget
    expect(surface).toBeLessThan(2 * cfg.maxVertices);

    const tiny = new Terrain(tile, { ...base, maxVertices: 5_000 }, 'high');
    expect(tiny.stats.subdiv).toBe(1);

    const roomy = new Terrain(tile, { ...base, maxVertices: 1e9 }, 'high');
    expect(roomy.stats.subdiv).toBe(3);
    expect(roomy.debugString()).not.toContain('capped');
  });
});

/** Skirt runs are 2*nx + 2*nz vertices appended after the surface grid. */
function skirtVertexCount(geom: THREE.BufferGeometry): number {
  // Recover nx, nz from the unique X and Z values of the first row/column.
  const pos = geom.getAttribute('position');
  const xs = new Set<number>();
  const zs = new Set<number>();
  for (let i = 0; i < pos.count; i++) {
    xs.add(Math.round(pos.getX(i) * 100));
    zs.add(Math.round(pos.getZ(i) * 100));
  }
  const nx = xs.size;
  const nz = zs.size;
  return 2 * nx + 2 * nz;
}
