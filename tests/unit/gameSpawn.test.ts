/**
 * Fix S: free-dive hull class (QA-B #2) and shallow-tile spawn (QA-B #3b).
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import {
  applyFreeDiveHull,
  chooseFreeDiveHull,
  chooseSpawn,
  nearestDeepCell,
  spawnHeight,
  spawnSettings,
  nearSiteSpawnPose,
  type SpawnGrid,
} from '../../src/game/Spawn.js';

const HULLS = DEFAULT_CONFIG.submarine.hullClasses;
const MARGIN = DEFAULT_CONFIG.submarine.freeDiveHullMarginM;
const S = spawnSettings(DEFAULT_CONFIG);
const R = S.hullRadius;

describe('chooseFreeDiveHull', () => {
  it('fits the lowest class that clears the tile depth by the margin', () => {
    expect(chooseFreeDiveHull(HULLS, -535, MARGIN)?.classId).toBe('A'); // monterey
    expect(chooseFreeDiveHull(HULLS, -3978, MARGIN)?.classId).toBe('B'); // titanic
    expect(chooseFreeDiveHull(HULLS, -4300, MARGIN)?.classId).toBe('C'); // inside B's margin
    expect(chooseFreeDiveHull(HULLS, -5009, MARGIN)?.classId).toBe('C'); // bismarck
    expect(chooseFreeDiveHull(HULLS, -6575, MARGIN)?.classId).toBe('C'); // beebe
    expect(chooseFreeDiveHull(HULLS, -1000, 0)?.classId).toBe('A'); // exactly at rating
  });

  it('soft margin: Challenger Deep gets the deepest class, flagged as not cleared', () => {
    const c = chooseFreeDiveHull(HULLS, -10931, MARGIN);
    expect(c?.classId).toBe('C');
    expect(c?.cleared).toBe(false);
    expect(chooseFreeDiveHull(HULLS, -5009, MARGIN)?.cleared).toBe(true);
  });

  it('positive tile minima (land) and an empty table', () => {
    expect(chooseFreeDiveHull(HULLS, 50, MARGIN)?.classId).toBe('A');
    expect(chooseFreeDiveHull({}, -100, MARGIN)).toBeNull();
  });

  it('applyFreeDiveHull fits the chosen class on the sub', () => {
    const fitted: string[] = [];
    const choice = applyFreeDiveHull(
      { setHullClass: (id) => (fitted.push(id), true) },
      DEFAULT_CONFIG,
      -5009,
    );
    expect(choice?.classId).toBe('C');
    expect(fitted).toEqual(['C']);
  });
});

describe('nearSiteSpawnPose', () => {
  const meta = {
    center: { lat: 0, lon: 0 },
    bbox: { north: 0.01, south: -0.01, west: -0.01, east: 0.01 },
  } as import('../../src/util/types.js').TileMeta;
  const target = { x: 0, y: -480, z: 0 };
  it('stays 100–200 m from the target, above the seabed, facing it', () => {
    const p = nearSiteSpawnPose(target, meta, { sampleHeight: () => -500 }, S, -1000)!;
    expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(100);
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(200);
    expect(p.y).toBeGreaterThanOrEqual(-500 + R + S.seabedClearance + S.spawnClearanceM);
    expect(Math.sin(p.yaw) * -p.x - Math.cos(p.yaw) * -p.z).toBeGreaterThan(0);
  });

  it('stays inside a small tile and above a shallow slope', () => {
    const small = { ...meta, bbox: { north: 0.001, south: -0.001, west: -0.001, east: 0.001 } };
    const p = nearSiteSpawnPose(
      target,
      small,
      { sampleHeight: (x) => (x > 0 ? -60 : -500) },
      S,
      -1000,
    )!;
    expect(Math.abs(p.x)).toBeLessThan(112);
    expect(Math.abs(p.z)).toBeLessThan(112);
    expect(p.y).toBeLessThan(-R);
    expect(p.y).toBeGreaterThan(-500 + R + S.seabedClearance + S.spawnClearanceM);
  });

  it('clamps to hull rating and rejects an unsafe explicit coordinate', () => {
    const p = nearSiteSpawnPose(target, meta, { sampleHeight: () => -1000 }, S, -450, {
      lat: 1,
      lon: 1,
      depth_m: 900,
      heading_deg: 0,
    })!;
    expect(p.y).toBeGreaterThanOrEqual(-450 + R);
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(200);
  });
});

/** A synthetic tile: 101x101 cells of 50 m, a -5 m reef flat with a -120 m hole. */
function reefTile(hole: { col: number; row: number } | null): {
  grid: SpawnGrid;
  meta: { cols: number; rows: number; cellsize_m_x: number; cellsize_m_y: number };
} {
  const cols = 101;
  const rows = 101;
  const d = 50;
  const half = ((cols - 1) * d) / 2;
  const heightAtCell = (c: number, r: number): number => {
    if (hole && Math.abs(c - hole.col) <= 1 && Math.abs(r - hole.row) <= 1) return -120;
    return -5;
  };
  const grid: SpawnGrid = {
    heightAtCell,
    worldXOfCol: (c) => c * d - half,
    worldZOfRow: (r) => r * d - half,
    sampleHeight: (x, z) => heightAtCell(Math.round((x + half) / d), Math.round((z + half) / d)),
  };
  return { grid, meta: { cols, rows, cellsize_m_x: d, cellsize_m_y: d } };
}

describe('chooseSpawn (shallow tiles)', () => {
  it('a shallow centre moves the spawn to the nearest cell deep enough', () => {
    const { grid, meta } = reefTile({ col: 70, row: 40 });
    const hit = nearestDeepCell(grid, meta, S.minSpawnSeabedM);
    // The 3x3 hole spans cols 69-71, rows 39-41; the nearest corner to the centre is (69, 41).
    expect(hit).toMatchObject({ col: 69, row: 41 });
    const sp = chooseSpawn(grid, meta, null, S);
    expect(sp.moved).toBe(true);
    expect(sp.ground).toBe(-120);
    expect(sp.x).toBe(19 * 50);
    expect(sp.z).toBe(-9 * 50);
    // Below the surface, above the seabed.
    expect(sp.y).toBeLessThanOrEqual(-R);
    expect(sp.y).toBeGreaterThan(sp.ground + R + S.seabedClearance);
  });

  it('?depth= is honoured, clamped to [hullRadius, seabed clearance]', () => {
    const { grid, meta } = reefTile({ col: 70, row: 40 });
    expect(chooseSpawn(grid, meta, 30, S).y).toBe(-30);
    const floor = -120 + R + S.seabedClearance + S.spawnClearanceM;
    expect(chooseSpawn(grid, meta, 500, S).y).toBe(floor);
    expect(chooseSpawn(grid, meta, 2, S).y).toBe(-R);
  });

  it('a deep centre stays at the centre, 90 m up', () => {
    const grid: SpawnGrid = {
      heightAtCell: () => -3800,
      worldXOfCol: (c) => c,
      worldZOfRow: (r) => r,
      sampleHeight: () => -3800,
    };
    const sp = chooseSpawn(grid, { cols: 3, rows: 3, cellsize_m_x: 1, cellsize_m_y: 1 }, null, S);
    expect(sp).toMatchObject({ x: 0, z: 0, moved: false });
    expect(sp.y).toBe(-3800 + S.freeDiveSpawnAltitudeM);
  });

  it('no deep cell anywhere: stays at the centre, never above the surface ceiling if the hull fits', () => {
    const { grid, meta } = reefTile(null);
    const sp = chooseSpawn(grid, meta, 30, S);
    expect(sp.moved).toBe(false);
    // -5 m of water cannot float an 8 m hull: aground at ground + hullRadius.
    expect(sp.y).toBe(-5 + R);
    expect(spawnHeight(-18, null, S)).toBe(-R); // hull fits: at the surface ceiling
  });

  it('water shallower than the spawn altitude: mid-water, not at the surface', () => {
    const floor = -61 + R + S.seabedClearance + S.spawnClearanceM;
    expect(spawnHeight(-61, null, S)).toBeCloseTo((floor - R) / 2, 9);
    expect(spawnHeight(-61, null, S)).toBeLessThan(-R);
  });
});
