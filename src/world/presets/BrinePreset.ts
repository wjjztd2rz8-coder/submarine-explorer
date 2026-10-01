/**
 * Brine pool: a dense, mirror-like brine surface at a fixed depth with a low
 * mist above it. From below the layer the water is murkier and dimmer and the
 * layer's underside reads as a dim ceiling.
 *
 * The layer is a flat grid at the brine depth. Terrain above that depth hides
 * it (depth test), so it only shows in depressions, like a real pool; a
 * per-vertex "brine depth" fades it out where it would float far above the
 * seabed, and a radial fade softens its outer edge.
 *
 * Draw calls: 2 (layer mesh + mist points).
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { mulberry, particleBudget, smoothstep } from './maths.js';
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
  PresetTerrain,
} from './types.js';

/**
 * Where the pool sits. An explicit `poolDepthM` wins; otherwise the lowest
 * seabed within `searchR` of the centre (a 9x9 grid), filled `lift` metres
 * deep, so the brine settles into the nearest depression.
 */
export function brinePoolPlacement(
  terrain: Pick<PresetTerrain, 'sampleHeight'>,
  cx: number,
  cz: number,
  poolDepthM: number,
  searchR: number,
  lift: number,
): { x: number; z: number; y: number } {
  if (poolDepthM > 0) return { x: cx, z: cz, y: -poolDepthM };
  let best = { x: cx, z: cz, h: terrain.sampleHeight(cx, cz) };
  const n = 4;
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = cx + (i / n) * searchR;
      const z = cz + (j / n) * searchR;
      const h = terrain.sampleHeight(x, z);
      if (h < best.h) best = { x, z, h };
    }
  }
  return { x: best.x, z: best.z, y: best.h + lift };
}

export class BrinePreset implements EnvPreset {
  readonly name: EnvPresetName = 'brine';
  readonly stats = { draws: 0, particles: 0, lights: 0 };

  private scene: THREE.Scene | null = null;
  private readonly objects: Array<THREE.Mesh | THREE.Points> = [];
  private layer: THREE.ShaderMaterial | null = null;
  private mist: THREE.ShaderMaterial | null = null;
  private params: PresetParams = {};
  private visuals = false;
  /** Pool surface (world) and radius. */
  readonly pool = { x: 0, y: 0, z: 0, r: 0 };

  constructor(private readonly look: ParticleLook) {}

  enter(ctx: PresetEnterContext): void {
    const p = (this.params = ctx.params);
    this.scene = ctx.scene;
    this.visuals = ctx.visuals;
    let cx = ctx.spawn.x;
    let cz = ctx.spawn.z;
    const lat = p.poolLat;
    const lon = p.poolLon;
    if (typeof lat === 'number' && typeof lon === 'number')
      ({ x: cx, z: cz } = ctx.toWorld(lat, lon));
    const at = brinePoolPlacement(
      ctx.terrain,
      cx,
      cz,
      num(p.poolDepthM, 0),
      num(p.autoSearchRadiusM, 200),
      num(p.autoLiftM, 6),
    );
    const r = num(p.poolRadiusM, 260);
    Object.assign(this.pool, { x: at.x, y: at.y, z: at.z, r });
    console.info(`[presets] brine: pool at y=${at.y.toFixed(1)} m, radius ${r} m`);
    if (!ctx.visuals) return;
    this.buildLayer(ctx.terrain);
    this.buildMist(ctx);
    this.stats.draws = this.objects.length;
  }

  private buildLayer(terrain: PresetTerrain): void {
    const p = this.params;
    const { x, y, z, r } = this.pool;
    const seg = 72;
    const geo = new THREE.PlaneGeometry(2 * r, 2 * r, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position');
    const brine = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      brine[i] = y - terrain.sampleHeight(x + pos.getX(i), z + pos.getZ(i));
    }
    geo.setAttribute('aBrine', new THREE.BufferAttribute(brine, 1));
    this.layer = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uCentre: { value: new THREE.Vector3(x, y, z) },
        uRadius: { value: r },
        uPool: { value: new THREE.Color(num(p.poolColor, 0x0b2630)) },
        uSheen: { value: new THREE.Color(num(p.sheenColor, 0x9fc6d2)) },
        uOpAbove: { value: num(p.opacityAbove, 0.78) },
        uOpBelow: { value: num(p.opacityBelow, 0.55) },
        uRipple: { value: num(p.rippleScaleM, 9) },
        uRippleSpeed: { value: num(p.rippleSpeed, 0.25) },
      },
      vertexShader: LAYER_VERT,
      fragmentShader: LAYER_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, this.layer);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 1;
    mesh.name = 'brineLayer';
    this.scene!.add(mesh);
    this.objects.push(mesh);
  }

  private buildMist(ctx: PresetEnterContext): void {
    const p = this.params;
    const n = particleBudget(num(p.mistParticles, 6000), ctx.particleScale, ctx.maxParticles);
    if (n <= 0) return;
    const { x, y, z, r } = this.pool;
    const h = num(p.mistHeightM, 5);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const rnd = mulberry(0xb417e);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * r * 0.95;
      // Denser low down: the mist is a skin on the brine, not a cloud.
      pos.set([x + Math.cos(a) * d, y + 0.3 + h * rnd() ** 2, z + Math.sin(a) * d], i * 3);
      seed[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.mist = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uColor: { value: new THREE.Color(num(p.mistColor, 0xa9c4c9)) },
        uOpacity: { value: num(p.mistOpacity, 0.22) },
        uCentre: { value: new THREE.Vector3(x, y, z) },
        uRadius: { value: r },
      },
      vertexShader: MIST_VERT,
      fragmentShader: SOFT_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const pts = makePoints(geo, this.mist, 'brineMist');
    this.scene!.add(pts);
    this.objects.push(pts);
    this.stats.particles = n;
  }

  /** 0 above the layer, 1 a couple of metres below it (inside the pool's footprint). */
  submersion(camera: THREE.Vector3): number {
    const dx = camera.x - this.pool.x;
    const dz = camera.z - this.pool.z;
    if (dx * dx + dz * dz > this.pool.r * this.pool.r) return 0;
    return smoothstep(0, 2, this.pool.y - camera.y);
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    if (!this.visuals) return;
    if (this.layer) updateCommonUniforms(this.layer, ctx, this.look);
    if (this.mist) updateCommonUniforms(this.mist, ctx, this.look);
    const under = this.submersion(ctx.camera.position);
    if (under > 0) {
      const p = this.params;
      const a = ctx.atmo;
      a.fogDensity *= 1 + (num(p.underFogScale, 2.5) - 1) * under;
      a.ambientIntensity *= 1 + (num(p.underAmbientScale, 0.5) - 1) * under;
      a.fogColor.lerp(TMP.setHex(num(p.poolColor, 0x0b2630)), 0.5 * under);
    }
  }

  debug(): string {
    return `pool y=${this.pool.y.toFixed(0)} r=${this.pool.r}`;
  }

  exit(): void {
    if (this.scene) disposeObjects(this.scene, this.objects);
    this.layer = this.mist = null;
    this.stats.draws = this.stats.particles = 0;
  }
}

const TMP = new THREE.Color();

const LAYER_VERT = /* glsl */ `
${COMMON_VERT}
attribute float aBrine;
varying vec3 vWorld;
varying float vBrine;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vBrine = aBrine;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const LAYER_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3  uSubPos;
uniform float uAmbient;
uniform float uHeadGain;
uniform float uHeadFall;
uniform float fogDensity;
uniform vec3  fogColor;
uniform vec3  uCentre;
uniform float uRadius;
uniform vec3  uPool;
uniform vec3  uSheen;
uniform float uOpAbove;
uniform float uOpBelow;
uniform float uRipple;
uniform float uRippleSpeed;
varying vec3 vWorld;
varying float vBrine;

void main() {
  // Slow ripples: gradients of two crossed wave trains perturb the normal.
  vec2 q = vWorld.xz / uRipple;
  float t = uTime * uRippleSpeed;
  vec2 g = vec2(cos(q.x + t) * 0.6 + cos(q.x * 0.7 + q.y * 1.3 - t * 1.3) * 0.35,
                cos(q.y * 1.1 - t * 0.8) * 0.5 + cos(q.x * 0.7 + q.y * 1.3 - t * 1.3) * 0.45);
  vec3 N = normalize(vec3(-g.x * 0.06, 1.0, -g.y * 0.06));
  vec3 V = normalize(cameraPosition - vWorld);
  bool below = cameraPosition.y < uCentre.y;
  if (below) N = -N;

  float light = uAmbient + uHeadGain * exp(-distance(vWorld, uSubPos) / uHeadFall);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  // Headlight sheen: the lamps are on the boat, so the highlight follows it.
  vec3 L = normalize(uSubPos - vWorld);
  float spec = pow(max(dot(N, normalize(L + V)), 0.0), 90.0) * uHeadGain *
               exp(-distance(vWorld, uSubPos) / (uHeadFall * 2.0));
  vec3 col = uPool * (0.4 + light);
  col = mix(col, uSheen * (0.12 + 0.6 * light), 0.25 + 0.6 * fres) + uSheen * spec * 0.6;
  float alpha = below ? uOpBelow : uOpAbove;
  if (below) col *= 0.45;

  float r = distance(vWorld.xz, uCentre.xz) / uRadius;
  float edge = 1.0 - smoothstep(0.7, 1.0, r);
  // No brine where the seabed is above the surface; fade where it would float high.
  float fill = smoothstep(0.0, 0.6, vBrine) * (1.0 - smoothstep(25.0, 45.0, vBrine));
  float dist = distance(cameraPosition, vWorld);
  float fog = clamp(1.0 - exp(-fogDensity * fogDensity * dist * dist), 0.0, 1.0);
  gl_FragColor = vec4(mix(col, fogColor, fog), alpha * edge * fill * (1.0 - 0.7 * fog));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const MIST_VERT = /* glsl */ `
${COMMON_VERT}
uniform vec3  uColor;
uniform float uOpacity;
uniform vec3  uCentre;
uniform float uRadius;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec3 w = position;
  w.x += sin(uTime * 0.05 + aSeed * 50.0) * 6.0;
  w.z += cos(uTime * 0.04 + aSeed * 31.0) * 6.0;
  w.y += sin(uTime * 0.3 + aSeed * 17.0) * 0.4;
  float dist = placePoint(w, 3.5 + 3.0 * aSeed);
  vColor = uColor * presetLight(w);
  float r = distance(w.xz, uCentre.xz) / uRadius;
  vAlpha = uOpacity * (1.0 - smoothstep(0.6, 1.0, r)) * (1.0 - smoothstep(0.0, 6.0, w.y - uCentre.y) * 0.7);
  vFog = presetFog(dist);
}
`;
