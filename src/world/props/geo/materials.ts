/** Materials for the geo set pieces: vertex colours times a neutral detail map. */

import * as THREE from 'three';
import type { GeoDetail } from './detail.js';
import { detailTexture, type GeoTexKind } from './textures.js';

/** Overall albedo multiplier for geo rock (vertex colours are authored in natural colours). */
export const ALBEDO = 0.07;

/** Tint for instanced life (colonies, worms, sponges, mats): brighter than rock, but not clipping. */
export const LIFE_TINT = 0x666666;

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

/**
 * A faint self-lit lift that follows the vertex colours (and so keeps the form: pale tops,
 * stained undersides). Stands in for scattered light so a set piece stays readable in the
 * dark water beyond the headlight beams. `k` is the linear emissive of a white vertex.
 */
export function vertexGlow(m: THREE.MeshStandardMaterial, k: number, tint = 0xffffff): void {
  m.emissive.set(tint).multiplyScalar(k);
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif\n// Up-facing surfaces catch more of the faint downwelling light: gives the lift some form.\ntotalEmissiveRadiance *= 0.4 + 0.6 * (0.5 + 0.5 * dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));',
    );
  };
  m.customProgramCacheKey = () => 'vertexGlow2';
}
