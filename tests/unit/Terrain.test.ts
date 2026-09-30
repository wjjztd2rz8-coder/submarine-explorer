import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
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
