/**
 * Simulation records: one {@link Agent} per live animal (pooled, never
 * allocated per frame) and one {@link Group} per school, swarm, patch or
 * passing animal. Pure data, no Three.js. World frame: +X east, +Z south,
 * +Y up, depth = -y.
 */

import type { SpawnRow } from './tables.js';
import type { SpeciesDef } from './types.js';

export class Agent {
  alive = false;
  id = 0;
  def!: SpeciesDef;
  group!: Group;
  x = 0;
  y = 0;
  z = 0;
  /** Own swimming velocity (m/s). */
  vx = 0;
  vy = 0;
  vz = 0;
  /** External push (thruster wash, current), damped away. */
  ex = 0;
  ey = 0;
  ez = 0;
  yaw = 0;
  pitch = 0;
  roll = 0;
  /** Animation phase (rad), accumulated from the animal's effort. */
  phase = 0;
  /** Individual size variation around 1. */
  scale = 1;
  /** 0..1 spawn and despawn fade (scale multiplier). */
  fade = 0;
  leaving = false;
  age = 0;
  /** 0..1 fright; decays. */
  alarm = 0;
  /** Flash level the shader adds to the animal's glow (0..1). */
  glow = 0;
  /** Seconds to the next spontaneous flash (glowing species). */
  flashIn = 0;
  /** Preferred altitude above the seabed (bed-bound animals) or depth jitter. */
  alt = 0;
  /** Per-animal random in [0, 1) for steering variety. */
  seed = 0;
  /** Wander target. */
  tx = 0;
  ty = 0;
  tz = 0;
  /** Generic countdown (target change, burst, rest). */
  timer = 0;
  /** Burst level 0..1 (darting, jetting). */
  burst = 0;
  /** Stable key for cell-placed animals (despawned and respawned identically). */
  cellKey = '';
  /** Heading (rad, 0 = +Z) walkers, jets and passing animals steer by. */
  hd = 0;
  /** Squared distance to the sub as of the last tick (cheap sorting for scans). */
  d2 = 0;
}

export interface Group {
  id: number;
  def: SpeciesDef;
  /** The table row that asked for this group; null for rare appearances. */
  row: SpawnRow | null;
  members: Agent[];
  /** Goal the group is swimming to (schools, hovering patrols). */
  gx: number;
  gy: number;
  gz: number;
  goalIn: number;
  /** Home point (swarm hub, crawler patch centre) and wander radius. */
  hx: number;
  hy: number;
  hz: number;
  spread: number;
  /** Travel direction (cruisers), unit horizontal. */
  dx: number;
  dz: number;
  /** Target depth of a passing animal (y, metres). */
  targetY: number;
  alarm: number;
  /** Centroid and mean velocity of the live members, refreshed each tick. */
  cx: number;
  cy: number;
  cz: number;
  avx: number;
  avy: number;
  avz: number;
  /** Grid cell this patch belongs to ('' for mobile groups). */
  cell: string;
  rare: boolean;
  /** Placed by an explicit preview (`spawnNear`); the camera treats it as the subject. */
  preview?: boolean;
  /** Cruisers: swing by the sub for a look before moving on. */
  curious: boolean;
  passed: boolean;
  age: number;
}

/** What the simulation reads from the world. */
export interface SimEnv {
  /** Seabed height (negative metres) at x, z. */
  groundAt(x: number, z: number): number;
  /** Water velocity (m/s) at a point; optional. */
  current?(x: number, z: number, out: { x: number; y: number; z: number }): void;
}

/** The sub (or ROV) as the animals see it. */
export interface SubInfo {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Unit forward vector. */
  fx: number;
  fy: number;
  fz: number;
  speed: number;
  lightsOn: boolean;
  hullR: number;
}
