/**
 * Free-dive loadout and spawn (fix S, QA-B #2 / #3). Pure TS, no DOM.
 *
 *  - {@link chooseFreeDiveHull}: the lowest hull class whose rated depth
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

import type { GameConfig, HullClass, CameraConfig } from '../core/Config.js';
import { DEFAULT_CAMERA } from '../core/config/camera.js';
import { CameraRig } from '../sub/CameraRig.js';
import { headingFromForward, latLonToWorld } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import type { MissionSpawn } from './Mission.js';
import type { SeabedSampler, SpawnPose } from './Pois.js';
import { Vector3 } from 'three';
import type { Props } from '../world/Props.js';

/** Local approach bearings and clearance from each hero's actual footprint. */
const FREE_DIVE_OPENINGS: Record<
  string,
  {
    hero: string;
    bearing: number;
    range: number;
    /** Measure `range` from the hero's centre instead of its footprint edge (sprawling sets). */
    fromCentre?: boolean;
    /** Hold this height above the hero's base (its local origin) instead of rising to the target. */
    altitude?: number;
    /** Turn the sub this many degrees off the hero so the hull does not hide it (chase view). */
    yawOffset?: number;
    /** The approach crosses open water (a sinkhole): skip the clear-seabed-line-of-sight raise. */
    openWater?: boolean;
  }
> = {
  titanic: { hero: 'bow-hull', bearing: 40, range: 16, altitude: 14, yawOffset: 10 },
  'challenger-deep': { hero: 'leggo-lander-marker', bearing: 135, range: 65 },
  'lost-city': {
    hero: 'poseidon-tower',
    bearing: 90,
    range: 44,
    fromCentre: true,
    altitude: 18,
    yawOffset: 10,
  },
  'monterey-canyon': { hero: 'canyon-wall-ledge', bearing: 0, range: 100 },
  endurance: { hero: 'main-hull', bearing: 60, range: 70 },
  'axial-seamount-ashes': { hero: 'mushroom-chimney', bearing: 45, range: 60 },
  'hudson-canyon': { hero: 'coral-ledge-mound', bearing: 0, range: 75 },
  kamaehuakanaloa: { hero: 'hiolo-north-chimney-1', bearing: 45, range: 45 },
  'beebe-vent-field': {
    hero: 'beebe-chimney-1',
    bearing: 60,
    range: 46,
    fromCentre: true,
    altitude: 4,
    yawOffset: 10,
  },
  // Over the hole's east side, facing the ledge alcove across the dark water.
  'great-blue-hole': {
    hero: 'karst-grotto',
    bearing: 90,
    range: 235,
    fromCentre: true,
    altitude: 12,
    openWater: true,
  },
  bismarck: { hero: 'main-hull', bearing: 50, range: 110 },
  'hunga-tonga-caldera': { hero: 'caldera-tuff-wall', bearing: 0, range: 100 },
  'blake-plateau-corals': { hero: 'lophelia-mound', bearing: 45, range: 75 },
};

/**
 * Compose a free dive after props load. Bounds follow the placed hero's real
 * transform, so long wrecks and tall towers get different opening distances.
 * Challenger faces its small sampling cue, preserving the quiet hadal floor.
 * Missing content or an unsafe approach leaves the original tile spawn intact.
 */
export function composedFreeDiveSpawn(
  siteId: string,
  meta: TileMeta,
  seabed: SeabedSampler,
  props: Pick<Props, 'placed' | 'collide'>,
  settings: SpawnSettings,
  safeDepth: number,
  cameraConfig: CameraConfig = DEFAULT_CAMERA,
): SpawnPose | null {
  const opening = FREE_DIVE_OPENINGS[siteId];
  const hero = props.placed.find((p) => p.def.id === opening?.hero);
  if (!opening || !hero || hero.localBounds.isEmpty()) return null;
  hero.root.updateMatrixWorld(true);
  const centre = hero.localBounds.getCenter(new Vector3());
  // Effect/plume bounds can extend far above a chimney: frame its solid body.
  const solidHeight = hero.def.dimensionsM?.[2];
  if (hero.def.model === 'procedural:chimney' && solidHeight)
    // The local origin sits on the seabed; a foundation sunk below it must not drag the aim down.
    centre.y =
      Math.max(hero.localBounds.min.y, 0) + solidHeight * (opening?.altitude ? 0.42 : 0.55);
  const target = hero.root.localToWorld(centre.clone());
  const half = hero.localBounds.getSize(new Vector3()).multiplyScalar(0.5);
  const nw = latLonToWorld(meta, meta.bbox.north, meta.bbox.west);
  const se = latLonToWorld(meta, meta.bbox.south, meta.bbox.east);
  const clearance = settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM;
  const wantedY = opening.altitude ? hero.root.position.y + opening.altitude : target.y + 12;
  let best: SpawnPose | null = null;
  let bestScore = Infinity;
  const rig = new CameraRig(cameraConfig, 16 / 9, {
    sampleHeight: (x, z) => seabed.sampleHeight(x, z),
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  });
  for (const turn of [0, 22.5, -22.5, 45, -45, 90, -90, 135, -135, 180]) {
    const bearing = ((opening.bearing + turn) * Math.PI) / 180;
    const dx = Math.sin(bearing);
    const dz = -Math.cos(bearing);
    const edge = opening.fromCentre
      ? 0
      : Math.min(half.x / Math.max(Math.abs(dx), 1e-6), half.z / Math.max(Math.abs(dz), 1e-6));
    const boundary = hero.root.localToWorld(
      centre.clone().add(new Vector3(dx * edge, 0, dz * edge)),
    );
    const direction = (
      opening.fromCentre
        ? hero.root.localToWorld(new Vector3(dx, 0, dz)).sub(hero.root.localToWorld(new Vector3()))
        : boundary.clone().sub(target)
    )
      .setY(0)
      .normalize();
    const p = boundary.addScaledVector(direction, opening.range);
    if (p.x < nw.x || p.x > se.x || p.z < nw.z || p.z > se.z) continue;
    let floor = seabed.sampleHeight(p.x, p.z);
    // A clear line into the landscape matters as much as a safe initial hull.
    for (let i = 1; i <= (opening.openWater ? 0 : 8); i++) {
      const t = i / 10;
      floor = Math.max(
        floor,
        seabed.sampleHeight(p.x + (target.x - p.x) * t, p.z + (target.z - p.z) * t),
      );
    }
    p.y = Math.max(floor + clearance, wantedY, safeDepth + settings.hullRadius);
    if (p.y > -settings.hullRadius) continue;
    if (props.collide(p.clone(), settings.hullRadius + 4, new Vector3())) continue;
    // Reserve a clear chase arm as well as a collision-free submarine pose.
    const yaw =
      Math.atan2(target.x - p.x, -(target.z - p.z)) + ((opening.yawOffset ?? 0) * Math.PI) / 180;
    rig.snap(p, yaw, 0);
    let cameraClear = true;
    for (let i = 1; i <= 6; i++) {
      const eye = p.clone().lerp(rig.camera.position, i / 6);
      if (props.collide(eye, 6, new Vector3())) cameraClear = false;
    }
    if (!cameraClear) continue;
    const score = Math.abs(p.y - wantedY) * 3 + Math.abs(turn) * 0.12;
    if (score < bestScore) {
      bestScore = score;
      best = { x: p.x, y: p.y, z: p.z, yaw };
    }
  }
  return best;
}

// ---------------------------------------------------------------- hull class

export interface HullChoice {
  classId: string;
  hull: HullClass;
  /** False when no class cleared the margin and the deepest one was fitted anyway. */
  cleared: boolean;
}

/**
 * Lowest-rated class with `ratedDepth <= minM - marginM` (depths negative).
 * If none clears, the deepest-rated class (soft margin). Null for an empty table.
 */
export function chooseFreeDiveHull(
  hullClasses: Readonly<Record<string, HullClass>>,
  minM: number,
  marginM: number,
): HullChoice | null {
  // Shallowest rating first; ties keep table order.
  const ranked = Object.entries(hullClasses).sort((a, b) => b[1].ratedDepth - a[1].ratedDepth);
  if (!ranked.length) return null;
  const need = Math.min(0, minM) - Math.max(0, marginM);
  for (const [classId, hull] of ranked) {
    if (hull.ratedDepth <= need) return { classId, hull, cleared: true };
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

/** A near-site pose selected from safe approaches around the first primary POI. */
export function nearSiteSpawnPose(
  target: { x: number; y: number; z: number },
  meta: TileMeta,
  seabed: SeabedSampler,
  settings: SpawnSettings,
  crushDepth: number,
  override?: MissionSpawn,
): SpawnPose | null {
  const clearance = settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM;
  const northWest = latLonToWorld(meta, meta.bbox.north, meta.bbox.west);
  const southEast = latLonToWorld(meta, meta.bbox.south, meta.bbox.east);
  const inside = (x: number, z: number): boolean =>
    x >= northWest.x && x <= southEast.x && z >= northWest.z && z <= southEast.z;
  const poseAt = (x: number, z: number, authoredY?: number): SpawnPose | null => {
    if (!inside(x, z)) return null;
    const horizontal = Math.hypot(target.x - x, target.z - z);
    if (horizontal > 600 || horizontal < 350) return null;
    let floor = -Infinity;
    // Check the straight approach, not only the point where the hull spawns.
    for (let step = 0; step <= 12; step++) {
      const t = step / 12;
      floor = Math.max(floor, seabed.sampleHeight(x + (target.x - x) * t, z + (target.z - z) * t));
    }
    const y = Math.max(
      floor + clearance,
      crushDepth + settings.hullRadius,
      authoredY ?? target.y + 12,
    );
    if (y > -settings.hullRadius) return null;
    let yaw = (headingFromForward(target.x - x, target.z - z) * Math.PI) / 180;
    if (yaw > Math.PI) yaw -= 2 * Math.PI;
    return { x, y, z, yaw };
  };
  if (override) {
    const at = latLonToWorld(meta, override.lat, override.lon);
    const explicit = poseAt(at.x, at.z, -override.depth_m);
    if (explicit) {
      return explicit;
    }
  }
  let best: SpawnPose | null = null;
  let bestScore = Infinity;
  for (const distance of [450, 400, 500, 350, 550, 600]) {
    for (let bearing = 0; bearing < 16; bearing++) {
      const angle = (bearing * Math.PI) / 8;
      const pose = poseAt(
        target.x + Math.sin(angle) * distance,
        target.z + Math.cos(angle) * distance,
      );
      if (!pose) continue;
      const score = Math.abs(pose.y - target.y) * 2 + Math.abs(distance - 450);
      if (score < bestScore) {
        best = pose;
        bestScore = score;
      }
    }
  }
  return best;
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
