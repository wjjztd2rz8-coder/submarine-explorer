// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { MONTEREY_FIDELITY } from '../../src/core/config/terrain.js';
import type { GraphicsTier } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { makeSyntheticTile } from './helpers.js';

// Inspect cache lifetime and replace only the memo lookup to exercise the exact
// pre-memoisation calculation, retaining real patch selection and interpolation.
interface MemoInternals {
  latticeHeights: Map<number, number>;
  latticeHeight(gx: number, gz: number, s: number, x: number, z: number): number;
  surfaceHeight(x: number, z: number): number;
}
const memo = (t: Terrain) => t as unknown as MemoInternals;

function fixture(id = 'memo-fixture', offset = 0, tier: GraphicsTier = 'low') {
  const tile = makeSyntheticTile({
    id,
    cols: 49,
    rows: 41,
    centerLat: 17.3156,
    centerLon: -87.5356,
    cellsizeDeg: 0.0001,
    // Integer survey values keep depth offsets exact after Float32 storage.
    height: (c, r) => -250 + offset + Math.round(c * 1.8 + r * 0.7 + Math.sin(c * r) * 4),
  });
  const config = makeConfig().terrain;
  config.fidelity = {
    [id]: {
      ...MONTEREY_FIDELITY,
      resolveLow: true,
      focus: { ...tile.meta.center, radiusM: 35, fadeM: 20 },
      chunkCells: 8,
      nearSubdiv: { low: 4, medium: 4, high: 8 },
    },
  };
  return new Terrain(tile, config, tier);
}

describe('1290 terrain lattice memoisation', () => {
  for (const site of ['great-blue-hole', 'lost-city']) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${site} ${tier}: shipped survey/profile samples retain pre-cache elevations`, () => {
        const config = makeConfig().terrain;
        const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
        const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
        const t = new Terrain(
          {
            meta,
            heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
          },
          config,
          tier,
        );
        try {
          const focus = latLonToWorld(
            meta,
            config.fidelity![site]!.focus.lat,
            config.fidelity![site]!.focus.lon,
          );
          const points: Array<[number, number]> = [-500, -250, -50, 0, 50, 250, 500].flatMap((dx) =>
            [-100, 0, 100].map((dz): [number, number] => [
              focus.x + dx + 0.123,
              focus.z + dz + 0.789,
            ]),
          );
          // Include the shared inner chunk boundaries and the survey's outer edges.
          for (const col of [0, 8, 16, meta.cols - 1])
            for (const row of [0, 8, 16, meta.rows - 1])
              points.push([t.worldXOfCol(col), t.worldZOfRow(row)]);
          const lookup = vi
            .spyOn(memo(t), 'latticeHeight')
            .mockImplementation((_gx, _gz, _s, x, z) => memo(t).surfaceHeight(x, z));
          const previous = points.map(([x, z]) => t.sampleHeight(x, z));
          lookup.mockRestore();
          for (let pass = 0; pass < 2; pass++)
            for (let i = points.length - 1; i >= 0; i--)
              expect(Math.abs(t.sampleHeight(...points[i]) - previous[i])).toBeLessThan(1e-9);
        } finally {
          t.dispose();
        }
      });
    }
  }

  for (const site of ['memo-fixture', 'great-blue-hole']) {
    for (const tier of ['low', 'medium', 'high'] as const) {
      it(`${site} ${tier}: agrees with pre-cache values across triangles, patch seams and edges`, () => {
        const t = fixture(site, 0, tier);
        try {
          expect(Object.keys(t.stats.subdivisionCounts!).length).toBeGreaterThan(1);
          const points: Array<[number, number]> = [];
          // Both triangle halves, subdivision transitions and repeated patch corners.
          for (let c = 0; c <= 48; c += 4)
            for (let r = 0; r <= 40; r += 4)
              for (const delta of [-0.01, 0, 0.12, 0.81])
                points.push([t.worldXOfCol(c + delta), t.worldZOfRow(r + delta)]);
          const lookup = vi
            .spyOn(memo(t), 'latticeHeight')
            .mockImplementation((_gx, _gz, _s, x, z) => memo(t).surfaceHeight(x, z));
          const before = points.map(([x, z]) => t.sampleHeight(x, z));
          lookup.mockRestore();
          const cold = points.map(([x, z]) => t.sampleHeight(x, z));
          for (let i = 0; i < points.length; i++)
            expect(Math.abs(cold[i] - before[i]), `sample ${points[i]}`).toBeLessThan(1e-9);
          // Reverse traversal catches query-order dependence at shared boundaries.
          for (let i = points.length - 1; i >= 0; i--)
            expect(Math.abs(t.sampleHeight(...points[i]) - before[i])).toBeLessThan(1e-9);
        } finally {
          t.dispose();
        }
      });
    }
  }

  it('reuses the same corners without recomputing the surface', () => {
    const t = fixture();
    try {
      const surface = vi.spyOn(memo(t), 'surfaceHeight');
      const first = t.sampleHeight(1.1, 2.3);
      expect(surface).toHaveBeenCalledTimes(3);
      surface.mockClear();
      expect(t.sampleHeight(1.1, 2.3)).toBe(first);
      expect(surface).not.toHaveBeenCalled();
      surface.mockRestore();
    } finally {
      t.dispose();
    }
  });

  it('isolates different sites and rebuilt tiles with different survey heights', () => {
    const a = fixture();
    const other = fixture('other-site', -500);
    const rebuilt = fixture('memo-fixture', -1000);
    try {
      const height = a.sampleHeight(1.1, 2.3);
      expect(other.sampleHeight(1.1, 2.3)).toBeCloseTo(height - 500, 9);
      expect(rebuilt.sampleHeight(1.1, 2.3)).toBeCloseTo(height - 1000, 9);
      expect(a.sampleHeight(1.1, 2.3)).toBe(height);
    } finally {
      a.dispose();
      other.dispose();
      rebuilt.dispose();
    }
  });

  it('evicts at the 400,000-entry bound and recomputes identical samples', () => {
    const t = fixture();
    try {
      const height = t.sampleHeight(1.1, 2.3);
      const cache = memo(t).latticeHeights;
      // Represent a long traversal without building a huge tile in a unit test.
      for (let key = -400_000; cache.size < 400_000; key++) cache.set(key, -9999);
      t.sampleHeight(110.1, 112.3);
      expect(cache.size).toBeLessThanOrEqual(3);
      expect(t.sampleHeight(1.1, 2.3)).toBe(height);
      expect(cache.size).toBeLessThanOrEqual(6);
    } finally {
      t.dispose();
    }
  });

  it('releases cached heights when the terrain is disposed', () => {
    const t = fixture();
    t.sampleHeight(1.1, 2.3);
    expect(memo(t).latticeHeights.size).toBeGreaterThan(0);
    t.dispose();
    expect(memo(t).latticeHeights.size).toBe(0);
  });
});
