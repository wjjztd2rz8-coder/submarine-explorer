/**
 * Marine snow: the permanent drizzle of organic detritus falling through the
 * water column. The reference photos (art-direction §6) never show clear
 * "aquarium" water, so this field is on at every depth -- only its density and
 * drift rate change with the band.
 *
 * Implementation is entirely GPU-side. The points are generated once inside a
 * cube of edge `Config.water.snowBoxM`; every frame the vertex shader drifts
 * them and wraps them modulo the cube *around the current camera position*, so
 * the field follows the camera forever with no CPU work and no re-upload. A
 * per-point random seed decides which points are visible at the current
 * density, so changing density does not reallocate the buffer.
 */

import * as THREE from 'three';
import type { AtmosphereTier, WaterConfig } from '../core/Config.js';
import type { AtmosphereSample } from './Atmosphere.js';
import type { CurrentVector } from '../world/Currents.js';

export function snowFlowStep(
  offset: { x: number; z: number },
  current: Pick<CurrentVector, 'x' | 'z'>,
  seconds: number,
): { x: number; z: number } {
  return { x: offset.x + current.x * seconds, z: offset.z + current.z * seconds };
}

/** The lamp rig as the snow sees it: where the beams start, where they point and how far they reach. */
export interface SnowLamp {
  origin: THREE.Vector3;
  forward: THREE.Vector3;
  /** Half-angle of the beam, radians. */
  angle: number;
  range: number;
  on: boolean;
}

/** Shared by permanent snow and the snow-like wreck sediment layers. */
export function snowReadabilityUniforms(config: WaterConfig): Record<string, THREE.IUniform> {
  return {
    uMaxSizePx: { value: config.snowMaxSizePx },
    uForegroundM: { value: config.snowForegroundM },
    uForegroundFadeEndM: { value: config.snowForegroundFadeEndM },
    uForegroundSizePx: { value: config.snowForegroundSizePx },
    uForegroundAlpha: { value: config.snowForegroundAlpha },
    uForegroundBrightness: { value: config.snowForegroundBrightness },
  };
}

/** CPU mirror of the sprite-centre shader bounds for code-level readability audits.
 * viewDepthM drives perspective/fog; cameraDistanceM drives the spherical guard.
 * edge and lit are the vertex shader's wrapping fade and lamp-cone weight.
 * Brightness is the linear colour multiplier before tone mapping, not pixel luminance.
 */
export function snowParticleAppearance(
  config: WaterConfig,
  atmosphere: AtmosphereSample,
  scale: number,
  seed: number,
  viewDepthM: number,
  cameraDistanceM: number,
  lit: number,
  edge = 1,
): { sizePx: number; alpha: number; brightness: number } {
  const t = THREE.MathUtils.smoothstep(
    cameraDistanceM,
    config.snowForegroundM,
    config.snowForegroundFadeEndM,
  );
  const sizeCap = THREE.MathUtils.lerp(config.snowForegroundSizePx, config.snowMaxSizePx, t);
  const sizePx = THREE.MathUtils.clamp(
    (config.snowSizeM * (0.35 + 1.6 * seed * seed) * (1 + 0.7 * lit) * scale) /
      Math.max(1, viewDepthM),
    1,
    sizeCap,
  );
  const fog = Math.exp(-(atmosphere.fogDensity ** 2) * viewDepthM ** 2);
  const alpha =
    edge * (seed <= atmosphere.snowDensity ? 1 : 0) * (0.55 + 0.45 * fog) * (0.5 + 0.5 * lit);
  const brightness = 0.22 + 0.78 * Math.min(1, atmosphere.ambientIntensity / 1.5) + lit * 2.6;
  return {
    sizePx,
    alpha: Math.min(alpha, THREE.MathUtils.lerp(config.snowForegroundAlpha, 1, t)),
    brightness: Math.min(brightness, THREE.MathUtils.lerp(config.snowForegroundBrightness, 3.6, t)),
  };
}

export class MarineSnow {
  readonly points: THREE.Points | null;

  private readonly material: THREE.ShaderMaterial | null;
  private readonly geometry: THREE.BufferGeometry | null;
  private elapsed = 0;
  private flow = { x: 0, z: 0 };

  constructor(config: WaterConfig, tier: AtmosphereTier) {
    const count = tier.snowCount;
    if (count <= 0) {
      this.points = null;
      this.material = null;
      this.geometry = null;
      return;
    }

    const box = config.snowBoxM;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    // Deterministic: the same field every run, so screenshots are comparable.
    let rng = 0x2f6e2b1;
    const rand = (): number => {
      rng = (rng * 1664525 + 1013904223) >>> 0;
      return rng / 0x100000000;
    };
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand() * box;
      positions[i * 3 + 1] = rand() * box;
      positions[i * 3 + 2] = rand() * box;
      seeds[i] = rand();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    // The shader relocates every point around the camera, so Three must never
    // cull the object on its authored bounds.
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: box },
        uDensity: { value: 1 },
        uDrift: { value: 0.2 },
        uFlow: { value: new THREE.Vector2() },
        uSizeM: { value: config.snowSizeM },
        uScale: { value: 500 },
        ...snowReadabilityUniforms(config),
        uLampPos: { value: new THREE.Vector3() },
        uLampDir: { value: new THREE.Vector3(0, 0, -1) },
        uLampCos: { value: 0.8 },
        uLampRange: { value: 400 },
        uLampOn: { value: 0 },
        uColor: { value: new THREE.Color(0xdfe9ec) },
        uBrightness: { value: 1 },
        fogDensity: { value: 0 },
      },
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    this.points.name = 'marineSnow';
  }

  /**
   * @param camera      the rendering camera (position + FOV drive attenuation)
   * @param atmosphere  current depth sample: density, drift and fog
   * @param frameDelta  real seconds since the last frame
   * @param viewportH   drawing-buffer height in pixels
   */
  update(
    camera: THREE.PerspectiveCamera,
    atmosphere: AtmosphereSample,
    frameDelta: number,
    viewportH: number,
    current: Pick<CurrentVector, 'x' | 'z'> = { x: 0, z: 0 },
    lamp?: SnowLamp,
  ): void {
    if (!this.material) return;
    this.elapsed += frameDelta;
    this.flow = snowFlowStep(this.flow, current, frameDelta);
    const u = this.material.uniforms;
    u.uTime!.value = this.elapsed;
    (u.uCam!.value as THREE.Vector3).copy(camera.position);
    u.uDensity!.value = atmosphere.snowDensity;
    u.uDrift!.value = atmosphere.snowDriftMps;
    (u.uFlow!.value as THREE.Vector2).set(this.flow.x, this.flow.z);
    u.fogDensity!.value = atmosphere.fogDensity;
    // Perspective size attenuation: metres -> pixels at one metre of distance.
    u.uScale!.value = viewportH / (2 * Math.tan((camera.fov * Math.PI) / 180 / 2));
    // Particles are lit by whatever light there is; in the abyss they catch
    // only the headlights, which we approximate with a floor.
    u.uBrightness!.value = 0.22 + 0.78 * Math.min(1, atmosphere.ambientIntensity / 1.5);
    // Motes inside a beam flare up: that is what makes the beam read as a beam.
    u.uLampOn!.value = lamp?.on ? 1 : 0;
    if (lamp) {
      (u.uLampPos!.value as THREE.Vector3).copy(lamp.origin);
      (u.uLampDir!.value as THREE.Vector3).copy(lamp.forward);
      u.uLampCos!.value = Math.cos(lamp.angle);
      u.uLampRange!.value = Math.min(lamp.range, 600);
    }
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
  }
}

const SNOW_VERT = /* glsl */ `
uniform float uTime;
uniform vec3  uCam;
uniform float uBox;
uniform float uDensity;
uniform float uDrift;
uniform vec2 uFlow;
uniform float uSizeM;
uniform float uScale;
uniform float uMaxSizePx;
uniform float uForegroundM;
uniform float uForegroundFadeEndM;
uniform float uForegroundSizePx;
uniform float fogDensity;
uniform vec3  uLampPos;
uniform vec3  uLampDir;
uniform float uLampCos;
uniform float uLampRange;
uniform float uLampOn;
attribute float aSeed;
varying float vAlpha;
varying float vLit;
varying float vForegroundFade;

void main() {
  // Drift: mostly sinking, with a slow per-particle lateral sway.
  vec3 p = position;
  p.y -= uDrift * uTime * (0.6 + aSeed * 0.8);
  p.x += sin(uTime * 0.11 + aSeed * 31.4) * 1.5;
  p.z += cos(uTime * 0.09 + aSeed * 17.7) * 1.5;
  p.xz += uFlow;

  // Wrap into the cube centred on the camera. mod() is always in [0, uBox).
  vec3 world = uCam + mod(p - uCam + 0.5 * uBox, uBox) - 0.5 * uBox;

  vec4 mv = viewMatrix * vec4(world, 1.0);
  float dist = -mv.z;
  // Use radial distance: the guard must hold at the sides of the frame too.
  vForegroundFade = smoothstep(uForegroundM, uForegroundFadeEndM, length(world - uCam));
  gl_Position = projectionMatrix * mv;

  // Lit by the boat's lamps: inside the beam cone, fading with range.
  vec3 toP = world - uLampPos;
  float lampDist = length(toP);
  float aim = dot(toP / max(lampDist, 0.001), uLampDir);
  float inBeam = smoothstep(uLampCos - 0.06, mix(uLampCos, 1.0, 0.45), aim);
  vLit = uLampOn * inBeam * (1.0 - smoothstep(0.0, uLampRange, lampDist));

  // A wide spread of sizes: most are fine dust, a few are proper flakes.
  float sizeMul = 0.35 + 1.6 * aSeed * aSeed;
  float sizeCap = mix(uForegroundSizePx, uMaxSizePx, vForegroundFade);
  gl_PointSize = clamp(uSizeM * sizeMul * (1.0 + 0.7 * vLit) * uScale / max(1.0, dist), 1.0, sizeCap);

  // Fade out at the edge of the cube so wrapping never pops, and drop the
  // points the current density does not pay for. Distant motes sink into the fog.
  vec3 d = abs(world - uCam) / (0.5 * uBox);
  float edge = 1.0 - smoothstep(0.7, 1.0, max(d.x, max(d.y, d.z)));
  float fog = exp(-fogDensity * fogDensity * dist * dist);
  vAlpha = edge * step(aSeed, uDensity) * mix(0.55, 1.0, fog);
  if (vAlpha <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const SNOW_FRAG = /* glsl */ `
precision highp float;
uniform vec3  uColor;
uniform float uBrightness;
uniform float uForegroundAlpha;
uniform float uForegroundBrightness;
varying float vAlpha;
varying float vLit;
varying float vForegroundFade;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;
  // Gaussian-ish sprite: soft edge, no hard disc.
  float soft = exp(-r * 14.0);
  float brightnessCap = mix(uForegroundBrightness, 3.6, vForegroundFade);
  vec3 col = uColor * min(uBrightness + vLit * 2.6, brightnessCap);
  // Clamp the centre before applying the Gaussian, preserving a soft edge.
  float alphaCap = mix(uForegroundAlpha, 1.0, vForegroundFade);
  float a = min(vAlpha * (0.5 + 0.5 * vLit), alphaCap) * soft;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
