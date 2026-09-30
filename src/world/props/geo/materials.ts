/** Materials for the geo set pieces: vertex colours times a neutral detail map. */

import * as THREE from 'three';
import type { GeoDetail } from './detail.js';
import { detailTexture, type GeoTexKind } from './textures.js';

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
    bumpMap: d.bump ? map : null,
    bumpScale: o.bumpScale ?? 1.4,
    side: o.side ?? THREE.FrontSide,
  });
  if (map) m.color.setScalar(1 / Math.max(0.05, map.userData.meanLinear as number));
  return m;
}
