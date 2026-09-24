import { describe, expect, it } from 'vitest';
import {
  Currents,
  guardCurrentDelta,
  sampleCurrentGrid,
  validateCurrentGrid,
  type CurrentGrid,
} from '../../src/world/Currents.js';

const grid: CurrentGrid = {
  version: 1,
  site: 'test',
  tile: 'test',
  source: {
    name: 'test source',
    url: 'https://example.org/current',
    sampled_at: '2024-01-15T12:00:00Z',
    fetched_at: '2026-09-23T00:00:00Z',
    license: 'public release',
    depth_m: 100,
  },
  bounds: { x_min: -10, x_max: 10, z_min: -10, z_max: 10 },
  cols: 2,
  rows: 2,
  vectors: [
    [
      [0, 0],
      [1, 0],
    ],
    [
      [0, 1],
      [1, 1],
    ],
  ],
};

describe('offline currents', () => {
  it('interpolates east/north vectors in world X/Z and clamps past the grid edge', () => {
    const out = { x: 0, y: 5, z: 0 };
    expect(sampleCurrentGrid(grid, 0, 0, out)).toEqual({ x: 0.5, y: 0, z: -0.5 });
    expect(sampleCurrentGrid(grid, 500, -500, out)).toEqual({ x: 1, y: 0, z: 0 });
    expect(sampleCurrentGrid(grid, -500, 500, out)).toEqual({ x: 0, y: 0, z: -1 });
    expect(sampleCurrentGrid(grid, NaN, 0, out)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('keeps masked cells zero without inventing a nearby current', () => {
    const masked = {
      ...grid,
      vectors: [
        [null, [1, 0]],
        [[0, 1], null],
      ] as CurrentGrid['vectors'],
    };
    expect(sampleCurrentGrid(masked, -10, -10, { x: 1, y: 1, z: 1 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(sampleCurrentGrid(masked, 0, 0, { x: 1, y: 1, z: 1 })).toEqual({
      x: 0.25,
      y: 0,
      z: -0.25,
    });
  });

  it('rejects a mismatched or unattributed grid and falls back to zero on fetch failure', async () => {
    expect(validateCurrentGrid(grid, 'another')).toBeNull();
    expect(
      validateCurrentGrid({ ...grid, source: { ...grid.source, license: '' } }, 'test'),
    ).toBeNull();
    const currents = new Currents('absent', 'absent', async () => {
      throw new Error('missing file');
    });
    await currents.ready;
    expect(currents.status).toBe('missing');
    expect(currents.sample(0, 0, { x: 1, y: 1, z: 1 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('guards a current impulse at the tile edge or toward rising terrain', () => {
    const terrain = { widthM: 20, depthM: 20, sampleHeight: (x: number) => (x > 2 ? -5 : -20) };
    const floorFor = (ground: number) => ground + 2;
    const position = { x: 1, y: -10, z: 0 };
    const velocity = { x: 0, y: 0, z: 0 };
    expect(
      guardCurrentDelta({ x: 4, y: 0, z: 0 }, position, velocity, terrain, floorFor, 1, 1),
    ).toEqual({ x: 0, y: 0, z: 0 });
    expect(
      guardCurrentDelta(
        { x: 2, y: 0, z: 0 },
        { ...position, x: 9 },
        velocity,
        terrain,
        floorFor,
        1,
        1,
      ).x,
    ).toBe(0);
  });
});
