// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { fetchContentJson } from '../../src/game/ContentPath.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import {
  Currents,
  guardCurrentDelta,
  sampleCurrentGrid,
  validateCurrentGrid,
  type CurrentGrid,
  type CurrentVector,
} from '../../src/world/Currents.js';

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const catalogue = readJson('data/tiles/index.json').tiles as { id: string; source: string }[];
const sites = (readJson('data/landmarks/index.json').landmarks as string[]).map((site) => ({
  site,
  tile: readJson(`data/landmarks/${site}/mission.json`).tile as string,
}));
const readGrid = (site: string): CurrentGrid => readJson(`data/currents/${site}.json`);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function expectFlow(
  currents: Currents,
  x: number,
  z: number,
  out: CurrentVector,
  eastNorth: readonly number[] | null,
) {
  expect(currents.sample(x, z, out)).toBe(out);
  expect(out.x).toBeCloseTo(eastNorth?.[0] ?? 0, 12);
  expect(out.y).toBe(0);
  expect(out.z).toBeCloseTo(-(eastNorth?.[1] ?? 0), 12);
}

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
  it('maps the complete real-site catalogue to current documents and leaves the demo optional', async () => {
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.map(({ tile }) => tile).sort()).toEqual(
      catalogue
        .filter(({ source }) => source === 'GMRT')
        .map(({ id }) => id)
        .sort(),
    );
    expect(readdirSync('data/currents').sort()).toEqual(
      sites.map(({ site }) => `${site}.json`).sort(),
    );
    expect(catalogue.find(({ source }) => source === 'synthetic')?.id).toBe('demo-synthetic');
    expect(existsSync('data/currents/demo-synthetic.json')).toBe(false);
    const requests: string[] = [];
    const currents = new Currents('demo-synthetic', 'demo-synthetic', (url) =>
      fetchContentJson(url, async (requested) => {
        requests.push(requested);
        return { ok: false, status: 404, text: async () => '<html>Not found</html>' };
      }),
    );
    expect(currents.status).toBe('loading');
    await currents.ready;
    expect(requests).toEqual([`${import.meta.env.BASE_URL}data/currents/demo-synthetic.json`]);
    expect(currents.status).toBe('missing');
    expect(currents.grid).toBeNull();
    expectFlow(currents, 0, 0, { x: 1, y: 2, z: 3 }, null);
  });

  it.each(sites)(
    '$site admits its shipped tile grid and samples authored nodes under both deployment bases',
    async ({ site, tile }) => {
      const meta = readJson(`data/tiles/${tile}/meta.json`) as TileMeta;
      const body = readFileSync(`data/currents/${site}.json`, 'utf8') as string;
      const raw = JSON.parse(body) as CurrentGrid;
      expect(meta.id).toBe(tile);
      // Runtime requests currents using the loaded tile identity, not a landmark override.
      expect(site).toBe(meta.id);
      expect(raw).toMatchObject({ version: 1, site, tile, cols: 3, rows: 3 });
      const northwest = latLonToWorld(meta, meta.bbox.north, meta.bbox.west);
      const southeast = latLonToWorld(meta, meta.bbox.south, meta.bbox.east);
      expect(raw.bounds.x_min).toBeCloseTo(northwest.x, 3);
      expect(raw.bounds.z_min).toBeCloseTo(northwest.z, 3);
      expect(raw.bounds.x_max).toBeCloseTo(southeast.x, 3);
      expect(raw.bounds.z_max).toBeCloseTo(southeast.z, 3);

      for (const base of ['/', '/submarine-explorer/']) {
        vi.stubEnv('BASE_URL', base);
        try {
          const requests: string[] = [];
          const currents = new Currents(meta.id, meta.id, (url) =>
            fetchContentJson(url, async (requested) => {
              requests.push(requested);
              return { ok: true, text: async () => body };
            }),
          );
          expect(currents.status).toBe('loading');
          expectFlow(currents, 0, 0, { x: 1, y: 2, z: 3 }, null);
          await currents.ready;
          expect(requests).toEqual([`${base}data/currents/${site}.json`]);
          expect(currents.status).toBe('ready');
          expect(currents.grid).toEqual(raw);
          expect(currents.grid!.source).toEqual(raw.source);
          const out = { x: 1, y: 2, z: 3 };
          for (let row = 0; row < raw.rows; row++) {
            expect(raw.vectors[row]).toHaveLength(raw.cols);
            for (let col = 0; col < raw.cols; col++) {
              const x =
                raw.bounds.x_min + (col * (raw.bounds.x_max - raw.bounds.x_min)) / (raw.cols - 1);
              const z =
                raw.bounds.z_min + (row * (raw.bounds.z_max - raw.bounds.z_min)) / (raw.rows - 1);
              expectFlow(currents, x, z, out, raw.vectors[row]![col]!);
            }
          }
          expect(currents.grid).toEqual(JSON.parse(body));
        } finally {
          vi.unstubAllEnvs();
        }
      }
    },
  );

  it.each([
    { site: 'monterey-canyon', xFraction: 0, zFraction: 0.75, flow: [0.041, -0.034] },
    { site: 'monterey-canyon', xFraction: 0.25, zFraction: 0, flow: null },
    { site: 'hudson-canyon', xFraction: 0, zFraction: 0.25, flow: null },
    { site: 'titanic', xFraction: 0.75, zFraction: 1, flow: [0.078, 0.146] },
  ])(
    '$site keeps authored wet or masked edge flow at ($xFraction, $zFraction)',
    async ({ site, xFraction, zFraction, flow }) => {
      const raw = readGrid(site);
      const currents = new Currents(site, raw.tile, async () => raw);
      await currents.ready;
      const b = raw.bounds;
      // These edge midpoints use the two adjacent authored vectors, not the sampler as oracle.
      expectFlow(
        currents,
        b.x_min + xFraction * (b.x_max - b.x_min),
        b.z_min + zFraction * (b.z_max - b.z_min),
        { x: 1, y: 2, z: 3 },
        flow,
      );
    },
  );

  it.each([
    'success',
    'wrong site',
    'wrong tile',
    'unattributed',
    'ragged rows',
    'invalid JSON',
    'rejected',
  ] as const)('keeps pre-ready flow zero and settles a late %s load', async (outcome) => {
    const raw = readGrid('titanic');
    if (outcome === 'wrong site') raw.site = 'lost-city';
    if (outcome === 'wrong tile') raw.tile = 'lost-city';
    if (outcome === 'unattributed') raw.source.license = '';
    if (outcome === 'ragged rows') raw.vectors[0]!.pop();
    const pending = deferred<string>();
    const currents = new Currents('titanic', 'titanic', (url) =>
      fetchContentJson(url, async () => ({ ok: true, text: () => pending.promise })),
    );
    const out = { x: 1, y: 2, z: 3 };
    for (let i = 0; i < 2; i++) {
      Object.assign(out, { x: 1, y: 2, z: 3 });
      expect(currents.status).toBe('loading');
      expect(currents.grid).toBeNull();
      expectFlow(currents, 0, 0, out, null);
      await Promise.resolve();
    }
    if (outcome === 'rejected') pending.reject(new Error('local content unavailable'));
    else pending.resolve(outcome === 'invalid JSON' ? '{' : JSON.stringify(raw));
    await expect(currents.ready).resolves.toBeUndefined();
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
    expect(currents.status).toBe(outcome === 'success' ? 'ready' : 'missing');
    expect(currents.grid).toEqual(outcome === 'success' ? raw : null);
    Object.assign(out, { x: 1, y: 2, z: 3 });
    expectFlow(currents, 0, 0, out, outcome === 'success' ? [-0.018, 0.003] : null);
  });

  it.each(['monterey-canyon', 'titanic'])(
    'isolates documents and reusable output when %s completes first',
    async (firstSite) => {
      const entries = ['monterey-canyon', 'titanic'].map((site) => {
        const raw = readGrid(site);
        const before = JSON.stringify(raw);
        const pending = deferred<unknown>();
        return {
          raw,
          before,
          pending,
          currents: new Currents(site, raw.tile, () => pending.promise),
        };
      });
      const first = entries.find(({ raw }) => raw.site === firstSite)!;
      const second = entries.find(({ raw }) => raw.site !== firstSite)!;
      const out = { x: 1, y: 2, z: 3 };
      expectFlow(first!.currents, 0, 0, out, null);
      expectFlow(second!.currents, 0, 0, out, null);
      first!.pending.resolve(first!.raw);
      await first!.currents.ready;
      expect(first!.currents.status).toBe('ready');
      expect(second!.currents.status).toBe('loading');
      expectFlow(first!.currents, 0, 0, out, first!.raw.vectors[1]![1]!);
      expectFlow(second!.currents, 0, 0, out, null);
      Object.assign(out, { x: 7, y: 8, z: 9 });
      second!.pending.resolve(second!.raw);
      await second!.currents.ready;
      expect(out).toEqual({ x: 7, y: 8, z: 9 });
      for (const entry of [...entries, ...entries].reverse()) {
        expect(entry.currents.status).toBe('ready');
        expectFlow(entry.currents, 0, 0, out, entry.raw.vectors[1]![1]!);
        expectFlow(
          entry.currents,
          entry.raw.bounds.x_min,
          entry.raw.bounds.z_min,
          out,
          entry.raw.vectors[0]![0]!,
        );
        Object.assign(out, { x: 7, y: 8, z: 9 });
        expect(JSON.stringify(entry.raw)).toBe(entry.before);
        expect(JSON.stringify(entry.currents.grid)).toBe(entry.before);
      }
    },
  );

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
