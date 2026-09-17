/**
 * Deterministic procedural detail for the seabed.
 *
 * Why this exists
 * ---------------
 * GMRT cells are 46-450 m across. At 5 m altitude the raw grid reads as a
 * faceted low-poly blanket, which breaks the "it's really there" pillar. We add
 * a small, *honest* detail layer on top of the measured data: it never moves the
 * surface by more than a fraction of one source cell, so the large-scale shape
 * is still the survey's, but it gives the eye something to read at close range.
 *
 * Everything here is a pure function of WORLD POSITION (metres) only. That
 * matters for three reasons:
 *   - adjacent chunks evaluate identical values on their shared edge, so there
 *     are no seams;
 *   - `Terrain.sampleHeight` can add exactly the same term the mesh got, so
 *     collision matches what the player sees;
 *   - it is trivially unit-testable with no GPU.
 *
 * The lattice is rotated per octave. An axis-aligned value-noise lattice would
 * itself look like a grid -- the exact artefact we are trying to hide.
 */

/** 32-bit integer hash -> [0, 1). */
function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise on a unit lattice, in [0, 1). */
export function valueNoise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const ux = fade(x - ix);
  const uy = fade(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * ux;
  const bottom = c + (d - c) * ux;
  return top + (bottom - top) * uy;
}

// ~40 degrees. Coprime-ish with the data grid so octaves never stack up into
// visible rows.
const ROT_C = Math.cos(0.7);
const ROT_S = Math.sin(0.7);

/**
 * Fractal Brownian motion over `octaves` octaves of value noise, returned in
 * [-1, 1]. Lacunarity 2, gain 0.5, with a rotation and an offset per octave.
 */
export function fbm2(x: number, y: number, octaves: number, seed: number): number {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  let px = x;
  let py = y;
  for (let o = 0; o < octaves; o++) {
    sum += amp * (valueNoise2(px, py, seed + o * 1013) * 2 - 1);
    norm += amp;
    amp *= 0.5;
    // Rotate, scale by the lacunarity, and offset so octaves do not share zeros.
    const rx = px * ROT_C - py * ROT_S;
    const ry = px * ROT_S + py * ROT_C;
    px = rx * 2 + 31.416;
    py = ry * 2 - 17.129;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Everything the detail layer needs, precomputed once per tile. */
export interface DetailParams {
  /** Master multiplier. 0 disables the layer entirely ("pure data" mode). */
  strength: number;
  /** 1 / wavelength of the first octave, in 1/metres. */
  invWavelengthM: number;
  octaves: number;
  /** Peak amplitude in metres on fully rocky (steep) ground. */
  amplitudeM: number;
  /** Amplitude multiplier on flat sediment. */
  sedimentFactor: number;
  /** Slope (degrees) below which ground counts as flat sediment. */
  slopeLoDeg: number;
  /** Slope (degrees) above which ground counts as rock. */
  slopeHiDeg: number;
  seed: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Local amplitude in metres: sediment is smooth, rock is rough. */
export function detailAmplitude(slopeDeg: number, p: DetailParams): number {
  if (p.strength <= 0) return 0;
  const rockiness = smoothstep(p.slopeLoDeg, p.slopeHiDeg, slopeDeg);
  return p.amplitudeM * (p.sedimentFactor + (1 - p.sedimentFactor) * rockiness) * p.strength;
}

/**
 * Detail displacement in metres at a world position. Added to the measured
 * height along +Y (not along the normal) so that the height field stays a
 * function of (x, z) and `sampleHeight` remains single-valued.
 */
export function detailAt(x: number, z: number, slopeDeg: number, p: DetailParams): number {
  const amp = detailAmplitude(slopeDeg, p);
  if (amp === 0) return 0;
  return amp * fbm2(x * p.invWavelengthM, z * p.invWavelengthM, p.octaves, p.seed);
}
