/**
 * Per-quality-tier detail for the geology / biology set pieces. Everything a
 * phone cannot afford is scaled here: instanced colony counts, particle plume
 * counts, sphere and grid density, texture resolution and the bump map.
 * Unknown tiers fall back to `high`.
 */

export interface GeoDetail {
  /** Multiplier on instanced life (coral colonies, tubeworms, sponges, fringe). */
  growth: number;
  /** Multiplier on smoke and shimmer particle counts (0 = none). */
  plume: number;
  /** Icosphere subdivision for lumps and pillows (0-3). */
  sphereDetail: number;
  /** Multiplier on grid and ring counts of walls and columns. */
  meshDensity: number;
  /** Branching recursion depth of coral templates. */
  branchDepth: number;
  /** Canvas detail texture edge (px). */
  textureSize: number;
  /** Reuse the detail texture as a bump map. */
  bump: boolean;
  /** Draw small boulders and rubble instances. */
  rubble: boolean;
}

export const GEO_DETAIL: Record<string, GeoDetail> = {
  low: {
    growth: 0.25,
    plume: 0.35,
    sphereDetail: 1,
    meshDensity: 0.55,
    branchDepth: 2,
    textureSize: 256,
    bump: false,
    rubble: false,
  },
  medium: {
    growth: 0.6,
    plume: 0.7,
    sphereDetail: 2,
    meshDensity: 0.8,
    branchDepth: 3,
    textureSize: 512,
    bump: true,
    rubble: true,
  },
  high: {
    growth: 1,
    plume: 1,
    sphereDetail: 2,
    meshDensity: 1,
    branchDepth: 3,
    textureSize: 512,
    bump: true,
    rubble: true,
  },
  ultra: {
    growth: 1.6,
    plume: 1.5,
    sphereDetail: 3,
    meshDensity: 1.4,
    branchDepth: 3,
    textureSize: 1024,
    bump: true,
    rubble: true,
  },
};

export function geoDetail(tier: string): GeoDetail {
  return GEO_DETAIL[tier] ?? GEO_DETAIL.high!;
}
