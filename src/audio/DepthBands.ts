/**
 * Pure crossfade-weight maths for the ambient depth bands, split out from
 * AmbientBeds.ts so it is unit-testable without an AudioContext.
 *
 * `bands` must be ordered shallowest first (band[0].depth is the least
 * negative, typically 0). Returns one weight per band, summing to 1, with
 * only the one or two bands bracketing `depthM` non-zero.
 */
export function bandWeights(depthM: number, bands: ReadonlyArray<{ depth: number }>): number[] {
  const weights = new Array<number>(bands.length).fill(0);
  if (bands.length === 0) return weights;

  const d = Math.min(0, depthM);
  if (d >= bands[0].depth) {
    weights[0] = 1;
    return weights;
  }
  const last = bands.length - 1;
  if (d <= bands[last].depth) {
    weights[last] = 1;
    return weights;
  }
  for (let i = 0; i < last; i++) {
    const a = bands[i].depth;
    const b = bands[i + 1].depth;
    if (d <= a && d >= b) {
      const t = (a - d) / (a - b || 1);
      weights[i] = 1 - t;
      weights[i + 1] = t;
      return weights;
    }
  }
  return weights;
}
