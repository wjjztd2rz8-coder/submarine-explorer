/**
 * Rendering helpers shared by the presets: the GLSL for "lit by the sub's
 * headlights, fogged like the scene" particles, point-size attenuation, and a
 * warm-glow point-light helper. Every preset particle system is one
 * `THREE.Points` draw with all animation in the vertex shader, so the CPU
 * never touches per-particle data after `enter()`.
 */

import * as THREE from 'three';
import type { PresetFrameContext } from './types.js';

/** Lighting and fog knobs common to every particle material. */
export interface ParticleLook {
  ambient: number;
  headlightGain: number;
  headlightFalloffM: number;
}

/**
 * Uniform names every particle shader gets. `fogDensity`/`fogColor` use the
 * scene's FogExp2 formula so particles fade exactly like the terrain.
 */
export function commonUniforms(look: ParticleLook): Record<string, THREE.IUniform> {
  return {
    uTime: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uSubPos: { value: new THREE.Vector3() },
    uAmbient: { value: look.ambient },
    uHeadGain: { value: look.headlightGain },
    uHeadFall: { value: look.headlightFalloffM },
    uScale: { value: 500 },
    fogDensity: { value: 0 },
    fogColor: { value: new THREE.Color() },
  };
}

/** Per-frame refresh of {@link commonUniforms}. */
export function updateCommonUniforms(
  material: THREE.ShaderMaterial,
  ctx: PresetFrameContext,
  look: ParticleLook,
): void {
  const u = material.uniforms;
  u.uTime!.value = ctx.elapsed;
  (u.uCam!.value as THREE.Vector3).copy(ctx.camera.position);
  (u.uSubPos!.value as THREE.Vector3).copy(ctx.subPosition);
  // The ambient floor tracks the band a little so shallow particles are not
  // darker than the water around them.
  u.uAmbient!.value = look.ambient + 0.5 * ctx.atmo.ambientIntensity;
  u.uHeadGain!.value = ctx.headlightsOn ? look.headlightGain : 0;
  u.uScale!.value = ctx.viewportH / (2 * Math.tan((ctx.camera.fov * Math.PI) / 360));
  u.fogDensity!.value = ctx.atmo.fogDensity;
  (u.fogColor!.value as THREE.Color).copy(ctx.atmo.fogColor);
}

/** GLSL prelude for vertex shaders using {@link commonUniforms}. */
export const COMMON_VERT = /* glsl */ `
uniform float uTime;
uniform vec3  uCam;
uniform vec3  uSubPos;
uniform float uAmbient;
uniform float uHeadGain;
uniform float uHeadFall;
uniform float uScale;
uniform float fogDensity;

// Headlights approximated as an omni falloff around the boat: particles only
// need "brighter near the sub", not the exact cone.
float presetLight(vec3 w) {
  return uAmbient + uHeadGain * exp(-distance(w, uSubPos) / uHeadFall);
}
float presetFog(float dist) {
  return clamp(1.0 - exp(-fogDensity * fogDensity * dist * dist), 0.0, 1.0);
}
// Twin of maths.ts wrapToBox(): wrap into a box of edge 'box' centred on c.
vec3 wrapBox(vec3 p, vec3 c, float box) {
  return c + mod(p - c + 0.5 * box, box) - 0.5 * box;
}
// Project a world point as a point sprite of 'sizeM' metres; returns view distance.
float placePoint(vec3 world, float sizeM) {
  vec4 mv = viewMatrix * vec4(world, 1.0);
  float dist = -mv.z;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(sizeM * uScale / max(1.0, dist), 1.0, 256.0);
  return dist;
}
void hidePoint() { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; }
`;

/** Soft round sprite, fogged; `vColor`/`vAlpha`/`vFog` come from the vertex shader. */
export const SOFT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 fogColor;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  float soft = exp(-r * 3.0) * (1.0 - r);
  gl_FragColor = vec4(mix(vColor, fogColor, vFog), vAlpha * soft * (1.0 - 0.6 * vFog));
}
`;

/** A `THREE.Points` that is never frustum-culled (the shader moves every point). */
export function makePoints(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
): THREE.Points {
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  points.name = name;
  return points;
}

/**
 * Warm "thermal glow" lights (art-direction §6: below ~200 m light comes from
 * the sub or an active vent). Decay 2 keeps them local; no bloom anywhere.
 */
export class GlowLights {
  readonly lights: THREE.PointLight[] = [];
  private readonly base: number[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    positions: readonly THREE.Vector3[],
    color: number,
    intensity: number,
    distance: number,
  ) {
    positions.forEach((p, i) => {
      const light = new THREE.PointLight(color, intensity, distance, 2);
      light.position.copy(p);
      light.name = `presetGlow${i}`;
      this.lights.push(light);
      this.base.push(intensity);
      scene.add(light);
    });
  }

  /** A slow, small flicker: fluid output varies, it does not strobe. */
  update(elapsed: number): void {
    this.lights.forEach((l, i) => {
      l.intensity =
        this.base[i]! *
        (1 + 0.07 * Math.sin(elapsed * 1.3 + i * 2.1) + 0.04 * Math.sin(elapsed * 3.7 + i));
    });
  }

  dispose(): void {
    for (const l of this.lights) {
      this.scene.remove(l);
      l.dispose();
    }
    this.lights.length = 0;
  }
}

/** Remove and dispose a list of scene objects. */
export function disposeObjects(
  scene: THREE.Scene,
  objects: Array<THREE.Mesh | THREE.Points>,
): void {
  for (const o of objects) {
    scene.remove(o);
    o.geometry.dispose();
    (o.material as THREE.Material).dispose();
  }
  objects.length = 0;
}

export function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
export function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
