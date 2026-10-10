/**
 * Depth bands, fog, water surface and per-tier atmosphere knobs (docs/atmosphere.md).
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

import type { GraphicsTier } from './quality.js';

/** Titanic / Endurance's existing unlit dome; no extra particle or mesh budget. */
export const ABYSS_HORIZON = {
  upperColor: 0x1b2b35,
  hazeColor: 0x1d2e38,
  // Keep the fog hue and nearby exposure stable; terrain fades into this colour.
  fogLift: 0.4,
  fadeStartM: 700,
  fadeEndM: 1200,
  // Elevations are unit-sphere Y. Match fog through the first ring above level
  // to avoid outlining far seabed in pitched and portrait views.
  fogMatchElevation: 0.2,
  hazePeakElevation: 0.5,
  upperElevation: 1,
  // Broad, faint suspended-sediment variation, baked into existing vertices.
  glowVariation: 0.08,
  glowLobes: 3,
} as const;

/** The four depth bands of docs/art-direction.md §0, shallowest first. */
export type DepthBandName = 'surface' | 'twilight' | 'midnight' | 'abyss';

/**
 * One stop of the depth-driven light model. Stops are interpolated smoothly by
 * camera depth (never hard-cut), so 180 m and 220 m differ only slightly.
 * Colours and fog densities are the published art-direction values.
 */
export interface DepthBandSpec {
  name: DepthBandName;
  /** Depth (negative metres) at which this stop is reached exactly. */
  depth: number;
  /** Water/surface colour at this stop. */
  waterColor: number;
  /** Fog and scene-background colour. */
  fogColor: number;
  /**
   * FogExp2 coefficient *as published in docs/art-direction.md §0*. It is
   * multiplied by {@link AtmosphereConfig.fogDensityScale} before use -- see
   * docs/atmosphere.md for why the literal value is a close-quarters number.
   */
  fogDensity: number;
  ambientColor: number;
  ambientIntensity: number;
  /** Filtered-sunlight directional intensity. Zero below the photic zone. */
  sunIntensity: number;
  /** Colour-grade applied by the post stack inside this band. */
  grade: { tint: number; gain: number; saturation: number; vignette: number };
  /** Marine-snow density multiplier and drift speed (m/s) in this band. */
  snowDensity: number;
  snowDriftMps: number;
}

/** Per-tier atmosphere knobs. `low` is fog + headlights only. */
export interface AtmosphereTier {
  /** Run the post stack at all. */
  post: boolean;
  /** Radial god rays in the post pass (only ever above `causticsEndM`). */
  godRays: boolean;
  /** Marine-snow particle budget. 0 disables the field. */
  snowCount: number;
  /** Caustic projector texture size in pixels. 0 disables caustics. */
  causticsSize: number;
  /** Draw the soft headlight cone volumes. */
  headlightCones: boolean;
  /** Chromatic-aberration strength multiplier. */
  aberration: number;
  /** F1-OCEAN: bloom blur levels (0 = off, 1 = one quarter-res level, 2 = adds an eighth-res level). */
  bloomLevels: 0 | 1 | 2;
  /** F1-OCEAN: god-ray noise octaves in the post pass (0 = off). */
  rayOctaves: 0 | 1 | 2;
  /** F1-OCEAN: MSAA samples on the scene render target (0 = none). */
  msaa: 0 | 2 | 4;
  /** F1-OCEAN: headlight beam detail: 0 = plain cheap cone, 1 = dusty, 2 = dusty with more segments. */
  beamDetail: 0 | 1 | 2;
}

export interface WaterConfig {
  // --- superseded by `bands` (A2); kept so nothing that still reads them
  // --- breaks. Safe to delete once no module references them.
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDensityShallow: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDensityDeep: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  fogDeepAt: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  deepColor: number;
  /** @deprecated use {@link WaterConfig.bands}. */
  ambientIntensity: number;

  surfaceColor: number;
  headlightIntensity: number;
  headlightDistance: number;
  headlightAngleDeg: number;

  // --- A2: depth-driven atmosphere (docs/atmosphere.md) --------------------
  /** Depth-band stops, shallowest first. Must be ordered and non-empty. */
  bands: DepthBandSpec[];
  /**
   * Global multiplier on every band's published fog density. The art-direction
   * coefficients (0.010-0.050) describe a 20-200 m sight line; this game's
   * chase camera sits 123 m behind the boat and navigation needs kilometre
   * sight lines over a 25-40 km tile, so the shipped default scales them down
   * while keeping the 5:1 surface-to-abyss *ratio* that sells depth. Set to 1
   * for the literal art-direction look (usable in first person).
   */
  fogDensityScale: number;
  /** Colour of the headlight beam (art direction: slightly warm white). */
  headlightColor: number;
  /** Lateral separation of the two headlights, metres. */
  headlightSeparationM: number;
  /** Peak opacity of the fake volumetric cone around each headlight. */
  headlightConeOpacity: number;
  /** Caustics are full strength above this depth and gone below `causticsEndM`. */
  causticsStartM: number;
  causticsEndM: number;
  /** Caustic projector brightness, projection footprint (m) and frames/second. */
  causticsIntensity: number;
  causticsFootprintM: number;
  causticsFps: number;
  /** Edge of the wrapping marine-snow box around the camera, metres. */
  snowBoxM: number;
  /** Marine-snow point size in metres (size-attenuated). */
  snowSizeM: number;
  /** Permanent snow opacity and extra linear brightness inside the lamp cone. */
  snowOpacity: number;
  snowLampGain: number;
  /** Radial far fade; permanent snow vanishes at snowFadeEndM. */
  snowFadeStartM: number;
  snowFadeEndM: number;
  /** Point diameter in drawing-buffer pixels; independent of tier and DPR. */
  snowMaxSizePx: number;
  /** Camera-relative foreground guard, easing back to normal by fadeEndM. */
  snowForegroundM: number;
  snowForegroundFadeEndM: number;
  snowForegroundSizePx: number;
  /** Sprite-centre alpha and linear colour multiplier, including lamp flare. */
  snowForegroundAlpha: number;
  snowForegroundBrightness: number;
  /** The sea surface is only drawn when the camera is shallower than this. */
  surfaceVisibleAboveM: number;
  /** Sea-surface wave amplitude (m) and wavelength (m) for the Fresnel lid. */
  surfaceWaveAmpM: number;
  surfaceWaveLengthM: number;
  /** Post: base chromatic aberration in UV units, and god-ray strength. */
  aberrationStrength: number;
  godRayStrength: number;
  tiers: Record<GraphicsTier, AtmosphereTier>;
}

export const DEFAULT_WATER: WaterConfig = {
  fogDensityShallow: 0.0006,
  // Tuned so the seabed stays legible from the default chase camera: visual
  // range is roughly 2/density, i.e. ~1.2 km in the deep.
  fogDensityDeep: 0.0007,
  fogDeepAt: -3000,
  surfaceColor: 0x2e6f96,
  // Not black: the fog colour is also the horizon colour, and pure black
  // makes the terrain silhouette disappear entirely.
  deepColor: 0x17384a,
  ambientIntensity: 2.4,
  // A softened distance falloff preserves close material colour while keeping
  // a navigable pool ahead. Gameplay presets override these standalone defaults.
  headlightIntensity: 500,
  headlightDistance: 2000,
  headlightAngleDeg: 32,

  // Colours, fog coefficients and band edges are verbatim from
  // docs/art-direction.md §0. Light intensities and grades are A2's.
  bands: [
    {
      name: 'surface',
      depth: 0,
      waterColor: 0x3e9db8,
      fogColor: 0x5aafc4,
      fogDensity: 0.01,
      ambientColor: 0xbfe4e8,
      // Intensities assume the post pass tone-maps and sRGB-encodes (it did
      // not before QA-B #4, and these were ~3x hotter to compensate).
      ambientIntensity: 0.9,
      // Warm sun highlight #FFE9B8 lives on the directional light.
      sunIntensity: 1.0,
      grade: { tint: 0xeaf6ff, gain: 1.0, saturation: 1.06, vignette: 0.22 },
      snowDensity: 0.35,
      snowDriftMps: 0.35,
    },
    {
      name: 'twilight',
      depth: -20,
      waterColor: 0x1c5c74,
      fogColor: 0x2a5568,
      fogDensity: 0.02,
      ambientColor: 0x86b9c9,
      ambientIntensity: 0.55,
      sunIntensity: 0.35,
      grade: { tint: 0xbfe4f2, gain: 0.98, saturation: 1.0, vignette: 0.3 },
      snowDensity: 0.7,
      snowDriftMps: 0.25,
    },
    {
      name: 'midnight',
      depth: -200,
      waterColor: 0x0a2c3d,
      fogColor: 0x0e2530,
      fogDensity: 0.035,
      // Near-black: below ~200 m essentially all light is borrowed from the
      // sub's own rig (art-direction §6).
      ambientColor: 0x2e4e5e,
      ambientIntensity: 0.4,
      sunIntensity: 0.06,
      grade: { tint: 0x9fd4e8, gain: 0.95, saturation: 0.92, vignette: 0.4 },
      snowDensity: 1.0,
      snowDriftMps: 0.15,
    },
    {
      name: 'abyss',
      depth: -1000,
      waterColor: 0x040f16,
      fogColor: 0x050c10,
      fogDensity: 0.05,
      ambientColor: 0x1a2a33,
      // Not literally zero: a sliver of ambient keeps the terrain silhouette
      // readable outside the headlight pool instead of a black rectangle.
      ambientIntensity: 0.18,
      sunIntensity: 0,
      grade: { tint: 0x8fc8e0, gain: 0.92, saturation: 0.85, vignette: 0.52 },
      snowDensity: 0.8,
      snowDriftMps: 0.1,
    },
  ],
  fogDensityScale: 0.02,
  headlightColor: 0xfff3dd,
  headlightSeparationM: 3.2,
  headlightConeOpacity: 0.012,
  causticsStartM: -20,
  causticsEndM: -60,
  causticsIntensity: 3.6,
  causticsFootprintM: 320,
  causticsFps: 12,
  snowBoxM: 160,
  snowSizeM: 0.08,
  snowOpacity: 0.24,
  snowLampGain: 0.8,
  snowFadeStartM: 40,
  snowFadeEndM: 80,
  snowMaxSizePx: 3,
  snowForegroundM: 6,
  snowForegroundFadeEndM: 12,
  snowForegroundSizePx: 2,
  snowForegroundAlpha: 0.12,
  snowForegroundBrightness: 0.65,
  surfaceVisibleAboveM: -160,
  surfaceWaveAmpM: 0.9,
  surfaceWaveLengthM: 22,
  aberrationStrength: 0.0016,
  godRayStrength: 0.35,
  tiers: {
    // low = the floor: fog, headlights, a plain beam cone and a little marine snow; no post pass.
    low: {
      post: false,
      godRays: false,
      snowCount: 300,
      causticsSize: 0,
      headlightCones: true,
      aberration: 0,
      bloomLevels: 0,
      rayOctaves: 0,
      msaa: 0,
      beamDetail: 0,
    },
    medium: {
      post: true,
      godRays: true,
      snowCount: 1200,
      causticsSize: 128,
      headlightCones: true,
      aberration: 1,
      bloomLevels: 1,
      rayOctaves: 1,
      msaa: 0,
      beamDetail: 1,
    },
    high: {
      post: true,
      godRays: true,
      snowCount: 3000,
      causticsSize: 256,
      headlightCones: true,
      aberration: 1.4,
      bloomLevels: 2,
      rayOctaves: 2,
      msaa: 4,
      beamDetail: 2,
    },
    // F0-CORE: ultra starts as high; wave-1 packages raise its budgets.
    ultra: {
      post: true,
      godRays: true,
      snowCount: 3000,
      causticsSize: 256,
      headlightCones: true,
      aberration: 1.4,
      bloomLevels: 2,
      rayOctaves: 2,
      msaa: 4,
      beamDetail: 2,
    },
  },
};

/** The six 990 openings whose floor disappears outside the lamps on Low. */
export const LOW_READABILITY_SITES: readonly string[] = [
  'axial-seamount-ashes',
  'bismarck',
  'blake-plateau-corals',
  'hudson-canyon',
  'hunga-tonga-caldera',
  'kamaehuakanaloa',
];

const LOW_SEABED_LIGHT = { depthM: -200, color: 0x879399, intensity: 3 };

/** Reuse the existing ambient light; no extra lights, geometry or post passes. */
export function lowSiteWater(site: string, tier: GraphicsTier, water: WaterConfig): WaterConfig {
  if (tier !== 'low' || !LOW_READABILITY_SITES.includes(site)) return water;
  return {
    ...water,
    bands: water.bands.map((band) =>
      band.depth <= LOW_SEABED_LIGHT.depthM
        ? {
            ...band,
            ambientColor: LOW_SEABED_LIGHT.color,
            ambientIntensity: Math.max(band.ambientIntensity, LOW_SEABED_LIGHT.intensity),
          }
        : band,
    ),
  };
}
