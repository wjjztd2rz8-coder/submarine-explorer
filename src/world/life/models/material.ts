/**
 * The animal material: a `MeshStandardMaterial` (so it takes the scene's
 * fog, hemisphere fill and the sub's spotlights like every other prop) with
 * a vertex-shader animation injected. Per-instance `iLife` is (phase in
 * radians, unused, glow 0..1); per-vertex `aAnim` is (primary weight,
 * secondary weight, glow weight). The CPU accumulates the phase from the
 * animal's speed, so the beat quickens when it swims harder and never jumps.
 *
 * Modes (compile-time `LIFE_MODE`):
 *   1 wave   body wave along -Z (fish, sharks, eels, shrimp) or vertical for
 *            whales and seals; `aAnim.y` flaps pectoral fins
 *   2 jelly  bell squeeze and a trailing tentacle wave
 *   3 sway   bend growing with height (tube worms, crinoids, corals)
 *   4 crawl  legs and arms lift in turn (`aAnim.y` is the leg's phase offset)
 *   5 ceph   web pulse, arm wave, ear flap
 *   6 chain  travelling wave along a siphonophore colony
 *   7 comb   ctenophore: small pulse plus a travelling comb-row shimmer
 *   0 still  no motion
 */

import * as THREE from 'three';
import type { AnimMode } from '../types.js';

const MODE: Record<AnimMode, number> = {
  still: 0,
  wave: 1,
  jelly: 2,
  sway: 3,
  crawl: 4,
  ceph: 5,
  chain: 6,
  comb: 7,
};

export interface LifeMaterialOpts {
  mode: AnimMode;
  /** Bend amplitude as a fraction of `len`. */
  amp: number;
  /** Model length (m) the amplitude scales with. */
  len: number;
  /** Wave number along the body (rad per metre of `len`). */
  wave: number;
  vertical?: boolean;
  glowColor: number;
  /** Always-on photophore glow, 0..1. */
  baseGlow: number;
  /** Emission takes the vertex colour (comb rows) rather than one flat colour. */
  tintGlow?: boolean;
  /** Translucent tissue (jellies, larvaceans, shrimp): fresnel alpha with this floor. */
  translucent?: number;
  roughness?: number;
  metalness?: number;
}

const VERT_HEAD = /* glsl */ `
attribute vec3 aAnim;
attribute vec3 iLife;
uniform float uAmp;
uniform float uLen;
uniform float uWave;
uniform float uAxis;
uniform float uBaseGlow;
varying float vGlow;
`;

const VERT_BODY = /* glsl */ `
vec3 transformed = vec3( position );
float ph = iLife.x;
float aw = aAnim.x;
float ay = aAnim.y;
vGlow = aAnim.z * ( uBaseGlow + iLife.z );
#if LIFE_MODE == 1
  float wv = sin( ph - transformed.z * uWave / uLen ) * uAmp * uLen * aw * aw;
  if ( uAxis < 0.5 ) transformed.x += wv; else transformed.y += wv;
  transformed.y += ay * abs( position.x ) * 0.55 * sin( ph * 0.7 + 0.6 );
  transformed.z -= ay * abs( position.x ) * 0.12 * sin( ph * 0.7 );
#elif LIFE_MODE == 2
  float pulse = sin( ph );
  float sq = 1.0 - 0.17 * aw * ( 0.5 + 0.5 * pulse );
  transformed.xz *= sq;
  transformed.y += aw * 0.04 * uLen * pulse;
  float k = 3.5 / uLen;
  transformed.x += ay * sin( ph * 0.55 + transformed.y * k ) * uAmp * uLen;
  transformed.z += ay * cos( ph * 0.47 + transformed.y * k * 0.8 ) * uAmp * uLen;
  transformed.xz *= 1.0 - ay * 0.16 * ( 0.5 + 0.5 * pulse );
#elif LIFE_MODE == 3
  float hh = aw * aw;
  transformed.x += sin( ph + transformed.y * 2.2 / uLen ) * uAmp * uLen * hh;
  transformed.z += cos( ph * 0.83 + transformed.y * 1.7 / uLen ) * uAmp * uLen * hh * 0.8;
  transformed.x += ay * sin( ph * 1.7 + position.x * 40.0 + position.z * 31.0 ) * uAmp * uLen * 0.25;
#elif LIFE_MODE == 4
  float stp = sin( ph * 2.0 + ay * 6.2831 );
  transformed.y += max( stp, 0.0 ) * aw * uAmp * uLen;
  transformed.z += stp * aw * uAmp * uLen * 0.6;
  transformed.y += 0.004 * uLen * sin( ph * 0.9 ) * ( 1.0 - aw );
#elif LIFE_MODE == 5
  float pl = sin( ph );
  transformed.xz *= 1.0 - 0.09 * aw * ( 0.5 + 0.5 * pl );
  transformed.y -= aw * 0.03 * uLen * pl;
  transformed.x += aw * sin( ph * 0.7 + transformed.y * 5.0 / uLen ) * uAmp * uLen * 0.6;
  transformed.z += aw * cos( ph * 0.6 + position.x * 5.0 / uLen ) * uAmp * uLen * 0.6;
  transformed.y += ay * abs( position.x ) * 0.65 * sin( ph * 1.3 );
  transformed.z -= ay * abs( position.x ) * 0.15 * sin( ph * 1.3 + 1.0 );
#elif LIFE_MODE == 6
  float u = aw;
  transformed.x += sin( ph * 0.7 + u * 7.0 ) * uAmp * uLen * u;
  transformed.z += cos( ph * 0.6 + u * 5.0 ) * uAmp * uLen * u * 0.8;
  transformed.xz += ay * vec2( sin( ph * 1.9 + u * 11.0 ), cos( ph * 1.7 + u * 9.0 ) ) * 0.012 * uLen;
#elif LIFE_MODE == 7
  float cp = sin( ph * 0.8 );
  transformed.xz *= 1.0 - 0.04 * ( 0.5 + 0.5 * cp );
  transformed.y *= 1.0 + 0.03 * cp;
  transformed.x += ay * sin( ph * 0.5 + transformed.y * 6.0 / uLen ) * uAmp * uLen;
  vGlow = aAnim.z * ( uBaseGlow * ( 0.55 + 0.45 * sin( transformed.y * 34.0 / uLen - ph * 3.0 ) ) + iLife.z );
#endif
`;

/** Build a lit, fogged, instanced-animation material for one species. */
export function createLifeMaterial(o: LifeMaterialOpts): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: o.roughness ?? 0.55,
    metalness: o.metalness ?? 0.05,
    side: THREE.DoubleSide,
    transparent: o.translucent !== undefined,
    depthWrite: o.translucent === undefined,
    flatShading: false,
  });
  const uniforms = {
    uAmp: { value: o.amp },
    uLen: { value: o.len },
    uWave: { value: o.wave },
    uAxis: { value: o.vertical ? 1 : 0 },
    uBaseGlow: { value: o.baseGlow },
    uGlowColor: { value: new THREE.Color(o.glowColor) },
    uTint: { value: o.tintGlow ? 1 : 0 },
    uAlphaBase: { value: o.translucent ?? 1 },
  };
  mat.userData.life = uniforms;
  mat.defines = { LIFE_MODE: MODE[o.mode] };
  mat.customProgramCacheKey = (): string =>
    `life-${o.mode}-${o.translucent !== undefined ? 't' : 'o'}`;
  mat.onBeforeCompile = (shader): void => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_HEAD}`)
      .replace('#include <begin_vertex>', VERT_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vGlow;\nuniform vec3 uGlowColor;\nuniform float uTint;\nuniform float uAlphaBase;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlowColor * mix( vec3( 1.0 ), vColor.rgb * 1.8, uTint ) * vGlow;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        gl_FragColor.a *= uAlphaBase + ( 1.0 - uAlphaBase ) * pow( 1.0 - abs( dot( normalize( vViewPosition ), normal ) ), 2.0 );
        gl_FragColor.a = clamp( gl_FragColor.a + vGlow * 0.35, 0.0, 1.0 );`,
      );
  };
  return mat;
}
