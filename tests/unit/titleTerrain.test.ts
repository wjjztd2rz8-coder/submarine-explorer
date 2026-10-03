import poisRaw from '../../public/data/landmarks/monterey-canyon/pois.json?raw';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  buildTitleCrop,
  loadTitleCrop,
  TITLE_ANCHOR,
} from '../../src/render/title/TitleTerrain.js';
import { METERS_PER_DEG_LAT, metersPerDegLon } from '../../src/util/geo.js';
import type { Tile } from '../../src/util/types.js';

/** Synthetic tile centred on the anchor: height = gx*east + gz*south + base. */
function tile(gx: number, gz: number, base = -300): Tile {
  const cols = 200;
  const rows = 200;
  const cs = 40;
  const lat = TITLE_ANCHOR.lat;
  const lon = TITLE_ANCHOR.lon;
  const dLat = (rows * cs) / 2 / METERS_PER_DEG_LAT;
  const dLon = (cols * cs) / 2 / metersPerDegLon(lat);
  const heights = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      heights[r * cols + c] =
        base + gx * (c - (cols - 1) / 2) * cs + gz * (r - (rows - 1) / 2) * cs;
  return {
    meta: {
      id: 't',
      cols,
      rows,
      cellsize_m_x: cs,
      cellsize_m_y: cs,
      center: { lat, lon },
      bbox: { north: lat + dLat, south: lat - dLat, east: lon + dLon, west: lon - dLon },
      min_m: -1000,
      max_m: 0,
    } as Tile['meta'],
    heights,
  };
}

describe('TitleTerrain', () => {
  it('matches the checked-in POI anchor', () => {
    const pois = JSON.parse(poisRaw) as { pois: { id: string; lat: number; lon: number }[] };
    const poi = pois.pois.find((p) => p.id === 'monterey-canyon-upper-channel')!;
    expect(poi.lat).toBe(TITLE_ANCHOR.lat);
    expect(poi.lon).toBe(TITLE_ANCHOR.lon);
  });

  it('rebases anchor floor to 0 and samples finite values', () => {
    const c = buildTitleCrop(tile(0.1, -0.2));
    expect(c.anchorFloorY).toBe(0);
    expect(c.halfSize).toBe(1200);
    expect(c.sampleFloor(0, 0)).toBeCloseTo(0, 3);
    for (const [x, z] of [
      [-5000, 5000],
      [1200, -1200],
      [37, 91],
    ] as const)
      expect(Number.isFinite(c.sampleFloor(x, z))).toBe(true);
    const pos = c.mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.array.length; i++) expect(Number.isFinite(pos.array[i])).toBe(true);
  });

  it('+X rises east and +Z (south) follows the row gradient, in real metres', () => {
    const c = buildTitleCrop(tile(0.1, -0.2));
    expect(c.sampleFloor(100, 0)).toBeCloseTo(10, 1); // no exaggeration
    expect(c.sampleFloor(-100, 0)).toBeCloseTo(-10, 1);
    expect(c.sampleFloor(0, 100)).toBeCloseTo(-20, 1); // south is down-row
    expect(c.sampleFloor(0, -100)).toBeCloseTo(20, 1); // north is up-row
  });

  it('clamps to the crop edge', () => {
    const c = buildTitleCrop(tile(0.1, 0));
    expect(c.sampleFloor(5000, 0)).toBeCloseTo(c.sampleFloor(1200, 0), 6);
    expect(c.sampleFloor(0, -9999)).toBeCloseTo(c.sampleFloor(0, -1200), 6);
  });

  it('mesh vertices agree with sampleFloor and stay under the triangle budget', () => {
    const c = buildTitleCrop(tile(0.1, -0.2));
    const g = c.mesh.geometry;
    const p = g.getAttribute('position');
    for (const v of [0, 1000, p.count - 1]) {
      expect(p.getY(v)).toBeCloseTo(c.sampleFloor(p.getX(v), p.getZ(v)), 3);
    }
    expect(g.index!.count / 3).toBeLessThan(60000);
    expect(p.getZ(0)).toBeLessThan(0); // row 0 is north
  });

  it('dispose frees owned geometry and material only', () => {
    const c = buildTitleCrop(tile(0, 0));
    const g = vi.fn();
    const m = vi.fn();
    c.mesh.geometry.addEventListener('dispose', g);
    (c.mesh.material as THREE.Material).addEventListener('dispose', m);
    c.dispose();
    expect(g).toHaveBeenCalledTimes(1);
    expect(m).toHaveBeenCalledTimes(1);
  });

  it('loadTitleCrop builds from the loader and propagates rejection', async () => {
    const c = await loadTitleCrop(async () => tile(0, 0));
    expect(c.sampleFloor(0, 0)).toBeCloseTo(0, 3);
    c.dispose();
    await expect(loadTitleCrop(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
