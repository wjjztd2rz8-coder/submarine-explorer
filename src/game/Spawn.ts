/**
 * Free-dive loadout and spawn (fix S, QA-B #2 / #3). Pure TS, no DOM.
 *
 *  - {@link chooseFreeDiveHull}: the lowest hull class whose crush depth
 *    clears the tile's deepest cell by a margin, so deep tiles (Bismarck,
 *    Beebe, Challenger Deep) no longer breach at spawn. Missions keep
 *    `mission.hull_class`.
 *  - {@link chooseSpawn}: where the free dive starts. Over the tile centre,
 *    unless its seabed is shallower than `minSpawnSeabedM`; then over the
 *    nearest grid cell that is at least that deep. `?depth=` is honoured,
 *    clamped between the surface and the seabed.
 *
 * Terrain is only read, through the narrow {@link SpawnGrid} interface that
 * `Terrain` satisfies (and a test stub can).
 */

import type { GameConfig, HullClass } from '../core/Config.js';

// ---------------------------------------------------------------- hull class

export interface HullChoice {
  classId: string;
  hull: HullClass;
  /** False when no class cleared the margin and the deepest one was fitted anyway. */
  cleared: boolean;
}

/**
 * Lowest-rated class with `crushDepth <= minM - marginM` (depths negative).
 * If none clears, the deepest-rated class (soft margin). Null for an empty table.
 */
export function chooseFreeDiveHull(
  hullClasses: Readonly<Record<string, HullClass>>,
  minM: number,
  marginM: number,
): HullChoice | null {
  // Shallowest rating first; ties keep table order.
  const ranked = Object.entries(hullClasses).sort((a, b) => b[1].crushDepth - a[1].crushDepth);
  if (!ranked.length) return null;
  const need = Math.min(0, minM) - Math.max(0, marginM);
  for (const [classId, hull] of ranked) {
    if (hull.crushDepth <= need) return { classId, hull, cleared: true };
  }
  const [classId, hull] = ranked[ranked.length - 1] as [string, HullClass];
  return { classId, hull, cleared: false };
}

// --------------------------------------------------------------------- spawn

/** What the spawn search reads from the terrain (Terrain satisfies it). */
export interface SpawnGrid {
  heightAtCell(col: number, row: number): number;
  worldXOfCol(col: number): number;
  worldZOfRow(row: number): number;
  sampleHeight(x: number, z: number): number;
}

export interface SpawnGridMeta {
  cols: number;
  rows: number;
  cellsize_m_x: number;
  cellsize_m_y: number;
}

export interface SpawnSettings {
  hullRadius: number;
  seabedClearance: number;
  /** Extra metres above hullRadius + seabedClearance for a `?depth=` spawn. */
  spawnClearanceM: number;
  /** Negative metres: the centre must be at least this deep, else search. */
  minSpawnSeabedM: number;
  /** Spawn altitude above the seabed without `?depth=`. */
  freeDiveSpawnAltitudeM: number;
}

export interface FreeDiveSpawn {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Seabed height under the spawn. */
  ground: number;
  /** True when the centre was too shallow and the search moved the spawn. */
  moved: boolean;
}

/**
 * Nearest grid cell (by horizontal distance from world (0, 0), the tile
 * centre) whose measured height is at most `maxHeight`. Rings of cells are
 * scanned outward; the search stops once a ring can no longer beat the best
 * hit. Null when no cell qualifies.
 */
export function nearestDeepCell(
  grid: SpawnGrid,
  meta: SpawnGridMeta,
  maxHeight: number,
): { col: number; row: number; x: number; z: number } | null {
  const { cols, rows } = meta;
  if (cols < 1 || rows < 1) return null;
  const c0 = Math.round((cols - 1) / 2);
  const r0 = Math.round((rows - 1) / 2);
  const cell = Math.max(1e-6, Math.min(meta.cellsize_m_x, meta.cellsize_m_y));
  const maxRing = Math.max(c0, cols - 1 - c0, r0, rows - 1 - r0);
  let best: { col: number; row: number; x: number; z: number } | null = null;
  let bestD = Infinity;
  const consider = (col: number, row: number): void => {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    if (!(grid.heightAtCell(col, row) <= maxHeight)) return;
    const x = grid.worldXOfCol(col);
    const z = grid.worldZOfRow(row);
    const d = Math.hypot(x, z);
    if (d < bestD) {
      bestD = d;
      best = { col, row, x, z };
    }
  };
  for (let ring = 0; ring <= maxRing; ring++) {
    // Every cell in this ring is at least (ring - 1) cells from the centre.
    if (best && (ring - 1) * cell > bestD) break;
    if (ring === 0) {
      consider(c0, r0);
      continue;
    }
    for (let dc = -ring; dc <= ring; dc++) {
      consider(c0 + dc, r0 - ring);
      consider(c0 + dc, r0 + ring);
    }
    for (let dr = -ring + 1; dr <= ring - 1; dr++) {
      consider(c0 - ring, r0 + dr);
      consider(c0 + ring, r0 + dr);
    }
  }
  return best;
}

/**
 * Spawn Y over a seabed at `ground`. `depthParam` (positive metres, or null)
 * is clamped to `[hullRadius, -(ground + hullRadius + seabedClearance +
 * spawnClearanceM)]`; without it the boat sits `freeDiveSpawnAltitudeM` above
 * the seabed, or mid-water when the water is shallower than that. Where it is too shallow
 * for either, the boat floats at the surface (or rests aground if even the
 * hull does not fit), exactly where the physics constraints would put it.
 */
export function spawnHeight(ground: number, depthParam: number | null, s: SpawnSettings): number {
  const ceiling = -s.hullRadius;
  const floor = ground + s.hullRadius + s.seabedClearance + s.spawnClearanceM;
  if (floor > ceiling) {
    // No room for the clearance: surface if the hull fits, else aground.
    return Math.max(ceiling, ground + s.hullRadius);
  }
  if (depthParam !== null && Number.isFinite(depthParam) && depthParam > 0) {
    const depth = Math.min(Math.max(depthParam, s.hullRadius), -floor);
    return -depth;
  }
  const want = ground + s.freeDiveSpawnAltitudeM;
  // Water shallower than the spawn altitude: mid-water between the clearance
  // floor and the surface ceiling, not bobbing at the surface.
  if (want > ceiling) return (floor + ceiling) / 2;
  return Math.max(floor, want);
}

/** The free-dive spawn pose (yaw 0: facing north). */
export function chooseSpawn(
  grid: SpawnGrid,
  meta: SpawnGridMeta,
  depthParam: number | null,
  s: SpawnSettings,
): FreeDiveSpawn {
  let x = 0;
  let z = 0;
  let moved = false;
  let ground = grid.sampleHeight(0, 0);
  if (ground > s.minSpawnSeabedM) {
    const hit = nearestDeepCell(grid, meta, s.minSpawnSeabedM);
    if (hit) {
      x = hit.x;
      z = hit.z;
      moved = true;
      ground = grid.sampleHeight(x, z);
    }
  }
  return { x, y: spawnHeight(ground, depthParam, s), z, yaw: 0, ground, moved };
}

// -------------------------------------------------------------- main.ts glue

/** Spawn settings from the game config. */
export function spawnSettings(config: GameConfig): SpawnSettings {
  const s = config.submarine;
  return {
    hullRadius: s.hullRadius,
    seabedClearance: s.seabedClearance,
    spawnClearanceM: config.mission.spawnClearanceM,
    minSpawnSeabedM: config.mission.minSpawnSeabedM,
    freeDiveSpawnAltitudeM: config.mission.freeDiveSpawnAltitudeM,
  };
}

/** The Submarine surface the free-dive loadout needs (Submarine satisfies it). */
export interface HullFittable {
  setHullClass(classId: string): boolean;
}

/**
 * Free dive (no `?mission=`): fit the hull for this tile's depth. Returns the
 * choice (for the HUD note), or null when the table is empty.
 */
export function applyFreeDiveHull(
  sub: HullFittable,
  config: GameConfig,
  minM: number,
): HullChoice | null {
  const choice = chooseFreeDiveHull(
    config.submarine.hullClasses,
    minM,
    config.submarine.freeDiveHullMarginM,
  );
  if (choice) sub.setHullClass(choice.classId);
  return choice;
}
