import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import {
  loadPois,
  parsePois,
  placePois,
  poiElevation,
  spawnPoseForPoi,
  type PoiDef,
} from '../../src/game/Pois.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { makeSyntheticTile } from './helpers.js';

const quiet = () => {};
const tile = makeSyntheticTile({ cols: 40, rows: 40, centerLat: 41.73, centerLon: -49.95 });
const flat = { sampleHeight: () => -3802 };
const scan = DEFAULT_CONFIG.scan;

const bow = {
  id: 'bow',
  name: 'Bow',
  lat: 41.7302,
  lon: -49.9497,
  depth_m: 3800,
  radius_m: 150,
  kind: 'wreck',
  primary: true,
  scan_seconds: 3,
  guide_entry: 'bow',
};

describe('parsePois', () => {
  it('accepts the contract shape and a bare array', () => {
    expect(parsePois({ version: 1, landmark: 't', pois: [bow] }, quiet)).toHaveLength(1);
    expect(parsePois([bow], quiet)[0]).toMatchObject({ id: 'bow', primary: true, kind: 'wreck' });
  });

  it('drops invalid entries and duplicates, defaults unknown kinds to other', () => {
    const out = parsePois(
      [bow, { ...bow }, { id: 'x' }, null, { id: 'k', lat: 1, lon: 2, kind: 'treasure' }],
      quiet,
    );
    expect(out.map((p) => p.id)).toEqual(['bow', 'k']);
    expect(out[1]?.kind).toBe('other');
    expect(out[1]?.primary).toBe(false);
    expect(out[1]?.name).toBe('k');
  });

  it('returns [] for junk', () => {
    expect(parsePois(null, quiet)).toEqual([]);
    expect(parsePois('<!doctype html>', quiet)).toEqual([]);
  });
});

describe('poiElevation', () => {
  const def = (o: Partial<PoiDef>): PoiDef => ({ ...(parsePois([bow], quiet)[0] as PoiDef), ...o });

  it('turns a positive depth magnitude into negative world Y', () => {
    expect(poiElevation(def({ depth_m: 3800 }), -3900)).toBe(-3800);
  });

  it('passes a negative depth through as an elevation', () => {
    expect(poiElevation(def({ depth_m: -3700 }), -3900)).toBe(-3700);
  });

  it('snaps to the seabed when asked or when no depth is given', () => {
    expect(poiElevation(def({ snap_to_seabed: true }), -3811)).toBe(-3811);
    expect(poiElevation(def({ depth_m: undefined }), -3811)).toBe(-3811);
  });

  it('never places a POI below the seabed', () => {
    expect(poiElevation(def({ depth_m: 3900 }), -3802)).toBe(-3802);
  });
});

describe('placePois', () => {
  it('places via latLonToWorld and fills defaults from Config.scan', () => {
    const defs = parsePois(
      [bow, { id: 'd', lat: 41.7298, lon: -49.9502, snap_to_seabed: true }],
      quiet,
    );
    const placed = placePois(defs, tile.meta, flat, scan, 'lm', quiet);
    const w = latLonToWorld(tile.meta, bow.lat, bow.lon);
    expect(placed[0]?.position.x).toBeCloseTo(w.x, 6);
    expect(placed[0]?.position.z).toBeCloseTo(w.z, 6);
    expect(placed[0]?.position.y).toBe(-3800);
    expect(placed[0]?.scanSeconds).toBe(3);
    expect(placed[1]?.position.y).toBe(-3802);
    expect(placed[1]?.radius).toBe(scan.defaultRadiusM);
    expect(placed[1]?.scanSeconds).toBe(scan.defaultSeconds);
    expect(placed[1]?.landmarkId).toBe('lm');
    expect(placed[1]?.guideEntry).toBeNull();
  });

  it('skips POIs outside the tile', () => {
    const defs = parsePois([{ ...bow, lat: 10 }], quiet);
    expect(placePois(defs, tile.meta, flat, scan, 'lm', quiet)).toEqual([]);
  });
});

describe('loadPois', () => {
  const res = (ok: boolean, body: string) => async () => ({ ok, text: async () => body });

  it('treats 404, network errors and SPA-fallback HTML as "no POIs"', async () => {
    expect(await loadPois('x', res(false, ''), quiet)).toEqual([]);
    expect(await loadPois('x', res(true, '<!doctype html><html></html>'), quiet)).toEqual([]);
    expect(
      await loadPois(
        'x',
        async () => {
          throw new Error('offline');
        },
        quiet,
      ),
    ).toEqual([]);
  });

  it('fetches /data/landmarks/<id>/pois.json', async () => {
    let url = '';
    const out = await loadPois(
      '_test',
      async (u) => {
        url = u;
        return { ok: true, text: async () => JSON.stringify({ pois: [bow] }) };
      },
      quiet,
    );
    expect(url).toBe('/data/landmarks/_test/pois.json');
    expect(out).toHaveLength(1);
  });
});

describe('spawnPoseForPoi', () => {
  const floorOffset =
    DEFAULT_CONFIG.submarine.hullRadius + DEFAULT_CONFIG.submarine.seabedClearance;
  const poi = { position: new Vector3(100, -3802, -200), radius: 150 };

  it('spawns spawnDistanceM south of the POI, facing north at it, inside the radius', () => {
    const pose = spawnPoseForPoi(poi, flat, scan, floorOffset);
    expect(pose.x).toBeCloseTo(100, 6);
    expect(pose.z).toBeCloseTo(-200 + scan.spawnDistanceM, 6);
    expect(pose.yaw).toBeCloseTo(0, 6); // yaw 0 = facing north (-Z)
    const range = Math.hypot(pose.x - 100, pose.y + 3802, pose.z + 200);
    expect(range).toBeLessThan(poi.radius);
  });

  it('clamps above the sub floor when the POI sits on the seabed', () => {
    const pose = spawnPoseForPoi(poi, flat, scan, floorOffset);
    expect(pose.y).toBeCloseTo(-3802 + floorOffset + scan.spawnClearanceM, 6);
  });

  it('keeps the POI in range even when the spawn point is on a high ridge', () => {
    const ridge = { sampleHeight: (_x: number, z: number) => (z > -200 ? -3700 : -3802) };
    const pose = spawnPoseForPoi(poi, ridge, scan, floorOffset);
    const range = Math.hypot(pose.x - 100, pose.y + 3802, pose.z + 200);
    expect(range).toBeLessThanOrEqual(poi.radius);
  });

  it('caps the distance to 80% of a small radius, and honours the bearing', () => {
    const small = { position: new Vector3(0, -3802, 0), radius: 50 };
    const pose = spawnPoseForPoi(
      small,
      flat,
      { ...scan, spawnBearingDeg: 90, spawnClearanceM: 2 },
      floorOffset,
    );
    expect(pose.x).toBeCloseTo(40, 6); // east of the POI
    expect(pose.yaw).toBeCloseTo(-Math.PI / 2, 6); // facing west
  });
});
