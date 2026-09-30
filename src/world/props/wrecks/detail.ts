/**
 * Per-quality-tier detail for the wrecks. Everything a phone cannot afford is
 * scaled here: rusticle and sessile-life counts, railings, small debris, texture
 * resolution and the normal map. Unknown tiers (for example a future `ultra`
 * before this table learns it) fall back to `high`.
 */

export interface WreckDetail {
  /** Multiplier on each wreck's rusticle / anemone budget (0 = none). */
  growth: number;
  /** Thin instanced railings on deck edges. */
  railings: boolean;
  /** Portholes and window openings as instanced insets. */
  openings: boolean;
  /** Multiplier on scatter-kit piece counts. */
  debrisDensity: number;
  /** Small scatter pieces (coal, crockery, shoes, blocks); each is a draw call. */
  smallDebris: boolean;
  /** Canvas detail texture edge (px). */
  textureSize: number;
  /** Derive a normal map from the detail texture. */
  normalMap: boolean;
  /** Distance (m, from the hull's bounding box) at which the near LOD gives way to mid. */
  nearLodM: number;
  /** Hull grid density multiplier (stations along the length). */
  meshDensity: number;
}

export const WRECK_DETAIL: Record<string, WreckDetail> = {
  low: {
    growth: 0.2,
    railings: false,
    openings: false,
    debrisDensity: 0.35,
    smallDebris: false,
    textureSize: 256,
    normalMap: false,
    nearLodM: 45,
    meshDensity: 0.5,
  },
  medium: {
    growth: 0.5,
    railings: true,
    openings: true,
    debrisDensity: 0.6,
    smallDebris: true,
    textureSize: 512,
    normalMap: false,
    nearLodM: 70,
    meshDensity: 0.75,
  },
  high: {
    growth: 1,
    railings: true,
    openings: true,
    debrisDensity: 1,
    smallDebris: true,
    textureSize: 512,
    normalMap: true,
    nearLodM: 110,
    meshDensity: 1,
  },
  ultra: {
    growth: 1.6,
    railings: true,
    openings: true,
    debrisDensity: 1.4,
    smallDebris: true,
    textureSize: 1024,
    normalMap: true,
    nearLodM: 160,
    meshDensity: 1.25,
  },
};

export function wreckDetail(tier: string | undefined): WreckDetail {
  return WRECK_DETAIL[tier ?? 'high'] ?? WRECK_DETAIL.high!;
}
