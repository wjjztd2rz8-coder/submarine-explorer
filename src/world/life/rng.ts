/** Small deterministic random sources for the life engine (seedable in tests). */

import { smoothstep } from '../../util/math.js';
export { clamp, lerp, smoothstep } from '../../util/math.js';
export { mulberry32 } from '../../util/rng.js';

export type Rand = () => number;

/** Stable hash of integer coordinates and a salt to [0, 1): same cell, same answer. */
export function hash3(a: number, b: number, salt: number): number {
  let h =
    Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Bioluminescence and the dark show only in dark water: 0 in daylight, 1 below about 450 m. */
export const darkness = (depthM: number): number => smoothstep(90, 450, depthM);
