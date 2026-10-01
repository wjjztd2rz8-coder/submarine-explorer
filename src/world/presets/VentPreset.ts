/**
 * Vent field: smoke rising from each chimney, a shimmer over the orifices,
 * one to three warm glow lights at the tallest chimneys, and a slight upward
 * current above them.
 *
 * Sources are placed props with `model: procedural:chimney` (tallest first);
 * with none, POIs of kind `vent`. `fluid: carbonate` (Lost City) swaps the
 * dark sulfide smoke for a pale, faint, cooler plume.
 *
 * Draw calls: 2 (smoke points + shimmer points). The shimmer is a cheap
 * stand-in for refraction: point sprites blended as `dst * src` with src
 * wobbling around 1.0, so the background luminance ripples over the vent top
 * without sampling the frame (see docs/presets.md).
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { clamp01, mulberry, particleBudget } from './maths.js';
import {
  COMMON_VERT,
  GlowLights,
  commonUniforms,
  disposeObjects,
  makePoints,
  num,
  str,
  updateCommonUniforms,
  type ParticleLook,
} from './shared.js';
import type { EnvPreset, PresetEnterContext, PresetFrameContext, PresetParams } from './types.js';

export interface VentSource {
  /** Orifice (top centre) in world space. */
  top: THREE.Vector3;
  /** Chimney height (m); POI sources get 0. Used to rank "most active". */
  height: number;
}

/** Chimney props first (tallest first), else vent POIs; at most `max`. */
export function ventSources(
  ctx: Pick<PresetEnterContext, 'props' | 'pois'>,
  max: number,
): VentSource[] {
  const chimneys = ctx.props
    .filter((p) => p.model === 'procedural:chimney')
    .map((p) => ({ top: p.top.clone(), height: p.height }));
  const list = chimneys.length
    ? chimneys
    : ctx.pois
        .filter((p) => p.kind === 'vent')
        .map((p) => ({ top: p.position.clone(), height: 0 }));
  return list.sort((a, b) => b.height - a.height).slice(0, Math.max(0, max));
}

export class VentPreset implements EnvPreset {
  readonly name: EnvPresetName = 'vent';
  readonly stats = { draws: 0, particles: 0, lights: 0 };

  private scene: THREE.Scene | null = null;
  private readonly objects: THREE.Points[] = [];
  private smoke: THREE.ShaderMaterial | null = null;
  private smokeLifeS = 60;
  private smokeRiseH = 70;
  private shimmer: THREE.ShaderMaterial | null = null;
  private glow: GlowLights | null = null;
  private sources: VentSource[] = [];
  private params: PresetParams = {};

  constructor(private readonly look: ParticleLook) {}

  enter(ctx: PresetEnterContext): void {
    const p = (this.params = ctx.params);
    this.scene = ctx.scene;
    this.sources = ventSources(ctx, num(p.maxSources, 12));
    if (!this.sources.length) {
      console.info(
        '[presets] vent: no procedural:chimney props or vent POIs here; nothing to emit from',
      );
      return;
    }
    if (!ctx.visuals) return;

    const carbonate = str(p.fluid, 'sulfide') === 'carbonate';
    const intensity = clamp01(num(p.smokeIntensity, 1));
    const total = particleBudget(
      num(p.smokeParticles, 12000) * intensity,
      ctx.particleScale,
      ctx.maxParticles,
    );
    const per = Math.floor(total / this.sources.length);
    if (per > 0) this.buildSmoke(per, carbonate, intensity);
    this.buildShimmer();

    const glowCount = Math.min(
      3,
      Math.max(0, Math.round(num(p.glowLights, 2))),
      this.sources.length,
    );
    if (glowCount > 0) {
      const scale = carbonate ? num(p.glowCarbonateScale, 0.35) : 1;
      this.glow = new GlowLights(
        ctx.scene,
        this.sources.slice(0, glowCount).map((s) => s.top.clone().add(new THREE.Vector3(0, 2, 0))),
        num(p.glowColor, 0xff9a4a),
        num(p.glowIntensity, 260) * scale,
        num(p.glowDistanceM, 60),
      );
      this.stats.lights = glowCount;
    }
    this.stats.draws = this.objects.length;
  }

  private buildSmoke(per: number, carbonate: boolean, intensity: number): void {
    const p = this.params;
    const n = per * this.sources.length;
    const origin = new Float32Array(n * 3);
    const seed = new Float32Array(n * 4);
    const rnd = mulberry(0x5e17);
    let k = 0;
    for (const s of this.sources) {
      for (let i = 0; i < per; i++, k++) {
        origin.set([s.top.x, s.top.y, s.top.z], k * 3);
        seed.set([rnd(), rnd() * Math.PI * 2, Math.sqrt(rnd()), rnd()], k * 4);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(origin, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));

    const riseH = num(p.riseHeightM, 70);
    const riseMps = Math.max(0.05, num(p.riseMps, 1.2));
    // h(t) = H (1 - (1-t)^1.8) leaves the orifice at 1.8 H / life m/s.
    const life = (1.8 * riseH) / riseMps;
    this.smokeLifeS = life;
    this.smokeRiseH = riseH;
    const opacity =
      (carbonate ? num(p.smokeOpacityCarbonate, 0.16) : num(p.smokeOpacitySulfide, 0.55)) *
      (0.5 + 0.5 * intensity);
    this.smoke = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uLife: { value: life },
        uRiseH: { value: riseH },
        uSpread: { value: num(p.spreadM, 14) },
        uSize0: { value: num(p.sizeStartM, 1.6) },
        uSize1: { value: num(p.sizeEndM, 7) },
        uColor: {
          value: new THREE.Color(
            carbonate ? num(p.smokeColorCarbonate, 0xd6ddd8) : num(p.smokeColorSulfide, 0x2b2a28),
          ),
        },
        uGlow: {
          value: new THREE.Color(num(p.glowColor, 0xff9a4a)).multiplyScalar(carbonate ? 0.15 : 0.6),
        },
        uOpacity: { value: opacity },
        uDrift: { value: new THREE.Vector2() },
      },
      vertexShader: SMOKE_VERT,
      fragmentShader: PUFF_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const pts = makePoints(geo, this.smoke, 'ventSmoke');
    this.scene!.add(pts);
    this.objects.push(pts);
    this.stats.particles += n;
  }

  private buildShimmer(): void {
    const p = this.params;
    const strength = num(p.shimmerStrength, 0.08);
    if (strength <= 0) return;
    // Three stacked sprites per orifice give the heat haze a vertical column.
    const pos: number[] = [];
    const seed: number[] = [];
    const size = num(p.shimmerSizeM, 9);
    this.sources.forEach((s, i) => {
      for (let j = 0; j < 3; j++) {
        pos.push(s.top.x, s.top.y + size * (0.35 + 0.55 * j), s.top.z);
        seed.push(i * 3.17 + j * 1.3);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.shimmer = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uSize: { value: size },
        uStrength: { value: strength },
      },
      vertexShader: SHIMMER_VERT,
      fragmentShader: SHIMMER_FRAG,
      transparent: true,
      depthWrite: false,
      // result = src * dst: src ~ 1 +/- strength ripples the background.
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.DstColorFactor,
      blendDst: THREE.ZeroFactor,
    });
    const pts = makePoints(geo, this.shimmer, 'ventShimmer');
    pts.renderOrder = 3;
    this.scene!.add(pts);
    this.objects.push(pts);
    this.stats.particles += pos.length / 3;
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    if (this.smoke) {
      updateCommonUniforms(this.smoke, ctx, this.look);
      // Bend the column downstream: half the drift a particle would make over its life,
      // capped so a strong current cannot fling the smoke off the site.
      const drift = this.smoke.uniforms.uDrift!.value as THREE.Vector2;
      drift.set(ctx.current.x, ctx.current.z).multiplyScalar(this.smokeLifeS * 0.5);
      const cap = this.smokeRiseH * 0.6;
      if (drift.length() > cap) drift.setLength(cap);
    }
    if (this.shimmer) updateCommonUniforms(this.shimmer, ctx, this.look);
    this.glow?.update(ctx.elapsed);

    // Upwelling: a gentle column above each orifice (strongest at the centre
    // and just above the top). The strongest one wins; they do not stack.
    const p = this.params;
    const w0 = num(p.upwellMps, 0.35);
    const R = num(p.upwellRadiusM, 18);
    const H = num(p.upwellHeightM, 120);
    let up = 0;
    for (const s of this.sources) {
      const dy = ctx.subPosition.y - s.top.y;
      if (dy < 0 || dy > H) continue;
      const d2 = (ctx.subPosition.x - s.top.x) ** 2 + (ctx.subPosition.z - s.top.z) ** 2;
      if (d2 > R * R) continue;
      up = Math.max(up, w0 * (1 - d2 / (R * R)) * (1 - dy / H));
    }
    ctx.current.y += up;
  }

  debug(): string {
    return `sources=${this.sources.length}`;
  }

  exit(): void {
    if (this.scene) disposeObjects(this.scene, this.objects);
    this.glow?.dispose();
    this.glow = null;
    this.smoke = null;
    this.shimmer = null;
    this.stats.draws = this.stats.particles = this.stats.lights = 0;
  }
}

const SMOKE_VERT = /* glsl */ `
${COMMON_VERT}
uniform float uLife;
uniform float uRiseH;
uniform float uSpread;
uniform float uSize0;
uniform float uSize1;
uniform vec3  uColor;
uniform vec3  uGlow;
uniform float uOpacity;
uniform vec2  uDrift;
attribute vec4 aSeed; // phase, angle, radial, jitter
varying vec3 vColor;
varying float vAlpha;
varying float vFog;

varying float vSeed;
varying float vRot;

void main() {
  float t = fract(uTime / uLife + aSeed.x);
  // Buoyant plume: fast out of the orifice, slowing and spreading as it rises.
  float h = uRiseH * (1.0 - pow(1.0 - t, 1.8));
  // A narrow stem that billows outward: radius grows faster than linearly.
  float r = uSpread * (0.06 + 0.94 * pow(t, 1.35)) * aSeed.z;
  float a = aSeed.y + sin(uTime * 0.35 + aSeed.w * 12.0) * 0.6 * t;
  vec3 w = position + vec3(cos(a) * r, h, sin(a) * r);
  // The whole column meanders (phase per chimney) and bends downstream with the current.
  float ph = position.x * 0.13 + position.z * 0.17;
  w.x += sin(h * 0.09 + uTime * 0.21 + ph) * 0.11 * uSpread * t;
  w.z += cos(h * 0.07 + uTime * 0.17 + ph * 1.7) * 0.11 * uSpread * t;
  w.xz += uDrift * t * t;
  // Turbulent wobble grows with height.
  w.x += sin(uTime * 0.9 + aSeed.w * 40.0 + h * 0.2) * 0.8 * t;
  w.z += cos(uTime * 0.7 + aSeed.w * 23.0 + h * 0.15) * 0.8 * t;

  // Puffs bloom quickly near the source, then keep swelling slowly.
  float size = mix(uSize0, uSize1, sqrt(t)) * (0.7 + 0.6 * aSeed.w);
  float dist = placePoint(w, size);
  // Lit by the headlights, plus the warm orifice glow for the first few metres.
  vColor = uColor * presetLight(w) + uGlow * exp(-h / 5.0);
  vAlpha = uOpacity * smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.5, 1.0, t));
  vFog = presetFog(dist);
  vSeed = aSeed.w + aSeed.y;
  vRot = aSeed.y + uTime * 0.12 * (aSeed.z - 0.6);
}
`;

/**
 * A billowing smoke puff: each sprite is a rotated, domain-warped noise blob
 * with an eroded edge, so overlapping puffs read as turbulent smoke rather
 * than stacked soft discs.
 */
const PUFF_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 fogColor;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
varying float vSeed;
varying float vRot;
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 d = (gl_PointCoord - 0.5) * 2.0;
  float c = cos(vRot);
  float s = sin(vRot);
  d = mat2(c, -s, s, c) * d;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  vec2 q = d * 2.0 + vSeed * 31.0 + vec2(0.0, uTime * 0.05);
  float n = vnoise(q) * 0.6 + vnoise(q * 2.3 + vnoise(q) * 1.6) * 0.4;
  float body = 1.0 - r2 * (0.5 + 1.0 * n);
  float a = smoothstep(0.0, 0.55, body - 0.3 * (1.0 - n));
  if (a <= 0.003) discard;
  // Denser, darker cores; ragged, lighter rims.
  vec3 col = mix(vColor, fogColor, vFog) * (0.45 + 0.95 * n);
  gl_FragColor = vec4(col, vAlpha * a * (1.0 - 0.6 * vFog));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SHIMMER_VERT = /* glsl */ `
${COMMON_VERT}
uniform float uSize;
attribute float aSeed;
varying float vSeed;
varying float vFade;
void main() {
  float dist = placePoint(position, uSize);
  vSeed = aSeed;
  // Only close up: shimmer is invisible (and pointless) at fog range.
  vFade = (1.0 - presetFog(dist)) * (1.0 - smoothstep(120.0, 260.0, dist));
}
`;

const SHIMMER_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uStrength;
varying float vSeed;
varying float vFade;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float t = uTime + vSeed;
  float w = sin(uv.y * 38.0 + t * 5.0 + sin(uv.x * 21.0 + t * 2.7) * 2.0) *
            sin(uv.x * 29.0 - t * 3.9 + uv.y * 7.0);
  float env = (1.0 - r * r) * vFade;
  gl_FragColor = vec4(vec3(1.0 + uStrength * w * env), 1.0);
}
`;
