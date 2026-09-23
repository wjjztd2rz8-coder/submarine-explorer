/**
 * Pure maths behind the presets: compass/vector conversion, the canyon current
 * field, current capping and coupling, particle box wrapping, a local seabed
 * plane fit and the trench ambience interval. No Three.js objects, so it is
 * unit-tested headlessly (tests/unit/presets-maths.test.ts).
 *
 * Coordinates follow docs/architecture.md: +X east, +Z SOUTH, +Y up. Compass
 * bearings are degrees clockwise from north, and a current's bearing is the
 * direction it flows TOWARD (the oceanographic convention).
 */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

const DEG = Math.PI / 180;

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Unit horizontal vector for a compass bearing: 0 = north = -Z, 90 = east = +X. */
export function bearingToVector(deg: number): { x: number; z: number } {
  return { x: Math.sin(deg * DEG), z: -Math.cos(deg * DEG) };
}

/** Compass bearing (0..360) of a horizontal vector. */
export function vectorToBearing(x: number, z: number): number {
  const d = (Math.atan2(x, -z) / DEG) % 360;
  return d < 0 ? d + 360 : d;
}

export interface CanyonCurrentInput {
  /** Bearing the current flows toward, or null to follow the down-slope only. */
  baseDirDeg: number | null;
  baseSpeedMps: number;
  /** 0..1: how far a steep down-slope bends the current toward itself. */
  slopeBias: number;
  /** Speed gain in a confined channel: x (1 + axisGain * confinement). */
  axisGain: number;
  /** 0..1, see {@link channelConfinement}. */
  confinement: number;
  /** (Smoothed) terrain normal under the sub. Its horizontal part points down-slope. */
  normal: Vec3Like;
  /** Sub altitude above the seabed (m). */
  altitudeM: number;
  boundaryLayerM: number;
  aloftFraction: number;
}

/** Slope (as sin of the angle) above which the down-slope fully counts: ~10 degrees. */
const FULL_SLOPE = 0.17;

/**
 * The canyon current at one point: a base flow bent down-canyon by the local
 * slope, faster in a confined channel, weaker high above the seabed (canyon
 * currents are strongest near the floor). Returns a horizontal velocity.
 */
export function canyonCurrent(p: CanyonCurrentInput): { x: number; z: number; speed: number } {
  const dx = p.normal.x;
  const dz = p.normal.z;
  const slope = Math.hypot(dx, dz);
  const slopeW = smoothstep(0, FULL_SLOPE, slope);
  let x: number;
  let z: number;
  let speed = p.baseSpeedMps;
  if (p.baseDirDeg === null) {
    // Auto: pure down-slope flow, fading out on flat ground (no axis to follow).
    if (slope < 1e-4) return { x: 0, z: 0, speed: 0 };
    x = dx / slope;
    z = dz / slope;
    speed *= slopeW;
  } else {
    const base = bearingToVector(p.baseDirDeg);
    const w = clamp01(p.slopeBias) * slopeW;
    x = base.x * (1 - w);
    z = base.z * (1 - w);
    if (slope > 1e-4) {
      x += (dx / slope) * w;
      z += (dz / slope) * w;
    }
    const len = Math.hypot(x, z);
    if (len < 1e-6) {
      x = base.x;
      z = base.z;
    } else {
      x /= len;
      z /= len;
    }
  }
  speed *= 1 + Math.max(0, p.axisGain) * clamp01(p.confinement);
  speed *= altitudeFactor(p.altitudeM, p.boundaryLayerM, p.aloftFraction);
  return { x: x * speed, z: z * speed, speed };
}

/** 1 inside the boundary layer, easing to `aloft` at three boundary-layer heights. */
export function altitudeFactor(altitudeM: number, layerM: number, aloft: number): number {
  if (layerM <= 0) return 1;
  const t = smoothstep(layerM, 3 * layerM, altitudeM);
  return 1 + (aloft - 1) * t;
}

/**
 * How channel-like the seabed is here: 0 on a plain or a ridge, 1 when the
 * surrounding ring is at least `reliefM` higher than the centre (a canyon
 * floor).
 */
export function channelConfinement(
  centreH: number,
  ring: readonly number[],
  reliefM: number,
): number {
  if (!ring.length || reliefM <= 0) return 0;
  let sum = 0;
  for (const h of ring) sum += h;
  return clamp01((sum / ring.length - centreH) / reliefM);
}

/** Scale `v` in place so its length is at most `max`. Returns the resulting length. */
export function capVector(v: Vec3Like, max: number): number {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len > max && len > 0) {
    const k = max / len;
    v.x *= k;
    v.y *= k;
    v.z *= k;
    return max;
  }
  return len;
}

/**
 * Velocity change that couples the sub to a water current. The sub's own drag
 * acts on its absolute velocity (Submarine.ts has no notion of moving water),
 * so the current is modelled as a pull of the along-current velocity toward
 * the current speed at `rate` 1/s. A boat already moving downstream faster
 * than the water is left alone; one driving upstream is pushed back. Writes
 * the delta into `out` and returns it; the caller adds it to `sub.velocity`.
 */
export function currentCouplingDelta(
  velocity: Vec3Like,
  current: Vec3Like,
  rate: number,
  dt: number,
  out: Vec3Like,
): Vec3Like {
  out.x = 0;
  out.y = 0;
  out.z = 0;
  const speed = Math.hypot(current.x, current.y, current.z);
  if (speed < 1e-6 || dt <= 0 || rate <= 0) return out;
  const cx = current.x / speed;
  const cy = current.y / speed;
  const cz = current.z / speed;
  const along = velocity.x * cx + velocity.y * cy + velocity.z * cz;
  if (along >= speed) return out;
  const k = (speed - along) * (1 - Math.exp(-rate * dt));
  out.x = cx * k;
  out.y = cy * k;
  out.z = cz * k;
  return out;
}

/**
 * Wrap a coordinate into the box of edge `box` centred on `centre` (the TS
 * twin of the GLSL the particle shaders use, so the maths is tested once).
 */
export function wrapToBox(p: number, centre: number, box: number): number {
  const r = (p - centre + 0.5 * box) % box;
  return centre + (r < 0 ? r + box : r) - 0.5 * box;
}

/**
 * Least-effort seabed plane around a point: height at the centre plus the x/z
 * gradients from four samples `half` metres away. The haze layer follows this
 * plane so it hugs the floor without a per-particle terrain lookup.
 */
export function fitSeabedPlane(
  sample: (x: number, z: number) => number,
  x: number,
  z: number,
  half: number,
): { h: number; gx: number; gz: number } {
  const h = sample(x, z);
  const gx = (sample(x + half, z) - sample(x - half, z)) / (2 * half);
  const gz = (sample(x, z + half) - sample(x, z - half)) / (2 * half);
  return { h, gx, gz };
}

/** Hadal zone top (m): trench ambience ticks start slow here. */
export const HADAL_TOP_M = 6000;

/** Seconds between `env:trench` ticks at a positive depth `depthM`. */
export function trenchInterval(
  depthM: number,
  maxGapS: number,
  minGapS: number,
  fullDepthM: number,
): number {
  const span = Math.max(1, fullDepthM - HADAL_TOP_M);
  const t = clamp01((depthM - HADAL_TOP_M) / span);
  return maxGapS + (minGapS - maxGapS) * t;
}

/** Deterministic PRNG for particle seeds (screenshots stay comparable run to run). */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Particle count for a budget at a tier scale, capped. */
export function particleBudget(base: number, scale: number, cap: number): number {
  return Math.max(0, Math.min(cap, Math.floor(base * scale)));
}
