/**
 * Vent field: smoke rising from each chimney, a shimmer over the orifices,
 * one to three warm glow lights at the tallest chimneys, and a slight upward
 * current above them.
 *
 * Sources are placed props with `model: procedural:chimney` (tallest first);
 * with none, POIs of kind `vent`. `fluid: carbonate` (Lost City) swaps the
 * dark sulfide smoke for a pale, faint, cooler plume.
 *
 * Draw calls: 2 (smoke points + shimmer points), plus one for opt-in warm
 * orifice haze. The shimmer is a cheap stand-in for refraction: point sprites
 * blended as `dst * src` with src
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

const FILL_TINT = new THREE.Color(0x8a7c6c);
/** Pale blue-green the distance haze is lifted toward (`hazeLift`). */
const HAZE_TINT = new THREE.Color(0x2a4a54);

export interface VentSource {
  /** Orifice (top centre) in world space. */
  top: THREE.Vector3;
  /** Chimney height (m); POI sources get 0. Used to rank "most active". */
  height: number;
}

export interface VentVariety {
  height: number;
  width: number;
  opacity: number;
  lean: number;
  wispX: number;
  wispZ: number;
}

/** Deterministic per-vent plume variation from the orifice position (stable across runs). */
export function ventVariety(top: THREE.Vector3): VentVariety {
  const r = mulberry(
    (Math.imul(Math.round(top.x * 7.3), 73856093) ^
      Math.imul(Math.round(top.z * 7.3), 19349663) ^
      Math.imul(Math.round(top.y * 3.1), 83492791)) >>>
      0,
  );
  const a = r() * Math.PI * 2;
  const d = 0.9 + r() * 1.4;
  return {
    height: 0.7 + r() * 0.55,
    width: 0.55 + r() * 1.0,
    opacity: 0.55 + r() * 0.5,
    lean: 0.45 + r() * 1.2,
    wispX: Math.cos(a) * d,
    wispZ: Math.sin(a) * d,
  };
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
  private leanAngle = 0.6;
  private shimmer: THREE.ShaderMaterial | null = null;
  private haze: THREE.ShaderMaterial | null = null;
  private readonly hazeLean = new THREE.Vector2(1, 0);
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
    this.leanAngle = 0.35 + (ventVariety(this.sources[0]!.top).lean % 1) * 0.5;
    this.hazeLean.set(Math.cos(this.leanAngle), Math.sin(this.leanAngle));
    const intensity = clamp01(num(p.smokeIntensity, 1));
    const total = particleBudget(
      num(p.smokeParticles, 12000) * intensity,
      ctx.particleScale,
      ctx.maxParticles,
    );
    const per = Math.floor(total / this.sources.length);
    if (per > 0) this.buildSmoke(per, carbonate, intensity);
    this.buildShimmer();
    if (!carbonate) this.buildHaze();

    const glowCount = Math.min(
      3,
      Math.max(0, Math.round(num(p.glowLights, 2))),
      this.sources.length,
    );
    if (glowCount > 0) {
      const scale = carbonate ? num(p.glowCarbonateScale, 0.35) : 1;
      this.glow = new GlowLights(
        ctx.scene,
        this.sources
          .slice(0, glowCount)
          .map((s) => s.top.clone().add(new THREE.Vector3(0, carbonate ? 2 : -4, 0))),
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
    const vari = new Float32Array(n * 4);
    const rnd = mulberry(0x5e17);
    // Per-vent variety (deterministic from the vent's position): height, width, opacity and
    // lean scales, a lean-angle offset, and a small white-smoker wisp beside the orifice.
    const wispN = carbonate ? 0 : Math.floor(per * 0.16);
    let k = 0;
    for (const s of this.sources) {
      const v = ventVariety(s.top);
      for (let i = 0; i < per; i++, k++) {
        const wisp = i < wispN;
        origin.set(
          wisp
            ? [s.top.x + v.wispX, s.top.y - 0.4, s.top.z + v.wispZ]
            : [s.top.x, s.top.y, s.top.z],
          k * 3,
        );
        seed.set([rnd(), rnd() * Math.PI * 2, Math.sqrt(rnd()), rnd()], k * 4);
        vari.set([v.height, v.width, v.opacity, wisp ? -v.lean : v.lean], k * 4);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(origin, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('aVar', new THREE.BufferAttribute(vari, 4));

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
        uWisp: { value: new THREE.Color(carbonate ? 0xe4ebe6 : 0x8a847c) },
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

  /** Lit hot-water haze: a warm additive glow of soft sprites above each orifice. */
  private buildHaze(): void {
    const strength = num(this.params.hazeGlow, 0);
    if (strength <= 0) return;
    const pos: number[] = [];
    const seed: number[] = [];
    this.sources.forEach((s, i) => {
      const v = ventVariety(s.top);
      for (let j = 0; j < 3; j++) {
        const rise = (1.2 + j * 2.6) * (0.7 + 0.5 * v.height);
        pos.push(
          s.top.x + this.hazeLean.x * rise * 0.05 * (1 + j),
          s.top.y + rise,
          s.top.z + this.hazeLean.y * rise * 0.05 * (1 + j),
        );
        seed.push((i * 3 + j) * 1.7 + v.width * 0.0);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.haze = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uSize: { value: num(this.params.hazeGlowSizeM, 7) },
        uStrength: { value: strength },
        uTint: { value: new THREE.Color(num(this.params.glowColor, 0xff9a4a)) },
      },
      vertexShader: SHIMMER_VERT,
      fragmentShader: HAZE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = makePoints(geo, this.haze, 'ventHaze');
    pts.renderOrder = 3;
    this.scene!.add(pts);
    this.objects.push(pts);
    this.stats.particles += pos.length / 3;
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    // Soft warm ambient fill ("never black"): lifts the abyssal ambient floor so seabed and
    // chimney bodies read outside the headlight pool. Opt-in per site (sulfide fields).
    const fill = num(this.params.ambientFill, 0);
    if (fill > 0) {
      ctx.atmo.ambientIntensity += fill;
      ctx.atmo.ambientColor.lerp(FILL_TINT, 0.8);
    }
    // Distance haze (opt-in per site): thicker and a little lighter than the abyssal fog, so a
    // far ridge fades into the water instead of standing as a hard dark cut-out.
    const haze = num(this.params.hazeScale, 1);
    if (haze !== 1) ctx.atmo.fogDensity *= haze;
    const lift = num(this.params.hazeLift, 0);
    if (lift > 0) ctx.atmo.fogColor.lerp(HAZE_TINT, lift);
    if (this.smoke) {
      updateCommonUniforms(this.smoke, ctx, this.look);
      // Bend the column downstream: half the drift a particle would make over its life,
      // capped so a strong current cannot fling the smoke off the site.
      const drift = this.smoke.uniforms.uDrift!.value as THREE.Vector2;
      drift.set(ctx.current.x, ctx.current.z).multiplyScalar(this.smokeLifeS * 0.5);
      // Ambient lean: a steady bottom-current bend in one site-wide direction, so plumes
      // lean consistently even in slack water (the current adds to it).
      const lean = this.smokeRiseH * 0.3;
      drift.x += Math.cos(this.leanAngle) * lean;
      drift.y += Math.sin(this.leanAngle) * lean;
      const cap = this.smokeRiseH * 0.7;
      if (drift.length() > cap) drift.setLength(cap);
    }
    if (this.shimmer) updateCommonUniforms(this.shimmer, ctx, this.look);
    if (this.haze) updateCommonUniforms(this.haze, ctx, this.look);
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
    this.haze = null;
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
attribute vec4 aVar; // per-vent height, width, opacity scale, lean (negative = wisp)
uniform vec3 uWisp;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;

varying float vSeed;
varying float vRot;

void main() {
  float t = fract(uTime / uLife + aSeed.x);
  // Buoyant plume: fast out of the orifice, slowing and spreading as it rises.
  bool wisp = aVar.w < 0.0;
  float lean = abs(aVar.w);
  float hs = wisp ? aVar.x * 0.3 : aVar.x;
  float ws = wisp ? 0.22 : aVar.y;
  float h = uRiseH * hs * (1.0 - pow(1.0 - t, 1.8));
  // A narrow stem that billows outward: radius grows faster than linearly.
  // Irregular outline: a per-chimney, height-dependent lobe term and a per-puff bias keep
  // the edge ragged (no clean cone), with a few stragglers thrown well outside the core.
  float cph = position.x * 0.13 + position.z * 0.17;
  float lobe = 0.72 + 0.34 * sin(h * 0.21 + cph * 5.0 + uTime * 0.08)
                    + 0.18 * sin(h * 0.53 - aSeed.y * 3.0 + cph);
  float bias = mix(0.55, 1.0, aSeed.w) * (aSeed.w > 0.93 ? 1.35 : 1.0);
  float r = uSpread * ws * (0.06 + 0.94 * pow(t, 1.35)) * aSeed.z * max(0.35, lobe) * bias;
  float a = aSeed.y + sin(uTime * 0.35 + aSeed.w * 12.0) * 0.6 * t;
  vec3 w = position + vec3(cos(a) * r, h, sin(a) * r);
  // The whole column meanders (phase per chimney) and bends downstream with the current.
  float ph = position.x * 0.13 + position.z * 0.17;
  w.x += sin(h * 0.09 + uTime * 0.21 + ph) * 0.2 * uSpread * t;
  w.z += cos(h * 0.07 + uTime * 0.17 + ph * 1.7) * 0.2 * uSpread * t;
  // Bends with height: the column starts upright and leans further the higher it goes.
  float bend = wisp ? 0.6 : lean;
  vec2 dd = uDrift * bend;
  float la = (aVar.x - 0.8) * 0.9;
  dd = mat2(cos(la), sin(la), -sin(la), cos(la)) * dd;
  w.xz += dd * pow(t, 1.7) * (wisp ? 0.35 : 1.0);
  // Turbulent wobble grows with height.
  w.x += sin(uTime * 0.9 + aSeed.w * 40.0 + h * 0.2) * (0.8 + 1.4 * t) * t;
  w.z += cos(uTime * 0.7 + aSeed.w * 23.0 + h * 0.15) * (0.8 + 1.4 * t) * t;

  // Puffs bloom quickly near the source, then keep swelling slowly.
  float size = mix(uSize0, uSize1, sqrt(t)) * (0.7 + 0.6 * aSeed.w) * (wisp ? 0.3 : sqrt(aVar.y));
  float dist = placePoint(w, size);
  // Lit by the headlights, plus the warm orifice glow for the first few metres.
  vColor = (wisp ? uWisp : uColor) * presetLight(w) + uGlow * exp(-h / 5.0);
  vAlpha = uOpacity * (wisp ? 0.4 : aVar.z) * smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.5, 1.0, t));
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

const HAZE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uStrength;
uniform vec3 uTint;
varying float vSeed;
varying float vFade;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv) * 2.0;
  if (r > 1.0) discard;
  float flick = 0.85 + 0.15 * sin(uTime * 1.7 + vSeed * 5.0);
  float a = pow(1.0 - r * r, 2.0) * uStrength * 0.22 * vFade * flick;
  gl_FragColor = vec4(mix(uTint, vec3(1.0, 0.85, 0.65), 0.35) * a, 1.0);
}
`;
