import { describe, expect, it } from 'vitest';
import { terrainCarveFor, BLUE_HOLE_RADIUS_M } from '../../src/world/terrainFeatures.js';
import type { TileMeta } from '../../src/util/types.js';

const meta = {
  id: 'great-blue-hole',
  center: { lat: 17.31519753916774, lon: -87.53411865234375 },
} as unknown as TileMeta;

describe('Blue Hole carve', () => {
  const carve = terrainCarveFor(meta)!;
  const { x, z } = carve.centre;
  it('only exists for the Blue Hole tile', () => {
    expect(terrainCarveFor({ ...meta, id: 'titanic' } as TileMeta)).toBeNull();
  });
  it('digs a ~125 m deep hole under a 4 m deep shelf and leaves the shelf alone outside', () => {
    expect(carve.apply(x, z, -4)).toBeLessThan(-120);
    expect(carve.apply(x + BLUE_HOLE_RADIUS_M * 2, z, -4)).toBe(-4);
    expect(carve.apply(x + 300, z, -4)).toBe(-4);
  });
  it('never raises the seabed', () => {
    for (const r of [0, 60, 120, 150, 175, 200, 230]) {
      expect(carve.apply(x + r, z, -500)).toBe(-500);
    }
  });
  it('has a ledge near 40 m', () => {
    const h = carve.apply(x + 140, z, -4);
    expect(h).toBeLessThan(-30);
    expect(h).toBeGreaterThan(-50);
  });
});
