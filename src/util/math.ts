/** Min/max clamping, including the existing default unit interval. */
export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number): number => clamp(v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Raw cubic on a unit-domain input; callers decide whether to clamp. */
export const smoothstepUnit = (t: number): number => t * t * (3 - 2 * t);

/** Clamped one-input cubic, as used by depth-band interpolation. */
export const smoothstep01 = (t: number): number => smoothstepUnit(clamp01(t));

/** Edge-based cubic. Reversed edges work; equal edges retain division semantics. */
export const smoothstep = (a: number, b: number, v: number): number =>
  smoothstep01((v - a) / (b - a));
