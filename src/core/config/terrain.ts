/**
 * Terrain mesh, procedural detail, LOD and seabed material (docs/terrain.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

import type { GraphicsTier } from './quality.js';

/** Per-tier knobs for the terrain renderer. */
export interface TerrainTier {
  /** Vertex subdivisions per source bathymetry cell edge. 1 = raw data resolution. */
  detailSubdiv: number;
  /** Octaves of detail noise evaluated per vertex. */
  detailOctaves: number;
  /** Edge length of the generated seabed textures, in pixels. */
  textureSize: number;
  /** Multiplier on the LOD switch distances (higher = keep detail further out). */
  lodDistanceScale: number;
}

export interface TerrainConfig {
  /** Source cells per chunk edge. 64 keeps a subdivided chunk inside 16-bit indices. */
  chunkCells: number;
  /**
   * Vertical exaggeration. 1.0 = true scale. Real bathymetry over a 40 km tile
   * is quite flat; a small exaggeration reads better without lying much.
   */
  verticalExaggeration: number;
  /** Depth colour ramp, deepest first. `depth` is metres (negative). */
  colorRamp: Array<{ depth: number; color: number }>;

  // --- procedural detail layer (docs/terrain.md) ---------------------------
  /**
   * Master multiplier on the procedural detail displacement.
   * 0 = "pure data" mode: the mesh is exactly the survey grid. Exposed in the
   * settings screen.
   */
  detailStrength: number;
  /** Peak detail amplitude as a fraction of the local cell size. */
  detailAmplitudeCells: number;
  /** Wavelength of the first detail octave, in source cells. */
  detailWavelengthCells: number;
  /** Detail amplitude multiplier on flat sediment (see detailSlopeLoDeg). */
  detailSedimentFactor: number;
  /** Below this slope the seabed counts as settled sediment. */
  detailSlopeLoDeg: number;
  /** Above this slope the seabed counts as scoured rock. */
  detailSlopeHiDeg: number;
  /** Seed for the detail noise. Changing it reshuffles every tile's detail. */
  detailSeed: number;

  // --- chunk LOD -----------------------------------------------------------
  /** Camera distances (m) at which a chunk drops to LOD 1 and LOD 2. */
  lodDistancesM: [number, number];
  /** How far each chunk's perimeter skirt hangs down, in metres. */
  skirtDepthM: number;

  // --- triplanar material --------------------------------------------------
  /** Metres per repeat of the seabed albedo textures. */
  materialTextureScaleM: number;
  /** Metres per repeat of the detail slope (normal) texture. */
  materialGradScaleM: number;
  /** Strength of the normal-map detail. 0 = geometry normals only. */
  materialNormalStrength: number;
  /** Below this slope the material is pure sediment. */
  rockSlopeLoDeg: number;
  /** Above this slope the material is pure rock. */
  rockSlopeHiDeg: number;
  /** Depth (m, negative) above which the bed is pure sand. */
  sandDepthShallow: number;
  /** Depth (m, negative) below which there is no sand at all. */
  sandDepthDeep: number;
  /** Basalt albedo (art-direction §0 `#3B3A3D`) that steep rock blends toward. */
  rockColor: number;
  /** 0..1: how far fully-steep rock is pulled from the depth ramp to `rockColor`. */
  rockColorMix: number;
  /**
   * Resident-vertex budget for the whole tile, skirts excluded. If
   * `cols*rows*subdiv^2` exceeds it, `detailSubdiv` is stepped down (3 -> 2 -> 1)
   * until it fits; `debugString()` reports the downgrade. See docs/terrain.md.
   */
  maxVertices: number;

  tiers: Record<GraphicsTier, TerrainTier>;
}

export const DEFAULT_TERRAIN: TerrainConfig = {
  // 64 source cells x subdiv 2 = a 129x129 vertex chunk, which still fits in
  // 16-bit indices and gives the LOD selector something to actually choose
  // between on a 25 km tile.
  chunkCells: 64,
  verticalExaggeration: 1.0,
  /**
   * Deepest -> shallowest, interpolated linearly in RGB. These are the
   * docs/art-direction.md §0 seabed albedos (sRGB hex): sand #C9B489 above
   * ~200 m, sediment #7A6E5C below it, drifting slightly greyer on the
   * abyssal plain. Hue comes from here and from the lights; keep every stop
   * low-saturation -- a green or teal stop multiplied by the cyan water light
   * is what turned the shallow tiles neon (QA-B #4).
   */
  colorRamp: [
    { depth: -6000, color: 0x6f6a62 },
    { depth: -3000, color: 0x756d60 },
    { depth: -400, color: 0x7a6e5c },
    { depth: -260, color: 0x8f8068 },
    { depth: -120, color: 0xbfab83 },
    { depth: 0, color: 0xc9b489 },
    { depth: 300, color: 0xb39a72 },
  ],

  detailStrength: 1.0,
  // 15 % of a cell: at Titanic's 46 m cells that is +-6.9 m on rock, which is
  // enough to break the facets without inventing a landform.
  detailAmplitudeCells: 0.15,
  // 3 cells for the first octave; with subdiv 2 the third octave lands at
  // 0.75 cells, i.e. 1.5 vertex spacings -- just above the Nyquist limit.
  detailWavelengthCells: 3.0,
  detailSedimentFactor: 0.3,
  detailSlopeLoDeg: 4,
  detailSlopeHiDeg: 25,
  detailSeed: 20260917,

  lodDistancesM: [1400, 4200],
  // Comfortably more than the worst-case LOD disagreement (one detail
  // amplitude plus half a coarse cell of height error).
  skirtDepthM: 60,

  materialTextureScaleM: 34,
  materialGradScaleM: 7,
  materialNormalStrength: 0.7,
  rockSlopeLoDeg: 18,
  rockSlopeHiDeg: 32,
  sandDepthShallow: -120,
  sandDepthDeep: -260,
  rockColor: 0x3b3a3d,
  rockColorMix: 0.6,
  maxVertices: 4_000_000,

  tiers: {
    low: { detailSubdiv: 1, detailOctaves: 2, textureSize: 128, lodDistanceScale: 0.55 },
    medium: { detailSubdiv: 2, detailOctaves: 3, textureSize: 256, lodDistanceScale: 1.0 },
    high: { detailSubdiv: 3, detailOctaves: 4, textureSize: 512, lodDistanceScale: 1.8 },
    // F0-CORE: ultra starts as high; wave-1 packages raise its budgets.
    ultra: { detailSubdiv: 3, detailOctaves: 4, textureSize: 512, lodDistanceScale: 1.8 },
  },
};
