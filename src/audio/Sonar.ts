/**
 * Pure sonar ray-march maths, kept free of WebAudio/Three.js so it is
 * unit-testable headlessly (see tests/unit/audio.test.ts).
 *
 * A real hull-mounted forward sonar looks slightly downward. We march a ray
 * from the sub along `dir` in fixed steps and report the range at which it
 * first dips below the seabed (`Terrain.sampleHeight`-compatible sampler).
 * The round-trip echo delay is the textbook `2 * range / speedOfSound`
 * (~1500 m/s in seawater) -- the same formula real sonar operators use.
 */

import type { TerrainSampler } from './events.js';

export interface EchoResult {
  rangeM: number;
  delayS: number;
}

export interface SonarRayOptions {
  maxRangeM: number;
  stepM: number;
  speedOfSoundMps: number;
}

/** Returns null if the beam does not hit terrain within `maxRangeM`. */
export function castSonarRay(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  sampler: TerrainSampler,
  opts: SonarRayOptions,
): EchoResult | null {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const dx = dir.x / len;
  const dy = dir.y / len;
  const dz = dir.z / len;

  for (let range = opts.stepM; range <= opts.maxRangeM; range += opts.stepM) {
    const x = origin.x + dx * range;
    const y = origin.y + dy * range;
    const z = origin.z + dz * range;
    const ground = sampler.sampleHeight(x, z);
    if (y <= ground) {
      return { rangeM: range, delayS: (2 * range) / opts.speedOfSoundMps };
    }
  }
  return null;
}
