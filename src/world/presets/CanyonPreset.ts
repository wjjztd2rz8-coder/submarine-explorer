/**
 * Submarine canyon: a current that runs down-canyon and pushes the boat, and
 * occasional sediment plumes (turbidity puffs) that drift with it.
 *
 * The current (maths.ts `canyonCurrent`): an optional base bearing, bent
 * toward the regional down-slope (a smoothed terrain normal), faster in a
 * confined channel, weaker high above the floor. Terrain is sampled at 4 Hz,
 * not per frame. The system caps and applies it (Presets.ts).
 *
 * Draw calls: 1 (plume points). Plume origins and birth times are six
 * uniforms updated on the CPU when a plume expires.
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import {
  canyonCurrent,
  channelConfinement,
  mulberry,
  particleBudget,
  vectorToBearing,
} from './maths.js';
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
import type { EnvPreset, PresetEnterContext, PresetFrameContext, PresetParams } from './types.js';

const MAX_PLUMES = 8;
const SAMPLE_PERIOD_S = 0.25;

export class CanyonPreset implements EnvPreset {
  readonly name: EnvPresetName = 'canyon';
  readonly stats = { draws: 0, particles: 0, lights: 0 };

  private scene: THREE.Scene | null = null;
  private readonly objects: THREE.Points[] = [];
  private material: THREE.ShaderMaterial | null = null;
  private params: PresetParams = {};
  private plumes = 0;
  private sampleClock = Infinity;
  private readonly rnd = mulberry(0xca9e);
  private readonly normal = new THREE.Vector3();
  private readonly tmpN = new THREE.Vector3();
  /** Horizontal current at the sub from the last terrain sample (m/s). */
  readonly flow = new THREE.Vector3();

  constructor(private readonly look: ParticleLook) {}

  enter(ctx: PresetEnterContext): void {
    const p = (this.params = ctx.params);
    this.scene = ctx.scene;
    if (!ctx.visuals) return;
    this.plumes = Math.min(MAX_PLUMES, Math.max(0, Math.round(num(p.plumes, 6))));
    const per = Math.floor(
      particleBudget(
        num(p.plumeParticles, 900) * this.plumes,
        ctx.particleScale,
        ctx.maxParticles,
      ) / Math.max(1, this.plumes),
    );
    if (!this.plumes || per <= 0) return;
    const n = per * this.plumes;
    const idx = new Float32Array(n);
    const seed = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      idx[i] = Math.floor(i / per);
      seed.set([this.rnd(), this.rnd() * Math.PI * 2, Math.sqrt(this.rnd()), this.rnd()], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    // Position is unused (the shader builds it); Three still wants the attribute.
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aPlume', new THREE.BufferAttribute(idx, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const life = num(p.plumeLifeS, 26);
    const plumes: THREE.Vector4[] = [];
    for (let i = 0; i < MAX_PLUMES; i++) plumes.push(new THREE.Vector4(0, 0, 0, -1e6));
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uPlumes: { value: plumes },
        uFlow: { value: new THREE.Vector3() },
        uLife: { value: life },
        uSpread: { value: num(p.plumeSpreadM, 26) },
        uSize: { value: num(p.plumeSizeM, 3.2) },
        uColor: { value: new THREE.Color(num(p.plumeColor, 0x8a7d68)) },
        uOpacity: { value: num(p.plumeOpacity, 0.3) },
      },
      defines: { MAX_PLUMES },
      vertexShader: PLUME_VERT,
      fragmentShader: SOFT_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const pts = makePoints(geo, this.material, 'canyonPlumes');
    ctx.scene.add(pts);
    this.objects.push(pts);
    this.stats.draws = 1;
    this.stats.particles = n;
  }

  /** Sample the terrain and recompute the current at `pos`. */
  sampleCurrent(
    pos: THREE.Vector3,
    terrain: PresetFrameContext['terrain'],
    base: THREE.Vector3,
    referenceSpeedMps: number,
  ): void {
    const p = this.params;
    const R = num(p.confinementRadiusM, 400);
    // Regional slope: average normal over a small cross, so local detail
    // noise does not flick the current around.
    this.normal.set(0, 0, 0);
    const offs = [
      [0, 0],
      [R / 2, 0],
      [-R / 2, 0],
      [0, R / 2],
      [0, -R / 2],
    ] as const;
    for (const [ox, oz] of offs)
      this.normal.add(terrain.getNormal(pos.x + ox, pos.z + oz, this.tmpN));
    this.normal.normalize();
    const centre = terrain.sampleHeight(pos.x, pos.z);
    const ring: number[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ring.push(terrain.sampleHeight(pos.x + Math.cos(a) * R, pos.z + Math.sin(a) * R));
    }
    const dir = p.currentDirDeg;
    const baseSpeed =
      Math.hypot(base.x, base.z) *
      (num(p.currentSpeedMps, referenceSpeedMps) / Math.max(1e-6, referenceSpeedMps));
    const c = canyonCurrent({
      baseDirDeg:
        typeof dir === 'number' ? dir : baseSpeed > 0 ? vectorToBearing(base.x, base.z) : null,
      baseSpeedMps: baseSpeed,
      slopeBias: num(p.slopeBias, 0.7),
      axisGain: num(p.axisGain, 0.8),
      confinement: channelConfinement(centre, ring, num(p.confinementReliefM, 120)),
      normal: this.normal,
      altitudeM: pos.y - centre,
      boundaryLayerM: num(p.boundaryLayerM, 60),
      aloftFraction: num(p.aloftFraction, 0.35),
    });
    this.flow.set(c.x, 0, c.z);
  }

  update(dt: number, ctx: PresetFrameContext): void {
    this.sampleClock += dt;
    if (ctx.baseCurrent.lengthSq() === 0) {
      this.flow.set(0, 0, 0);
      this.sampleClock = Infinity;
    } else if (this.sampleClock >= SAMPLE_PERIOD_S) {
      this.sampleClock = 0;
      this.sampleCurrent(
        ctx.subPosition,
        ctx.terrain,
        ctx.baseCurrent,
        ctx.canyonReferenceSpeedMps,
      );
    }
    ctx.current.add(this.flow);

    if (!this.material) return;
    updateCommonUniforms(this.material, ctx, this.look);
    const u = this.material.uniforms;
    (u.uFlow!.value as THREE.Vector3).copy(this.flow);
    const life = u.uLife!.value as number;
    const plumes = u.uPlumes!.value as THREE.Vector4[];
    const R = num(this.params.plumeSpawnRadiusM, 220);
    for (let i = 0; i < this.plumes; i++) {
      const pl = plumes[i]!;
      if (ctx.elapsed - pl.w < life) continue;
      // Respawn on the seabed near the boat, biased upstream so it drifts past.
      const a = this.rnd() * Math.PI * 2;
      const d = Math.sqrt(this.rnd()) * R;
      const up =
        this.flow.lengthSq() > 1e-6
          ? this.flow
              .clone()
              .normalize()
              .multiplyScalar(-R * 0.4)
          : ZERO;
      const x = ctx.subPosition.x + up.x + Math.cos(a) * d;
      const z = ctx.subPosition.z + up.z + Math.sin(a) * d;
      // Stagger the first wave so plumes do not all bloom on the same frame.
      const birth =
        pl.w < -1e5 ? ctx.elapsed - (life * i) / this.plumes : ctx.elapsed + this.rnd() * 4;
      pl.set(x, ctx.terrain.sampleHeight(x, z) + 1, z, birth);
    }
  }

  debug(): string {
    const f = this.flow;
    return `flow=${Math.hypot(f.x, f.z).toFixed(2)}m/s`;
  }

  exit(): void {
    if (this.scene) disposeObjects(this.scene, this.objects);
    this.material = null;
    this.stats.draws = this.stats.particles = 0;
  }
}

const ZERO = new THREE.Vector3();

const PLUME_VERT = /* glsl */ `
${COMMON_VERT}
uniform vec4  uPlumes[MAX_PLUMES];
uniform vec3  uFlow;
uniform float uLife;
uniform float uSpread;
uniform float uSize;
uniform vec3  uColor;
uniform float uOpacity;
attribute float aPlume;
attribute vec4 aSeed; // delay, angle, radial, jitter
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec4 pl = uPlumes[int(aPlume)];
  float age = uTime - pl.w - aSeed.x * 3.0;
  float t = age / uLife;
  if (t < 0.0 || t > 1.0) { hidePoint(); vColor = vec3(0.0); vAlpha = 0.0; vFog = 1.0; return; }
  // A puff: billows out and up quickly, then settles while the current carries it.
  float r = uSpread * sqrt(t) * aSeed.z;
  float h = 12.0 * sin(3.14159 * min(1.0, t * 1.4)) * (0.3 + aSeed.w) + 2.0 * t;
  vec3 w = pl.xyz + uFlow * age + vec3(cos(aSeed.y) * r, h, sin(aSeed.y) * r);
  float dist = placePoint(w, uSize * (0.6 + 1.4 * t) * (0.7 + 0.6 * aSeed.w));
  vColor = uColor * presetLight(w);
  vAlpha = uOpacity * smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.45, 1.0, t));
  vFog = presetFog(dist);
}
`;
