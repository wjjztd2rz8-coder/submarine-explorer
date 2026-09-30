/** Materials for the geo set pieces: vertex colours times a neutral detail map. */

import * as THREE from 'three';
import type { GeoDetail } from './detail.js';
import { detailTexture, type GeoTexKind } from './textures.js';

/** Overall albedo multiplier for geo rock (vertex colours are authored in natural colours). */
export const ALBEDO = 0.24;

/** Tint for instanced life (colonies, worms, sponges, mats): brighter than rock, but not clipping. */
export const LIFE_TINT = 0x8c8c8c;

export interface GeoMaterialOpts {
  roughness?: number;
  bumpScale?: number;
  side?: THREE.Side;
  /** Use vertex colours (merged meshes); instanced meshes use instanceColor instead. */
  vertexColors?: boolean;
}

export function geoMaterial(
  kind: GeoTexKind,
  d: GeoDetail,
  o: GeoMaterialOpts = {},
): THREE.MeshStandardMaterial {
  const map = detailTexture(kind, d.textureSize);
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: o.vertexColors ?? true,
    roughness: o.roughness ?? 0.92,
    metalness: 0,
    map,
    // Banded strata alias badly as a bump map at range; they read fine from colour alone.
    bumpMap: d.bump && kind !== 'strata' ? map : null,
    bumpScale: o.bumpScale ?? 0.9,
    side: o.side ?? THREE.FrontSide,
  });
  // The game's headlights are strong up close and the art direction keeps rock dark: scale the
  // albedo down so pale rock (carbonate, tuff) does not clip to white.
  m.color.setScalar(ALBEDO / (map ? Math.max(0.05, map.userData.meanLinear as number) : 1));
  return m;
}
