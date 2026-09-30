/**
 * Per-site seabed palettes ("biomes"), keyed by tile id.
 *
 * The seabed material (`TerrainMaterial.ts`) blends three texture *slots*:
 * A, the primary soft bottom; B, a secondary patch material that breaks A up;
 * and C, the hard substrate that shows on slopes, ridges and scours. A biome
 * picks which CC0 texture set fills each slot and what colour it is: the
 * texture sets are luminance patterns (see tools/make_terrain_textures.py),
 * the hue comes from here. Colours are display sRGB hex and, being the mean
 * albedo of the slot, sit near the docs/art-direction.md §0 seabed range.
 *
 * The same table drives scatter (`scatter/Scatter.ts`): what small objects sit
 * on this floor and how thickly. Sites follow docs/research/sites.md.
 */

/** The five packed texture sets in `public/assets/terrain/<set>_{a,n}.jpg`. */
export type TerrainSet = 'silt' | 'sand' | 'basalt' | 'rubble' | 'carbonate';

export const TERRAIN_SETS: readonly TerrainSet[] = [
  'silt',
  'sand',
  'basalt',
  'rubble',
  'carbonate',
];

/**
 * Albedo pattern contrast per set (1 = as shipped): the silt is nearly flat so it
 * is stretched, the carbonate and rubble sets are already blotchy so they are not.
 */
export const SET_CONTRAST: Record<TerrainSet, number> = {
  silt: 1.9,
  sand: 1.3,
  basalt: 1.3,
  rubble: 0.95,
  carbonate: 0.75,
};

/** Scatter kinds a biome may request (see `scatter/ScatterTypes.ts`). */
export type ScatterKind =
  'boulder' | 'dropstone' | 'pillow' | 'rubble' | 'sponge' | 'seapen' | 'whip' | 'mound';

export interface ScatterSpec {
  kind: ScatterKind;
  /** Instances per 1000 m² at the `ultra` tier on ideal ground. */
  density: number;
  /** Ground slope window (degrees) where it may sit. */
  slopeMaxDeg: number;
  /** Which ground it prefers: 'flat' soft bottom, 'rock' hard substrate, or 'any'. */
  on: 'flat' | 'rock' | 'any';
}

export interface Biome {
  /** Slot A / B / C texture sets. */
  a: TerrainSet;
  b: TerrainSet;
  c: TerrainSet;
  /** sRGB hex mean albedo of each slot. */
  colorA: number;
  colorB: number;
  colorC: number;
  /** Staining colour (rust, sulphide, organic film) and its coverage, 0..1. */
  stain: number;
  stainAmount: number;
  /** Fraction of the flat bed covered by patch material B, 0..1. */
  patch: number;
  /** Current ripple strength on flat ground, 0..1, and crest wavelength (m). */
  ripple: number;
  rippleLenM: number;
  /** Ripple crest direction, radians from +X in the XZ plane. */
  rippleDir: number;
  /** Bioturbation mounds/tracks strength, 0..1. */
  burrow: number;
  /** Slot C coverage bias: + shows hard substrate on gentler slopes. */
  rockBias: number;
  scatter: ScatterSpec[];
}

const OOZE_SCATTER: ScatterSpec[] = [
  { kind: 'dropstone', density: 1.8, slopeMaxDeg: 18, on: 'flat' },
  { kind: 'mound', density: 3.5, slopeMaxDeg: 10, on: 'flat' },
];

/** Pale grey-beige abyssal ooze with dropstones (Titanic, Bismarck, Endurance). */
const ABYSSAL: Biome = {
  a: 'silt',
  b: 'sand',
  c: 'basalt',
  colorA: 0x45403a,
  colorB: 0x423d37,
  colorC: 0x2f2d2a,
  stain: 0x6b5a45,
  stainAmount: 0.12,
  patch: 0.3,
  ripple: 0.35,
  rippleLenM: 0.55,
  rippleDir: 0.6,
  burrow: 0.85,
  rockBias: 0,
  scatter: OOZE_SCATTER,
};

/** Fresh basalt with rust and sulphide staining (vent fields, seamounts). */
const VOLCANIC: Biome = {
  a: 'basalt',
  b: 'silt',
  c: 'basalt',
  colorA: 0x3f3d3d,
  colorB: 0x58524a,
  colorC: 0x2f2e30,
  stain: 0x8a4a22,
  stainAmount: 0.42,
  patch: 0.35,
  ripple: 0.1,
  rippleLenM: 0.45,
  rippleDir: 1.1,
  burrow: 0.25,
  rockBias: 0.25,
  scatter: [
    { kind: 'pillow', density: 2.6, slopeMaxDeg: 35, on: 'any' },
    { kind: 'boulder', density: 1.2, slopeMaxDeg: 40, on: 'rock' },
    { kind: 'mound', density: 1.0, slopeMaxDeg: 8, on: 'flat' },
  ],
};

/** Keyed by `meta.id`. Unknown tiles fall back to `DEFAULT_BIOME`. */
export const BIOMES: Record<string, Biome> = {
  titanic: { ...ABYSSAL },
  bismarck: {
    ...ABYSSAL,
    colorA: 0x45403a,
    colorB: 0x615c56,
    colorC: 0x3f3d3c,
    rockBias: 0.12,
    scatter: [
      { kind: 'dropstone', density: 0.7, slopeMaxDeg: 22, on: 'any' },
      { kind: 'boulder', density: 0.5, slopeMaxDeg: 35, on: 'rock' },
      { kind: 'mound', density: 3, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
  endurance: {
    ...ABYSSAL,
    colorA: 0x66635b,
    colorB: 0x585650,
    colorC: 0x44423e,
    stainAmount: 0.05,
    burrow: 0.6,
    scatter: [
      { kind: 'dropstone', density: 1.4, slopeMaxDeg: 20, on: 'flat' },
      { kind: 'sponge', density: 0.35, slopeMaxDeg: 12, on: 'flat' },
      { kind: 'mound', density: 2.5, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
  // Pale diatom ooze; almost nothing else. Sparse tracks and pits.
  'challenger-deep': {
    ...ABYSSAL,
    colorA: 0x6e6b60,
    colorB: 0x5f5c53,
    colorC: 0x4a4842,
    stainAmount: 0.03,
    burrow: 0.9,
    ripple: 0.15,
    rockBias: -0.1,
    scatter: [
      { kind: 'dropstone', density: 0.3, slopeMaxDeg: 20, on: 'any' },
      { kind: 'mound', density: 4, slopeMaxDeg: 12, on: 'flat' },
    ],
  },
  // Serpentinite and white carbonate, thin sediment.
  'lost-city': {
    a: 'carbonate',
    b: 'silt',
    c: 'carbonate',
    colorA: 0x5c594f,
    colorB: 0x4b493f,
    colorC: 0x45443f,
    stain: 0x7b6a4c,
    stainAmount: 0.18,
    patch: 0.4,
    ripple: 0.1,
    rippleLenM: 0.5,
    rippleDir: 0.3,
    burrow: 0.2,
    rockBias: 0.3,
    scatter: [
      { kind: 'boulder', density: 1.6, slopeMaxDeg: 45, on: 'any' },
      { kind: 'rubble', density: 5, slopeMaxDeg: 30, on: 'any' },
      { kind: 'sponge', density: 0.2, slopeMaxDeg: 40, on: 'rock' },
    ],
  },
  'axial-seamount-ashes': { ...VOLCANIC, colorB: 0x6a655c },
  'beebe-vent-field': { ...VOLCANIC, stainAmount: 0.5 },
  'hunga-tonga-caldera': {
    ...VOLCANIC,
    a: 'silt',
    b: 'basalt',
    colorA: 0x4d4b49,
    colorB: 0x3a3939,
    stainAmount: 0.15,
    patch: 0.3,
    rockBias: 0.1,
  },
  kamaehuakanaloa: { ...VOLCANIC, stain: 0x9a5326, stainAmount: 0.5 },
  // Cold-water coral rubble on carbonate sand.
  'blake-plateau-corals': {
    a: 'rubble',
    b: 'sand',
    c: 'carbonate',
    colorA: 0x5e594e,
    colorB: 0x524e43,
    colorC: 0x4a473d,
    stain: 0x6d5f47,
    stainAmount: 0.1,
    patch: 0.4,
    ripple: 0.45,
    rippleLenM: 0.6,
    rippleDir: 0.9,
    burrow: 0.5,
    rockBias: 0.1,
    scatter: [
      { kind: 'rubble', density: 8, slopeMaxDeg: 30, on: 'any' },
      { kind: 'sponge', density: 0.9, slopeMaxDeg: 30, on: 'any' },
      { kind: 'whip', density: 0.7, slopeMaxDeg: 30, on: 'any' },
      { kind: 'mound', density: 2, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
  // Limestone walls, pale silt floor.
  'great-blue-hole': {
    a: 'silt',
    b: 'sand',
    c: 'carbonate',
    colorA: 0x8a8471,
    colorB: 0x958e77,
    colorC: 0x7c7664,
    stain: 0x5f5a3a,
    stainAmount: 0.15,
    patch: 0.45,
    ripple: 0.6,
    rippleLenM: 0.4,
    rippleDir: 0.2,
    burrow: 0.6,
    rockBias: 0.15,
    scatter: [
      { kind: 'rubble', density: 3, slopeMaxDeg: 30, on: 'any' },
      { kind: 'boulder', density: 0.8, slopeMaxDeg: 45, on: 'rock' },
      { kind: 'mound', density: 2, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
  'monterey-canyon': {
    a: 'silt',
    b: 'sand',
    c: 'carbonate',
    colorA: 0x50493f,
    colorB: 0x62594a,
    colorC: 0x45423c,
    stain: 0x54503a,
    stainAmount: 0.1,
    patch: 0.35,
    ripple: 0.55,
    rippleLenM: 0.5,
    rippleDir: 1.4,
    burrow: 0.7,
    rockBias: 0.08,
    scatter: [
      { kind: 'boulder', density: 0.9, slopeMaxDeg: 40, on: 'rock' },
      { kind: 'seapen', density: 0.5, slopeMaxDeg: 10, on: 'flat' },
      { kind: 'mound', density: 3, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
  'hudson-canyon': {
    a: 'silt',
    b: 'sand',
    c: 'carbonate',
    colorA: 0x564f44,
    colorB: 0x685f4e,
    colorC: 0x4a4640,
    stain: 0x5a5140,
    stainAmount: 0.1,
    patch: 0.35,
    ripple: 0.5,
    rippleLenM: 0.5,
    rippleDir: 0.8,
    burrow: 0.7,
    rockBias: 0.08,
    scatter: [
      { kind: 'boulder', density: 0.8, slopeMaxDeg: 40, on: 'rock' },
      { kind: 'seapen', density: 0.4, slopeMaxDeg: 10, on: 'flat' },
      { kind: 'mound', density: 3, slopeMaxDeg: 10, on: 'flat' },
    ],
  },
};

/** Used for unknown tiles (including the synthetic demo tile). */
export const DEFAULT_BIOME: Biome = { ...ABYSSAL };

export function biomeFor(tileId: string): Biome {
  return BIOMES[tileId] ?? DEFAULT_BIOME;
}
