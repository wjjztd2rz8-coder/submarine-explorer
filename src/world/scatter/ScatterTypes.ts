/**
 * What each scatter kind looks like and how it is laid out: size range, how far
 * it sinks into the bed, how it tilts, how clumped it is and how far away it is
 * still worth drawing. Geometry lives in `ScatterGeometry.ts`; where and how
 * densely a kind occurs per site is in `TerrainBiome.ts`.
 */

import type * as THREE from 'three';
import type { Biome, ScatterKind } from '../TerrainBiome.js';
import {
  boulderGeometry,
  ledgeGeometry,
  tubeSpongeGeometry,
  dropstoneGeometry,
  moundGeometry,
  pillowGeometry,
  rubbleGeometry,
  seaPenGeometry,
  spongeGeometry,
  whipGeometry,
} from './ScatterGeometry.js';

/** `rock` samples the site's hard-substrate texture; `soft` is plain vertex/instance colour. */
export type ScatterMaterialKind = 'rock' | 'soft';

export interface ScatterTypeDef {
  material: ScatterMaterialKind;
  geometry: () => THREE.BufferGeometry;
  /** Uniform scale range in metres (multiplies the ~1 m unit shape). */
  size: [number, number];
  /** Non-uniform squash applied on top: min/max multiplier for the vertical axis. */
  height: [number, number];
  /** Fraction of the height sunk below the bed surface. */
  embed: number;
  /** How far the instance leans to the ground normal, 0 = upright, 1 = aligned. */
  align: number;
  /** Extra random tilt in radians. */
  wobble: number;
  /** Members per clump (1 = solitary) and clump radius in metres. */
  clump: [number, number];
  clumpRadiusM: number;
  /** Patchiness: 0 = uniform Poisson, 1 = only inside the noise blobs. */
  patchiness: number;
  /** Noise blob size in metres for patchiness. */
  patchScaleM: number;
  /** Beyond this camera distance the kind is not drawn (metres). */
  drawRangeM: number;
  /** Base colour for this kind at this site (linear, via hex) and its variation. */
  color: (biome: Biome, rnd: () => number, out: [number, number, number]) => void;
}

/** sRGB hex -> linear rgb, without importing Color (keeps this node-testable). */
export function hexToLinear(hex: number, out: [number, number, number]): void {
  const f = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  out[0] = f((hex >> 16) & 255);
  out[1] = f((hex >> 8) & 255);
  out[2] = f(hex & 255);
}

function tinted(
  hex: number,
  lo: number,
  hi: number,
  rnd: () => number,
  out: [number, number, number],
): void {
  hexToLinear(hex, out);
  const k = lo + (hi - lo) * rnd();
  out[0] *= k;
  out[1] *= k;
  out[2] *= k;
}

// Muted sponge palette (sRGB): ochre, pale cream, dusky orange, grey-lilac.
const SPONGE_HUES = [0xb59a55, 0xc9bfa0, 0xa8663b, 0x8f8290];

const TUBE_HUES = [0x7d6f9a, 0xb86f55, 0xc7b36a, 0x6a8f93, 0x9c7a8e];

export const SCATTER_TYPES: Record<ScatterKind, ScatterTypeDef> = {
  boulder: {
    material: 'rock',
    geometry: boulderGeometry,
    size: [0.5, 2.6],
    height: [0.7, 1.3],
    embed: 0.3,
    align: 0.4,
    wobble: 0.25,
    clump: [1, 3],
    clumpRadiusM: 3,
    patchiness: 0.5,
    patchScaleM: 45,
    drawRangeM: 1e9,
    color: (b, r, o) => tinted(b.colorC, 0.7, 1.45, r, o),
  },
  dropstone: {
    material: 'rock',
    geometry: dropstoneGeometry,
    size: [0.12, 0.7],
    height: [0.8, 1.15],
    embed: 0.35,
    align: 0.3,
    wobble: 0.4,
    clump: [1, 1],
    clumpRadiusM: 1,
    patchiness: 0,
    patchScaleM: 50,
    drawRangeM: 1e9,
    // Glacial stones are darker than the ooze they sit on.
    color: (b, r, o) => tinted(b.colorC, 0.55, 1.1, r, o),
  },
  pillow: {
    material: 'rock',
    geometry: pillowGeometry,
    size: [0.6, 1.9],
    height: [0.8, 1.2],
    embed: 0.32,
    align: 0.7,
    wobble: 0.3,
    clump: [3, 8],
    clumpRadiusM: 3.2,
    patchiness: 0.75,
    patchScaleM: 32,
    drawRangeM: 1e9,
    color: (b, r, o) => tinted(b.colorC, 0.8, 1.2, r, o),
  },
  rubble: {
    material: 'rock',
    geometry: rubbleGeometry,
    size: [0.08, 0.45],
    height: [0.7, 1.3],
    embed: 0.3,
    align: 0.5,
    wobble: 0.6,
    clump: [3, 9],
    clumpRadiusM: 1.4,
    patchiness: 0.7,
    patchScaleM: 22,
    drawRangeM: 95,
    // Pale coral / carbonate fragments read against a darker bed.
    color: (b, r, o) => tinted(b.colorA, 1.1, 2.0, r, o),
  },
  sponge: {
    material: 'soft',
    geometry: spongeGeometry,
    size: [0.15, 0.7],
    height: [0.8, 1.5],
    embed: 0.04,
    align: 0.15,
    wobble: 0.1,
    clump: [1, 3],
    clumpRadiusM: 2,
    patchiness: 0.7,
    patchScaleM: 30,
    drawRangeM: 120,
    color: (_b, r, o) =>
      tinted(
        SPONGE_HUES[Math.floor(r() * SPONGE_HUES.length) % SPONGE_HUES.length] as number,
        0.7,
        1.15,
        r,
        o,
      ),
  },
  seapen: {
    material: 'soft',
    geometry: seaPenGeometry,
    size: [0.25, 0.7],
    height: [0.8, 1.3],
    embed: 0.03,
    align: 0.0,
    wobble: 0.12,
    clump: [2, 6],
    clumpRadiusM: 2.4,
    patchiness: 0.7,
    patchScaleM: 28,
    drawRangeM: 90,
    color: (_b, r, o) => tinted(0xd9b58a, 0.7, 1.1, r, o),
  },
  whip: {
    material: 'soft',
    geometry: whipGeometry,
    size: [0.4, 1.3],
    height: [0.8, 1.4],
    embed: 0.02,
    align: 0.05,
    wobble: 0.2,
    clump: [2, 5],
    clumpRadiusM: 2.4,
    patchiness: 0.75,
    patchScaleM: 26,
    drawRangeM: 100,
    color: (_b, r, o) => tinted(0xd2c7ae, 0.7, 1.15, r, o),
  },
  // Awning slab that juts from a steep wall: a half-buried flat plate with a dark underside.
  ledge: {
    material: 'rock',
    geometry: ledgeGeometry,
    size: [2.5, 6.5],
    height: [0.7, 1.3],
    embed: 0.35,
    align: 0.0,
    wobble: 0.08,
    clump: [1, 2],
    clumpRadiusM: 5,
    patchiness: 0.55,
    patchScaleM: 38,
    drawRangeM: 220,
    color: (b, r, o) => tinted(b.colorC, 0.38, 0.75, r, o),
  },
  // Slender capsule tube sponges in leaning clusters, several muted hues.
  tube: {
    material: 'soft',
    geometry: tubeSpongeGeometry,
    size: [0.4, 1.5],
    height: [0.9, 2.2],
    embed: 0.05,
    align: 0.25,
    wobble: 0.22,
    clump: [3, 7],
    clumpRadiusM: 1.6,
    patchiness: 0.75,
    patchScaleM: 24,
    drawRangeM: 140,
    color: (_b, r, o) =>
      tinted(
        TUBE_HUES[Math.floor(r() * TUBE_HUES.length) % TUBE_HUES.length] as number,
        0.75,
        1.2,
        r,
        o,
      ),
  },
  mound: {
    material: 'soft',
    geometry: moundGeometry,
    size: [0.25, 0.85],
    height: [0.9, 1.8],
    embed: 0.1,
    align: 0.9,
    wobble: 0.0,
    clump: [1, 2],
    clumpRadiusM: 1.2,
    patchiness: 0.2,
    patchScaleM: 30,
    drawRangeM: 70,
    color: (b, r, o) => tinted(b.colorA, 1.0, 1.35, r, o),
  },
};
