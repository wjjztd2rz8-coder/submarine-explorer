/**
 * Graphics quality tiers, the `auto` setting and dynamic resolution tunables.
 * Detection itself lives in `core/Quality.ts`. Split out of `core/Config.ts`
 * (F0-CORE); import from `core/Config.js`.
 */

/**
 * Graphics quality tier. `medium` is the floor we hold 60 fps at 1080p on
 * (Apple M-series); `high` targets a discrete desktop GPU; `low` is the
 * integrated-Intel and phone escape hatch. `ultra` starts as `high` with a
 * higher pixel-ratio cap; Phase F packages add to it. See docs/terrain.md and
 * plan/DECISIONS.md.
 */
export type GraphicsTier = 'low' | 'medium' | 'high' | 'ultra';

/** Every tier, lowest first. */
export const GRAPHICS_TIERS: readonly GraphicsTier[] = ['low', 'medium', 'high', 'ultra'];

/** The saved setting: a fixed tier, or `auto` (detected at boot, `core/Quality.ts`). */
export type GraphicsTierSetting = GraphicsTier | 'auto';

/** Per-tier renderer knobs owned by the bootstrap (not by a world module). */
export interface QualityTier {
  /** Upper bound on `renderer.setPixelRatio` (the device ratio is used below it). */
  maxPixelRatio: number;
}

/**
 * Dynamic resolution (`core/Quality.ts` `DynamicResolution`): when the frame
 * time stays over budget the pixel ratio steps down, and it steps back up when
 * there is headroom. Separate thresholds and hold times give hysteresis.
 */
export interface DynamicResolutionConfig {
  /** Frame-time budget (ms). 60 fps plus a little slack. */
  budgetMs: number;
  /** Step down when the smoothed frame time exceeds budget x this... */
  overBudgetFactor: number;
  /** ...continuously for this long (s). */
  downHoldS: number;
  /** Step up when the smoothed frame time is under budget x this... */
  headroomFactor: number;
  /** ...continuously for this long (s). Longer than `downHoldS`, so it settles. */
  upHoldS: number;
  /** Pixel-ratio change per step. */
  step: number;
  /** Never go below this pixel ratio. */
  minPixelRatio: number;
  /** Seconds to ignore after a change (the new size needs a few frames to settle). */
  cooldownS: number;
  /** EMA time constant (s) for the smoothed frame time. */
  smoothingS: number;
}

export interface QualityConfig {
  tiers: Record<GraphicsTier, QualityTier>;
  dynamicResolution: DynamicResolutionConfig;
}

export const DEFAULT_QUALITY: QualityConfig = {
  tiers: {
    // low..high keep the pre-Phase-F cap of 2 so their look is unchanged.
    low: { maxPixelRatio: 2 },
    medium: { maxPixelRatio: 2 },
    high: { maxPixelRatio: 2 },
    ultra: { maxPixelRatio: 3 },
  },
  dynamicResolution: {
    budgetMs: 1000 / 55,
    overBudgetFactor: 1.15,
    downHoldS: 1.5,
    headroomFactor: 0.7,
    upHoldS: 5,
    step: 0.25,
    minPixelRatio: 0.5,
    cooldownS: 1,
    smoothingS: 0.5,
  },
};
