// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { Input } from '../../src/core/Input.js';
import { DISCOVERY_STORAGE_KEY, DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import {
  TileLoadError,
  TileLoader,
  decodeHeightmap,
  decodeHeightmap16,
  validateMeta,
} from '../../src/world/TileLoader.js';
import { makeFakeFetch, makeSyntheticTile } from './helpers.js';

afterEach(() => vi.unstubAllGlobals());

describe('F-BUGHUNT-5 input and discovery regressions', () => {
  it('fires gamepad toggles once per press while scan/boost stay held, and rearms after disconnect', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    const pad = { index: 0, connected: true, axes: [0, 0, 0, 0], buttons };
    vi.stubGlobal('navigator', { getGamepads: () => (pad.connected ? [pad] : []) });
    const input = new Input({ storage: null });
    const edges = [
      'toggleCamera',
      'toggleLights',
      'toggleSonar',
      'togglePhotoMode',
      'cycleSimSpeed',
    ] as const;
    for (const index of [2, 3, 5, 7, 8, 9, 12]) buttons[index] = { pressed: true, value: 1 };
    for (const edge of edges) expect(input.sample()[edge]).toBe(true);
    input.endFrame();
    for (const edge of edges) expect(input.sample()[edge]).toBe(false);
    expect(input.state.scan).toBe(true);
    expect(input.state.boost).toBe(true);
    for (const button of buttons) Object.assign(button, { pressed: false, value: 0 });
    input.sample();
    input.endFrame();
    buttons[9] = { pressed: true, value: 1 };
    expect(input.sample().togglePhotoMode).toBe(true);
    input.endFrame();
    pad.connected = false;
    expect(input.sample().togglePhotoMode).toBe(false);
    expect(input.state.scan).toBe(false);
    pad.connected = true;
    expect(input.sample().togglePhotoMode).toBe(true);
    input.dispose();
  });

  it('keeps extreme finite discovery counters finite through scans and reloads', () => {
    const at = '2026-10-03T00:00:00.000Z';
    const data = new Map([
      [
        DISCOVERY_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          discovered: {
            'lost-city/poseidon': { at, count: 1e308 },
            'lost-city/imax': { at, count: 1e308 },
          },
          stats: { scans: 1e308 },
        }),
      ],
    ]);
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
    const store = new DiscoveryStore(storage);
    expect(Number.isSafeInteger(store.stats.scans)).toBe(true);
    expect(Number.isSafeInteger(store.get('lost-city', 'poseidon')!.count)).toBe(true);
    store.record('lost-city', 'poseidon');
    store.record('lost-city', 'beehive');
    expect(store.stats.scans).toBe(Number.MAX_SAFE_INTEGER);
    expect(new DiscoveryStore(storage).snapshot()).toEqual(store.snapshot());
    expect(store.get('lost-city', 'beehive')!.count).toBe(1);
  });
});

describe('F-BUGHUNT-5 tile loading boundary', () => {
  it('accepts shipped tile metadata and finite canonical/quantised heightmaps', () => {
    const buffer = (path: string): ArrayBuffer => {
      const bytes = readFileSync(path);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    };
    const sites: string[] = readdirSync('data/tiles', { withFileTypes: true })
      .filter(
        (entry: { isDirectory(): boolean; name: string }) =>
          entry.isDirectory() && !entry.name.startsWith('_'),
      )
      .map((entry: { name: string }) => entry.name);
    expect(sites).toContain('lost-city');
    for (const site of sites) {
      const root = `data/tiles/${site}`;
      const meta = validateMeta(JSON.parse(readFileSync(`${root}/meta.json`, 'utf8')), site);
      expect(decodeHeightmap(buffer(`${root}/heightmap.bin`), meta).length).toBe(
        meta.cols * meta.rows,
      );
      if (meta.quant_scale !== undefined && existsSync(`${root}/heightmap16.bin`))
        expect(decodeHeightmap16(buffer(`${root}/heightmap16.bin`), meta).length).toBe(
          meta.cols * meta.rows,
        );
    }
  });
  it.each([
    { cols: '2' },
    { rows: '2' },
    { cellsize_m_x: 0 },
    { cellsize_m_x: -1 },
    { cellsize_m_y: Infinity },
    { cellsize_m_y: '10' },
    { min_m: NaN },
    { max_m: Infinity },
    { min_m: 100, max_m: -100 },
    { center: { lat: Infinity, lon: 0 } },
    { center: { lat: 0, lon: -181 } },
    { bbox: { north: 1, south: 2, west: 0, east: 1 } },
    { bbox: { north: 1, south: 0, west: 1, east: 0 } },
    { bbox: { north: 91, south: 0, west: 0, east: 1 } },
  ])('rejects malformed metadata before fetching a heightmap: %j', async (patch) => {
    const tile = makeSyntheticTile();
    const base = makeFakeFetch(tile);
    const fetch = vi.fn(async (url: string) => {
      const response = await base(url);
      return url.endsWith('/meta.json')
        ? { ...response, json: async () => ({ ...tile.meta, ...patch }) }
        : response;
    });
    await expect(new TileLoader('/data/tiles', fetch).load(tile.meta.id)).rejects.toBeInstanceOf(
      TileLoadError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([NaN, Infinity, -Infinity])(
    'rejects nonfinite float32 sample %s on the load path',
    async (height) => {
      const tile = makeSyntheticTile({ height: () => -100 });
      tile.heights[3] = height;
      await expect(
        new TileLoader('/data/tiles', makeFakeFetch(tile)).load(tile.meta.id),
      ).rejects.toBeInstanceOf(TileLoadError);
    },
  );

  it.each([
    { quant_min_m: Infinity, quant_scale: 1 },
    { quant_min_m: 0, quant_scale: Infinity },
    { quant_min_m: 0, quant_scale: 1e38 },
  ])('rejects invalid quantisation or decoded float32 overflow: %j', (patch) => {
    const tile = makeSyntheticTile({ cols: 2, rows: 2 });
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint16(0, 65535, true);
    expect(() => decodeHeightmap16(buffer, { ...tile.meta, ...patch })).toThrow(TileLoadError);
  });

  it('falls back to canonical heights when the optional quantised decode overflows', async () => {
    const tile = makeSyntheticTile({ cols: 2, rows: 2 });
    tile.meta.quant_min_m = 0;
    tile.meta.quant_scale = 1e38;
    const bin16 = new ArrayBuffer(8);
    new DataView(bin16).setUint16(0, 65535, true);
    const base = makeFakeFetch(tile);
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('/heightmap16.bin')
        ? {
            ok: true,
            status: 200,
            json: async (): Promise<unknown> => null,
            arrayBuffer: async () => bin16,
          }
        : base(url),
    );
    const loaded = await new TileLoader('/data/tiles', fetch, { prefer16: true }).load(
      tile.meta.id,
    );
    expect(Array.from(loaded.heights)).toEqual(Array.from(tile.heights));
    expect(fetch).toHaveBeenCalledWith(`/data/tiles/${tile.meta.id}/heightmap.bin`);
  });
});

describe('F-BUGHUNT-5 Lost City content audit', () => {
  it.each(['low', 'high'] as const)(
    'loads all carbonate spires and keeps the %s opening collision-free',
    async (tier) => {
      const config = makeConfig();
      const meta = validateMeta(
        JSON.parse(readFileSync('data/tiles/lost-city/meta.json', 'utf8')),
        'lost-city',
      );
      const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
      const terrain = new Terrain(
        {
          meta,
          heights: decodeHeightmap(
            bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
            meta,
          ),
        },
        config.terrain,
        tier,
      );
      const props = new Props(meta, terrain, config.props, tier);
      try {
        const stats = await props.placeAll(
          JSON.parse(readFileSync('data/landmarks/lost-city/props.json', 'utf8')),
          'lost-city',
        );
        expect(stats).toMatchObject({ count: 12, procedural: 12, failed: 0, skipped: 0 });
        for (const prop of props.placed) {
          expect(prop.localBounds.isEmpty()).toBe(false);
          for (const value of [
            ...prop.localBounds.min.toArray(),
            ...prop.localBounds.max.toArray(),
            ...prop.root.position.toArray(),
          ])
            expect(Number.isFinite(value)).toBe(true);
        }
        const pose = composedFreeDiveSpawn(
          'lost-city',
          meta,
          terrain,
          props,
          spawnSettings(config),
          -1000,
          config.camera,
        );
        expect(pose).not.toBeNull();
        expect(
          props.collide(
            new Vector3(pose!.x, pose!.y, pose!.z),
            config.submarine.hullRadius,
            new Vector3(),
          ),
        ).toBe(false);
        expect(pose!.y).toBeGreaterThanOrEqual(-1000 + config.submarine.hullRadius);
      } finally {
        props.group.traverse((object) => {
          if (object instanceof Mesh) {
            object.geometry.dispose();
            for (const material of Array.isArray(object.material)
              ? object.material
              : [object.material])
              material.dispose();
          }
        });
        terrain.dispose();
      }
    },
  );
});
