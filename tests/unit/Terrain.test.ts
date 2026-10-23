// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { TileMeta } from '../../src/util/types.js';
import { DEFAULT_CONFIG, makeConfig } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { makeSyntheticTile } from './helpers.js';

/**
 * Most of these tests pin the *measured* surface, so they run with the
 * procedural detail layer switched off. The detail layer has its own file,
 * tests/unit/terrain-detail.test.ts.
 */
const cfg = { ...DEFAULT_CONFIG.terrain, detailStrength: 0 };

describe('Terrain.sampleHeight', () => {
  it('reproduces grid values exactly at cell centres', () => {
    const tile = makeSyntheticTile({ cols: 6, rows: 5, height: (c, r) => -1000 - c * 7 - r * 13 });
    const t = new Terrain(tile, cfg);
    for (let r = 0; r < tile.meta.rows; r++) {
      for (let c = 0; c < tile.meta.cols; c++) {
        const x = t.worldXOfCol(c);
        const z = t.worldZOfRow(r);
        expect(t.sampleHeight(x, z)).toBeCloseTo(-1000 - c * 7 - r * 13, 3);
      }
    }
  });

  it('interpolates bilinearly between four cells', () => {
    // A 2x2 grid with corner values 0, 10 / 20, 40.
    const values = [0, 10, 20, 40];
    const tile = makeSyntheticTile({
      cols: 2,
      rows: 2,
      height: (c, r) => values[r * 2 + c] as number,
    });
    const t = new Terrain(tile, cfg);
    const x0 = t.worldXOfCol(0);
    const x1 = t.worldXOfCol(1);
    const z0 = t.worldZOfRow(0);
    const z1 = t.worldZOfRow(1);

    // Midpoint of the top edge: (0 + 10)/2.
    expect(t.sampleHeight((x0 + x1) / 2, z0)).toBeCloseTo(5, 5);
    // Midpoint of the left edge: (0 + 20)/2.
    expect(t.sampleHeight(x0, (z0 + z1) / 2)).toBeCloseTo(10, 5);
    // Centre: mean of all four.
    expect(t.sampleHeight((x0 + x1) / 2, (z0 + z1) / 2)).toBeCloseTo(17.5, 5);
    // Quarter point along x on the top edge.
    expect(t.sampleHeight(x0 + (x1 - x0) * 0.25, z0)).toBeCloseTo(2.5, 5);
  });

  it('is exact on a linear ramp (bilinear reproduces planes)', () => {
    const tile = makeSyntheticTile({ cols: 9, rows: 7, height: (c, r) => c * 3 + r * 5 });
    const t = new Terrain(tile, cfg);
    for (const [fc, fr] of [
      [2.3, 1.7],
      [0.5, 5.5],
      [7.9, 0.1],
    ] as const) {
      const x = t.worldXOfCol(0) + fc * tile.meta.cellsize_m_x;
      const z = t.worldZOfRow(0) + fr * tile.meta.cellsize_m_y;
      expect(t.sampleHeight(x, z)).toBeCloseTo(fc * 3 + fr * 5, 3);
    }
  });

  it('clamps outside the tile instead of extrapolating', () => {
    const tile = makeSyntheticTile({ cols: 4, rows: 4, height: (c, r) => -100 - c - r });
    const t = new Terrain(tile, cfg);
    const cornerNW = t.sampleHeight(t.worldXOfCol(0), t.worldZOfRow(0));
    expect(t.sampleHeight(-1e9, -1e9)).toBeCloseTo(cornerNW, 5);
    const cornerSE = t.sampleHeight(t.worldXOfCol(3), t.worldZOfRow(3));
    expect(t.sampleHeight(1e9, 1e9)).toBeCloseTo(cornerSE, 5);
  });

  it('applies the configured vertical exaggeration', () => {
    const tile = makeSyntheticTile({ cols: 4, rows: 4, height: () => -200 });
    const plain = new Terrain(tile, { ...cfg, verticalExaggeration: 1 });
    const exaggerated = new Terrain(tile, { ...cfg, verticalExaggeration: 2.5 });
    expect(plain.sampleHeight(0, 0)).toBeCloseTo(-200, 5);
    expect(exaggerated.sampleHeight(0, 0)).toBeCloseTo(-500, 5);
  });
});

// CPU intersections use the generated positions and indices, independently of
// the height sampler's patch selection and interpolation.
function meshHeight(t: Terrain, x: number, z: number): number {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObjects(t.group.children.filter((o) => o instanceof THREE.Mesh))[0];
  expect(hit, `triangle at ${x}, ${z}`).toBeDefined();
  return hit.point.y;
}

describe('Terrain near ground contact', () => {
  it.each([16 / 9, 9 / 16])(
    'keeps first-person clearance and aim together on Low triangles (aspect %s)',
    (aspect) => {
      const config = makeConfig();
      // A nonplanar bank makes bilinear heights differ from the actual triangles.
      const tile = makeSyntheticTile({
        cols: 9,
        rows: 9,
        height: (c, r) => -1000 - r * 160 - c * r * 30,
      });
      const terrain = new Terrain(tile, config.terrain, 'low');
      try {
        const x = terrain.worldXOfCol(3.2);
        const z = terrain.worldZOfRow(3.2);
        const floor = meshHeight(terrain, x, z);
        const offset = config.camera.firstPersonOffset;
        const pilot = new THREE.Vector3(
          x - offset.x,
          floor + config.camera.terrainClearance - offset.y - 0.25,
          z - offset.z,
        );
        // A valid hull on the downslope can still put its eye too near the bank.
        expect(pilot.y - meshHeight(terrain, pilot.x, pilot.z)).toBeGreaterThan(
          config.submarine.hullRadius + config.submarine.seabedClearance,
        );
        const rig = new CameraRig(config.camera, aspect, terrain);
        rig.setMode('first-person');
        for (const dt of [0, 1 / 60]) {
          rig.update(pilot, 0, 0, dt);
          const eye = rig.camera.position;
          expect(eye.x).toBeCloseTo(x, 8);
          expect(eye.z).toBeCloseTo(z, 8);
          expect(eye.y - meshHeight(terrain, eye.x, eye.z)).toBeCloseTo(
            config.camera.terrainClearance,
            3,
          );
          expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
          expect(
            rig.camera
              .getWorldDirection(new THREE.Vector3())
              .distanceTo(new THREE.Vector3(0, 0, -1)),
          ).toBeLessThan(1e-6);
        }
      } finally {
        terrain.dispose();
      }
    },
  );

  it('matches shipped Lost City Low triangles between vertices and at chunk/tile edges', () => {
    const meta = JSON.parse(readFileSync('data/tiles/lost-city/meta.json', 'utf8')) as TileMeta;
    const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
    const t = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      makeConfig().terrain,
      'low',
    );
    try {
      const points: Array<[number, number]> = [[68.37023588203485, -190.23966161489727]];
      // Opposite triangle interiors; source/chunk boundaries and both sides of them.
      for (const c of [0, 63, 64, 127, meta.cols - 2])
        for (const r of [0, 63, 64, 127, meta.rows - 2])
          for (const f of [0.2, 0.8]) points.push([t.worldXOfCol(c + f), t.worldZOfRow(r + f)]);
      for (const c of [64, 128])
        for (const delta of [-0.001, 0, 0.001]) {
          points.push([t.worldXOfCol(c + delta), t.worldZOfRow(64.37)]);
          points.push([t.worldXOfCol(64.37), t.worldZOfRow(c + delta)]);
        }
      // Use the common supported Float32 mesh / double survey extent, including corners.
      const xEdge = Math.min(t.widthM / 2, Math.fround(t.widthM / 2));
      const zEdge = Math.min(t.depthM / 2, Math.fround(t.depthM / 2));
      for (const f of [0, 0.37, 1]) {
        for (const sign of [-1, 1]) {
          points.push([sign * xEdge, (2 * f - 1) * zEdge]);
          points.push([(2 * f - 1) * xEdge, sign * zEdge]);
        }
      }
      for (const [x, z] of points)
        expect(Math.abs(t.sampleHeight(x, z) - meshHeight(t, x, z)), `${x}, ${z}`).toBeLessThan(
          0.001,
        );
    } finally {
      t.dispose();
    }
  });

  it('preserves uncarved pure-data bilinear sampling despite its triangle approximation', () => {
    const tile = makeSyntheticTile({
      cols: 2,
      rows: 2,
      height: (c, r) => [0, -10, -20, -40][r * 2 + c],
    });
    const t = new Terrain(tile, cfg, 'low');
    try {
      // The bilinear centre is -17.5; the actual diagonal joins -10 and -20.
      expect(t.sampleHeight(0, 0)).toBeCloseTo(-17.5, 5);
      expect(meshHeight(t, 0, 0)).toBeCloseTo(-15, 5);
      expect(t.sampleHeight(0, 0)).toBe(t.sampleDataHeight(0, 0));
    } finally {
      t.dispose();
    }
  });

  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${tier}: keeps unprofiled detail and out-of-tile contracts explicit`, () => {
      const tile = makeSyntheticTile({
        cols: 9,
        rows: 9,
        height: (c, r) => -1000 + c * r * 3,
      });
      const t = new Terrain(tile, DEFAULT_CONFIG.terrain, tier);
      try {
        for (const f of [0.2, 0.8]) {
          const x = t.worldXOfCol(3 + f),
            z = t.worldZOfRow(3 + f);
          if (tier === 'low')
            expect(Math.abs(t.sampleHeight(x, z) - meshHeight(t, x, z))).toBeLessThan(0.001);
          else expect(t.sampleHeight(x, z)).toBe(t.sampleDataHeight(x, z) + t.detailHeight(x, z));
        }
        const x = t.widthM / 2 + 10,
          z = 2.3;
        expect(t.contains(x, z)).toBe(false);
        expect(t.sampleHeight(x, z)).toBe(t.sampleDataHeight(x, z) + t.detailHeight(x, z));
      } finally {
        t.dispose();
      }
    });
  }
});

describe('Terrain.getNormal', () => {
  it('points straight up on a flat seabed', () => {
    const tile = makeSyntheticTile({ cols: 6, rows: 6, height: () => -3000 });
    const n = new Terrain(tile, cfg).getNormal(0, 0);
    expect(n.x).toBeCloseTo(0, 6);
    expect(n.y).toBeCloseTo(1, 6);
    expect(n.z).toBeCloseTo(0, 6);
    expect(n.length()).toBeCloseTo(1, 6);
  });

  it('tilts away from rising ground and stays unit length', () => {
    // Height increases with +X (east), so the normal must lean west (-X).
    const tile = makeSyntheticTile({ cols: 8, rows: 8, height: (c) => -3000 + c * 30 });
    const n = new Terrain(tile, cfg).getNormal(0, 0);
    expect(n.x).toBeLessThan(0);
    expect(n.y).toBeGreaterThan(0);
    expect(n.z).toBeCloseTo(0, 6);
    expect(n.length()).toBeCloseTo(1, 6);
  });
});

describe('Terrain meshing', () => {
  it('splits a large grid into chunks and covers every cell', () => {
    const tile = makeSyntheticTile({ cols: 300, rows: 200 });
    const t = new Terrain(tile, { ...cfg, chunkCells: 128 }, 'low');
    // ceil(299/128) = 3 columns of chunks, ceil(199/128) = 2 rows.
    expect(t.stats.chunks).toBe(6);
    expect(t.group.children.filter((c) => (c as THREE.Mesh).isMesh).length).toBe(6);
    // At the 'low' tier subdiv is 1, so the surface is exactly the data grid;
    // the extra triangles are the per-chunk crack-hiding skirts.
    const surfaceTris = (300 - 1) * (200 - 1) * 2;
    expect(t.stats.triangles).toBeGreaterThan(surfaceTris);
    expect(t.stats.triangles).toBeLessThan(surfaceTris * 1.05);
  });

  it('reports the tile extent in metres', () => {
    const tile = makeSyntheticTile({ cols: 10, rows: 20 });
    const t = new Terrain(tile, cfg);
    expect(t.widthM).toBeCloseTo(9 * tile.meta.cellsize_m_x, 6);
    expect(t.depthM).toBeCloseTo(19 * tile.meta.cellsize_m_y, 6);
    expect(t.contains(0, 0)).toBe(true);
    expect(t.contains(t.widthM, 0)).toBe(false);
  });

  it('maps the depth ramp monotonically from deep to shallow', () => {
    const tile = makeSyntheticTile({ cols: 4, rows: 4 });
    const t = new Terrain(tile, cfg);
    const deep = t.colorForDepth(-6000).clone();
    const shallow = t.colorForDepth(-20).clone();
    // Deeper is darker.
    expect(deep.r + deep.g + deep.b).toBeLessThan(shallow.r + shallow.g + shallow.b);
    // Out-of-range depths clamp rather than wrap.
    expect(t.colorForDepth(-99999).getHex()).toBe(t.colorForDepth(-6000).getHex());
    expect(t.colorForDepth(99999).getHex()).toBe(t.colorForDepth(300).getHex());
  });
});
