/**
 * Wreck site: a fine sediment haze hugging the seabed within ~30 m of the
 * floor, faint rust-coloured motes around hull props, and a slightly heavier
 * vignette. Nothing glows or sparkles (art-direction §7: no loot VFX; these
 * are memorial sites).
 *
 * The haze box follows the camera; its floor is a plane fitted to the seabed
 * under the camera (maths.ts `fitSeabedPlane`), so particles hug the floor
 * without a per-particle terrain lookup. Draw calls: 2 (haze + motes).
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { fitSeabedPlane, mulberry, particleBudget } from './maths.js';
import {
  COMMON_VERT,
  SOFT_FRAG,
  commonUniforms,
  disposeObjects,
  makePoints,
  num,
  updateCommonUniforms,
  type ParticleLook,
} from './shared.js';
import type {
  EnvPreset,
  PresetEnterContext,
  PresetFrameContext,
  PresetParams,
  PresetProp,
} from './types.js';

/** Props whose surroundings get rust motes: hull sections and debris fields. */
export function hullProps(props: readonly PresetProp[], max: number): PresetProp[] {
  return props
    .filter((p) => p.model === 'procedural:hull-block' || p.model === 'procedural:debris')
    .sort((a, b) => b.radius - a.radius)
    .slice(0, Math.max(0, max));
}

export class WreckPreset implements EnvPreset {
  readonly name: EnvPresetName = 'wreck';
  readonly stats = { draws: 0, particles: 0, lights: 0 };

  private scene: THREE.Scene | null = null;
  private readonly objects: THREE.Points[] = [];
  private haze: THREE.ShaderMaterial | null = null;
  private motes: THREE.ShaderMaterial | null = null;
  private params: PresetParams = {};
  private visuals = false;

  constructor(private readonly look: ParticleLook) {}

  enter(ctx: PresetEnterContext): void {
    this.params = ctx.params;
    this.scene = ctx.scene;
    this.visuals = ctx.visuals;
    if (!ctx.visuals) return;
    this.buildHaze(ctx);
    this.buildMotes(ctx);
    this.stats.draws = this.objects.length;
  }

  private buildHaze(ctx: PresetEnterContext): void {
    const p = this.params;
    const n = particleBudget(num(p.hazeParticles, 9000), ctx.particleScale, ctx.maxParticles);
    if (n <= 0) return;
    const box = num(p.hazeBoxM, 220);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const rnd = mulberry(0x4a2e);
    for (let i = 0; i < n; i++) {
      // y is a 0..1 band fraction, squared so the haze is densest at the floor.
      pos.set([rnd() * box, rnd() ** 2, rnd() * box], i * 3);
      seed[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.haze = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uBox: { value: box },
        uBand: { value: num(p.hazeBandM, 30) },
        uPlane: { value: new THREE.Vector3() }, // seabed height, d/dx, d/dz at the camera
        uDrift: { value: num(p.hazeDriftMps, 0.06) },
        uSize: { value: num(p.hazeSizeM, 1.1) },
        uColor: { value: new THREE.Color(num(p.hazeColor, 0x8c8170)) },
        uOpacity: { value: num(p.hazeOpacity, 0.22) },
      },
      vertexShader: HAZE_VERT,
      fragmentShader: SOFT_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const pts = makePoints(geo, this.haze, 'wreckHaze');
    ctx.scene.add(pts);
    this.objects.push(pts);
    this.stats.particles += n;
  }

  private buildMotes(ctx: PresetEnterContext): void {
    const p = this.params;
    const hulls = hullProps(ctx.props, num(p.maxHulls, 6));
    if (!hulls.length) return;
    const per = Math.floor(
      particleBudget(num(p.motesPerHull, 700) * hulls.length, ctx.particleScale, ctx.maxParticles) /
        hulls.length,
    );
    if (per <= 0) return;
    const n = per * hulls.length;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const rnd = mulberry(0x2057);
    let k = 0;
    for (const h of hulls) {
      for (let i = 0; i < per; i++, k++) {
        // Uniform in a sphere 15% larger than the hull's bounds.
        const u = rnd() * 2 - 1;
        const a = rnd() * Math.PI * 2;
        const r = h.radius * 1.15 * Math.cbrt(rnd());
        const s = Math.sqrt(1 - u * u);
        pos.set(
          [
            h.centre.x + r * s * Math.cos(a),
            h.centre.y + r * u * 0.6,
            h.centre.z + r * s * Math.sin(a),
          ],
          k * 3,
        );
        seed[k] = rnd();
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.motes = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uSize: { value: num(p.moteSizeM, 0.35) },
        uColor: { value: new THREE.Color(num(p.moteColor, 0x8a4a2c)) },
        uOpacity: { value: num(p.moteOpacity, 0.5) },
      },
      vertexShader: MOTE_VERT,
      fragmentShader: SOFT_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const pts = makePoints(geo, this.motes, 'wreckMotes');
    ctx.scene.add(pts);
    this.objects.push(pts);
    this.stats.particles += n;
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    if (!this.visuals) return;
    ctx.atmo.vignette += num(this.params.vignetteAdd, 0.06);
    if (this.haze) {
      updateCommonUniforms(this.haze, ctx, this.look);
      const c = ctx.camera.position;
      const plane = fitSeabedPlane((x, z) => ctx.terrain.sampleHeight(x, z), c.x, c.z, 40);
      (this.haze.uniforms.uPlane!.value as THREE.Vector3).set(plane.h, plane.gx, plane.gz);
    }
    if (this.motes) updateCommonUniforms(this.motes, ctx, this.look);
  }

  exit(): void {
    if (this.scene) disposeObjects(this.scene, this.objects);
    this.haze = this.motes = null;
    this.stats.draws = this.stats.particles = 0;
  }
}

const HAZE_VERT = /* glsl */ `
${COMMON_VERT}
uniform float uBox;
uniform float uBand;
uniform vec3  uPlane;
uniform float uDrift;
uniform float uSize;
uniform vec3  uColor;
uniform float uOpacity;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec3 p = position;
  p.x += uDrift * uTime * (0.5 + aSeed) + sin(uTime * 0.05 + aSeed * 40.0) * 2.0;
  p.z += uDrift * uTime * 0.4 + cos(uTime * 0.04 + aSeed * 27.0) * 2.0;
  vec3 w = wrapBox(vec3(p.x, 0.0, p.z), vec3(uCam.x, 0.0, uCam.z), uBox);
  vec2 d = w.xz - uCam.xz;
  float floorY = uPlane.x + uPlane.y * d.x + uPlane.z * d.y;
  w.y = floorY + 0.5 + p.y * uBand + sin(uTime * 0.2 + aSeed * 9.0) * 0.5;
  float dist = placePoint(w, uSize * (0.6 + 0.8 * aSeed));
  float edge = 1.0 - smoothstep(0.35, 0.5, max(abs(d.x), abs(d.y)) / uBox);
  vColor = uColor * presetLight(w);
  vAlpha = uOpacity * edge * (1.0 - 0.6 * p.y);
  vFog = presetFog(dist);
}
`;

const MOTE_VERT = /* glsl */ `
${COMMON_VERT}
uniform float uSize;
uniform vec3  uColor;
uniform float uOpacity;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec3 w = position;
  w.x += sin(uTime * 0.07 + aSeed * 60.0) * 1.5;
  w.y += sin(uTime * 0.05 + aSeed * 13.0) * 1.0 - 0.3;
  w.z += cos(uTime * 0.06 + aSeed * 41.0) * 1.5;
  float dist = placePoint(w, uSize * (0.5 + aSeed));
  vColor = uColor * presetLight(w);
  vAlpha = uOpacity * (1.0 - smoothstep(90.0, 160.0, dist));
  vFog = presetFog(dist);
}
`;
