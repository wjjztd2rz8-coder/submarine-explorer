/** Materials for the geo set pieces: vertex colours times a neutral detail map. */

import * as THREE from 'three';
import type { PropsConfig } from '../../../core/Config.js';
import type { GeoDetail } from './detail.js';
import { fbm3, smooth } from './shared.js';
import { detailTexture, type GeoTexKind } from './textures.js';

/** Overall albedo multiplier for geo rock (vertex colours are authored in natural colours). */
export const ALBEDO = 0.07;

/** Tint for instanced life (colonies, worms, sponges, mats): brighter than rock, but not clipping. */
export const LIFE_TINT = 0x666666;

/** Mineral islands at two scales: broad encrustation and finer broken edges on existing vertices. */
export function mineralCrust(
  geometry: THREE.BufferGeometry,
  seed: number,
  crust: PropsConfig['chimneyCrust'],
): void {
  const pos = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const colors = geometry.getAttribute('color');
  const tint = new THREE.Color(crust.color);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / crust.scaleM;
    const y = pos.getY(i) / crust.scaleM;
    const z = pos.getZ(i) / crust.scaleM;
    const broad = fbm3(x, y, z, seed ^ 0x6c41, 3);
    const grain = fbm3(x * 3, y * 3, z * 3, seed ^ 0x8f13, 2);
    // Shelves catch more precipitate; recessed sulfide and the rusty underlying palette still show.
    const patch = smooth(0.42, 0.68, broad * 0.7 + grain * 0.3);
    const shelf = 0.7 + 0.3 * Math.max(0, normal.getY(i));
    c.fromBufferAttribute(colors, i).lerp(tint, crust.amount * patch * shelf);
    colors.setXYZ(i, c.r, c.g, c.b);
  }
  colors.needsUpdate = true;
}

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
 * dark water beyond the headlight beams. `k` is the linear emissive of a white vertex;
 * `floor` (0..1) is how much of it dark vertices keep.
 */
export function vertexGlow(
  m: THREE.MeshStandardMaterial,
  k: number,
  tint = 0xffffff,
  floor = 0,
): void {
  m.emissive.set(tint).multiplyScalar(k);
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= mix(vColor.rgb, vec3(1.0), ${floor.toFixed(3)});\n#endif\n// Up-facing surfaces catch more of the faint downwelling light: gives the lift some form.\ntotalEmissiveRadiance *= 0.4 + 0.6 * (0.5 + 0.5 * dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz)));`,
    );
  };
  m.customProgramCacheKey = () => `vertexGlow2-${floor}`;
}

/** Monterey only: layer filtered erosion normals over the smooth reconstructed wall. */
export function canyonRockDetail(m: THREE.MeshStandardMaterial, strength: number): void {
  const compile = m.onBeforeCompile;
  const cacheKey = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    compile.call(m, shader, renderer);
    shader.vertexShader =
      'varying vec3 vCanyonPosition;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvCanyonPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader =
      'varying vec3 vCanyonPosition;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
      vec3 cp = vCanyonPosition;
      vec3 phase = cp * vec3(7.0, 11.0, 6.0);
      vec3 filtered = vec3(1.0) - smoothstep(vec3(0.8), vec3(2.5), fwidth(phase));
      vec3 grad = cos(phase) * filtered * vec3(0.35, 0.5, 0.35);
      float bed = (cp.y + cp.x * 0.07 + cp.z * 0.03) * 4.2;
      grad += vec3(0.07, 1.0, 0.03) * cos(bed) * (1.0 - smoothstep(0.8, 2.5, fwidth(bed)));
      grad = mat3(viewMatrix) * grad;
      grad -= normal * dot(normal, grad);
      normal = normalize(normal - grad * ${strength.toFixed(3)} * (1.0 - smoothstep(45.0, 160.0, length(vViewPosition))));`,
      );
  };
  m.customProgramCacheKey = () => `${cacheKey}-canyon-detail-${strength}`;
}
