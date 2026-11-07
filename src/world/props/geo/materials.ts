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

interface GeoMaterialOpts {
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
      // Phase-warped along the wall so the bedding relief never runs as evenly spaced contours.
      float bed = (cp.y + cp.x * 0.07 + cp.z * 0.03) * 4.2 + 3.0 * sin(cp.x * 0.13 + 0.9 * sin(cp.z * 0.21 + cp.y * 0.17)) + 2.0 * sin(cp.y * 0.31 + cp.x * 0.07);
      // Bedding relief swells and fades along the wall so the corrugation never repeats evenly.
      float swell = 0.5 + 0.5 * sin(cp.x * 0.09 + 1.7 * sin(cp.y * 0.05)) * sin(cp.y * 0.11 + cp.x * 0.04 + 2.0);
      grad += vec3(0.07, 1.0, 0.03) * cos(bed) * (0.25 + 0.75 * swell) * (1.0 - smoothstep(0.8, 2.5, fwidth(bed)));
      grad = mat3(viewMatrix) * grad;
      grad -= normal * dot(normal, grad);
      normal = normalize(normal - grad * ${strength.toFixed(3)} * (1.0 - smoothstep(20.0, 80.0, length(vViewPosition))));`,
      );
  };
  m.customProgramCacheKey = () => `${cacheKey}-canyon-detail-${strength}`;
}

/**
 * Limestone weathering for karst walls and sediment ledges: solution pits at two scales, dark
 * stain streaks running down the face and a paler silt film on shallow slopes. Wall-projected
 * value noise on world position (no UVs, no texture fetches), so it layers over any vertex-painted
 * material. `pits` and `streaks` are albedo strengths; `bumps` > 0 also perturbs the normal
 * (detail tiers only; pass 0 on Low, which keeps just the albedo).
 */
export function limestoneWeathering(
  m: THREE.MeshStandardMaterial,
  o: { pits: number; streaks: number; bumps: number },
): void {
  const compile = m.onBeforeCompile;
  const cacheKey = m.customProgramCacheKey();
  m.onBeforeCompile = (shader, renderer) => {
    compile.call(m, shader, renderer);
    shader.vertexShader =
      'varying vec3 vKarstPos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvKarstPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader =
      /* glsl */ `varying vec3 vKarstPos;
float karstHash(vec2 i) { return fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453); }
float karstNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(karstHash(i), karstHash(i + vec2(1.0, 0.0)), u.x), mix(karstHash(i + vec2(0.0, 1.0)), karstHash(i + 1.0), u.x), u.y);
}
// Round pits, one per lattice cell at a random point: x = depth 0..1, yz = slope.
vec3 karstPits(vec2 p) {
  // Warp and stretch along the fall line so pockets read as dissolved runnels, not round dimples.
  p += 1.1 * vec2(karstNoise(p * 0.6 + 2.0), karstNoise(p * 0.6 + 11.0)) - 0.55;
  p.y *= 0.55;
  vec2 i = floor(p);
  vec3 acc = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 c = i + vec2(float(x), float(y));
      if (karstHash(c + 71.7) < 0.6) continue;
      vec2 d = p - (c + 0.2 + 0.6 * vec2(karstHash(c), karstHash(c + 17.31)));
      float r = 0.3 + 0.45 * karstHash(c + 5.5);
      float q = 1.0 - dot(d, d) / (r * r);
      if (q <= 0.0) continue;
      acc.x += q * q;
      acc.yz += (-4.0 * q / (r * r)) * d;
    }
  }
  return acc;
}
` +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
{
  vec3 kp = vKarstPos;
  vec3 wn = inverseTransformDirection(normal, viewMatrix);
  vec2 pw = vec2(abs(wn.z), abs(wn.x));
  pw /= max(pw.x + pw.y, 1e-3);
  float kd = length(vViewPosition);
  float fine = 1.0 - smoothstep(35.0, 110.0, kd);
  float far = 1.0 - smoothstep(110.0, 300.0, kd);
  // Pits: ~1 m solution pockets near, ~3.5 m and ~9 m hollows carrying the face at range.
  vec3 a1 = karstPits(kp.xy * 0.95) * fine, b1 = karstPits(kp.zy * 0.95 + 9.0) * fine;
  vec3 a2 = karstPits(kp.xy * 0.29 + 40.0), b2 = karstPits(kp.zy * 0.29 + 70.0);
  vec3 a3 = karstPits(kp.xy * 0.11 + 90.0), b3 = karstPits(kp.zy * 0.11 + 120.0);
  float steep = smoothstep(0.15, 0.5, 1.0 - abs(wn.y));
  float pit = (0.6 * (a1.x * pw.x + b1.x * pw.y) + (a2.x * pw.x + b2.x * pw.y) + 1.2 * (a3.x * pw.x + b3.x * pw.y)) * steep;
  // Streaks: long vertical stains, stretched in height, with a fine broken second layer.
  float s1 = karstNoise(vec2(kp.x * 0.8, kp.y * 0.07) + 3.7) * pw.x + karstNoise(vec2(kp.z * 0.8, kp.y * 0.07) + 8.1) * pw.y;
  float s2 = karstNoise(vec2((kp.x + kp.z) * 2.4, kp.y * 0.3) + 1.3);
  float streak = smoothstep(0.42, 0.68, s1 * 0.7 + s2 * 0.3) * steep * far;
  // Silt film on shallow slopes, in broad patches.
  float silt = smoothstep(0.45, 0.2, 1.0 - abs(wn.y)) * smoothstep(0.4, 0.75, karstNoise(kp.xz * 0.21 + 5.0));
  diffuseColor.rgb *= 1.0 - ${o.pits.toFixed(3)} * smoothstep(0.05, 0.9, pit) * far - ${o.streaks.toFixed(3)} * streak;
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.8, 0.85, 0.95), 0.6 * streak);
  diffuseColor.rgb *= mix(vec3(1.0), vec3(1.14, 1.1, 1.0), 0.5 * silt);
  if (${o.bumps.toFixed(3)} > 0.0) {
    vec3 g = vec3((a1.y + 0.3 * a2.y) * pw.x, (a1.z + 0.3 * a2.z) * pw.x + (b1.z + 0.3 * b2.z) * pw.y, (b1.y + 0.3 * b2.y) * pw.y);
    g = mat3(viewMatrix) * g;
    g -= normal * dot(normal, g);
    normal = normalize(normal - g * ${o.bumps.toFixed(3)} * steep * far);
  }
}
`,
      );
  };
  m.customProgramCacheKey = () => `${cacheKey}-karst-${o.pits}-${o.streaks}-${o.bumps}`;
}
