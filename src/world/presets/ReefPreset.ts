/**
 * Shallow reef: a few sun shafts slanting down from the surface, a brighter,
 * warmer ambient and stronger caustics -- only in the sunlit top of the
 * column (shafts above `shaftMaxDepthM`, the art-direction's 60 m caustics
 * limit). Deeper than ~200 m this preset changes nothing.
 *
 * Optional halocline haze (`haloclineDepthM` > 0 with a lat/lon): a few thin,
 * pale, wispy layers a metre or two apart at the depth where fresh and salt
 * water meet inside a sinkhole (Great Blue Hole, ~90 m). It is a depth-tested
 * disc, so only the part inside the hole shows; the surrounding reef flat
 * hides it. The low tier gets one disc (shafts stay off there).
 *
 * Draw calls: 1 (all shafts are cylindrical billboards in one mesh, additive,
 * fogged) + 1 for the halocline. Shaft anchors wrap in a box around the
 * camera so the field never runs out.
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { mulberry, smoothstep } from './maths.js';
import {
  COMMON_VERT,
  commonUniforms,
  disposeObjects,
  num,
  updateCommonUniforms,
  type ParticleLook,
} from './shared.js';
import type { EnvPreset, PresetEnterContext, PresetFrameContext, PresetParams } from './types.js';

/** Same direction as Atmosphere's sun (0.25, 1, 0.15), pointing down the shaft. */
const SHAFT_DIR = new THREE.Vector3(-0.25, -1, -0.15).normalize();

export class ReefPreset implements EnvPreset {
  readonly name: EnvPresetName = 'reef';
  readonly stats = { draws: 0, particles: 0, lights: 0 };

  private scene: THREE.Scene | null = null;
  private readonly objects: THREE.Mesh[] = [];
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;
  private halo: THREE.ShaderMaterial | null = null;
  private params: PresetParams = {};
  private readonly warm = new THREE.Color();

  constructor(private readonly look: ParticleLook) {}

  enter(ctx: PresetEnterContext): void {
    const p = (this.params = ctx.params);
    this.scene = ctx.scene;
    this.warm.setHex(num(p.warmColor, 0xffe9b8));
    // One cheap disc even on the low tier: it also lifts the dark hole interior there.
    this.buildHalocline(ctx);
    if (!ctx.visuals) return;
    const n = Math.max(0, Math.min(64, Math.round(num(p.shafts, 14))));
    if (!n) return;
    const rnd = mulberry(0x5eef);
    const field = num(p.shaftFieldM, 320);
    const pos: number[] = [];
    const uv: number[] = [];
    const anchor: number[] = [];
    const index: number[] = [];
    for (let i = 0; i < n; i++) {
      const ax = rnd() * field;
      const az = rnd() * field;
      const phase = rnd() * 100;
      const width = 0.5 + rnd();
      for (const [u, v] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ] as const) {
        pos.push(0, 0, 0);
        uv.push(u, v);
        anchor.push(ax, az, phase, width);
      }
      const b = i * 4;
      index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aShaft', new THREE.Float32BufferAttribute(anchor, 4));
    geo.setIndex(index);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uDir: { value: SHAFT_DIR.clone() },
        uField: { value: field },
        uLength: { value: num(p.shaftLengthM, 90) },
        uWidth: { value: num(p.shaftWidthM, 9) },
        uColor: { value: new THREE.Color(num(p.shaftColor, 0xfff1cc)) },
        uOpacity: { value: num(p.shaftOpacity, 0.07) },
        uDepthFade: { value: 1 },
      },
      vertexShader: SHAFT_VERT,
      fragmentShader: SHAFT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'reefShafts';
    ctx.scene.add(this.mesh);
    this.objects.push(this.mesh);
    this.stats.draws = 1;
  }

  private buildHalocline(ctx: PresetEnterContext): void {
    const p = this.params;
    const depth = num(p.haloclineDepthM, 0);
    const lat = p.haloclineLat;
    const lon = p.haloclineLon;
    if (depth <= 0 || typeof lat !== 'number' || typeof lon !== 'number') return;
    const centre = ctx.toWorld(lat, lon);
    const radius = num(p.haloclineRadiusM, 180);
    // Three discs ~1.4 m apart read as one soft band; one draw call. Low tier: a single disc.
    const pos: number[] = [];
    const index: number[] = [];
    const layers = ctx.visuals ? [-1.4, 0, 1.4] : [0];
    const ring = 40;
    layers.forEach((dy, l) => {
      const base = l * (ring + 1);
      pos.push(centre.x, -depth + dy, centre.z);
      for (let i = 0; i < ring; i++) {
        const a = (i / ring) * Math.PI * 2;
        pos.push(centre.x + Math.cos(a) * radius, -depth + dy, centre.z + Math.sin(a) * radius);
        index.push(base, base + 1 + i, base + 1 + ((i + 1) % ring));
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(index);
    this.halo = new THREE.ShaderMaterial({
      uniforms: {
        ...commonUniforms(this.look),
        uCentre: { value: new THREE.Vector3(centre.x, -depth, centre.z) },
        uRadius: { value: radius },
        uColor: { value: new THREE.Color(num(p.haloclineColor, 0xb4d8d2)) },
        uOpacity: { value: num(p.haloclineOpacity, 0.34) * (ctx.visuals ? 1 : 2.2) },
      },
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, this.halo);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.name = 'haloclineHaze';
    ctx.scene.add(mesh);
    this.objects.push(mesh);
    this.stats.draws += 1;
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    if (this.halo) updateCommonUniforms(this.halo, ctx, this.look);
    // Low tier omits shafts, but still needs the site's ambient light adjustments.
    const p = this.params;
    const depth = -ctx.camera.position.y;
    const maxD = num(p.shaftMaxDepthM, 60);
    if (this.material && this.mesh) {
      const fade = 1 - smoothstep(maxD * 0.6, maxD, depth);
      this.mesh.visible = fade > 0.001;
      updateCommonUniforms(this.material, ctx, this.look);
      this.material.uniforms.uDepthFade!.value = fade;
    }
    // Ambient and caustics: full effect in the sunlit zone, gone by 200 m.
    const k = 1 - smoothstep(maxD, 200, depth);
    if (k <= 0) return;
    const a = ctx.atmo;
    a.ambientIntensity *= 1 + (num(p.ambientScale, 1.25) - 1) * k;
    a.ambientColor.lerp(this.warm, num(p.ambientWarmth, 0.18) * k);
    ctx.causticsScale *= 1 + (num(p.causticsScale, 1.5) - 1) * k;
  }

  exit(): void {
    if (this.scene) disposeObjects(this.scene, this.objects);
    this.material = null;
    this.mesh = null;
    this.halo = null;
    this.stats.draws = 0;
  }
}

const HALO_VERT = /* glsl */ `
${COMMON_VERT}
uniform vec3 uCentre;
uniform float uRadius;
varying vec3 vWorld;
varying float vFog;
varying float vEdge;
varying float vNear;
void main() {
  vWorld = position;
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vFog = presetFog(-mv.z);
  // Soft outer edge so the disc never shows a rim where it meets the wall.
  vEdge = 1.0 - smoothstep(0.55, 0.98, distance(position.xz, uCentre.xz) / uRadius);
  // Thin the layer when the eye is inside it, so it never becomes a flat sheet.
  vNear = smoothstep(1.5, 9.0, abs(cameraPosition.y - uCentre.y));
}
`;

const HALO_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uAmbient;
uniform vec3 fogColor;
varying vec3 vWorld;
varying float vFog;
varying float vEdge;
varying float vNear;
void main() {
  // Slow wisps: two drifting sine fields stand in for noise.
  vec2 q = vWorld.xz * 0.045;
  float w = 0.5 + 0.25 * sin(q.x * 2.3 + uTime * 0.05 + sin(q.y * 1.7))
                + 0.25 * sin(q.y * 3.1 - uTime * 0.04 + sin(q.x * 2.1));
  float a = uOpacity * 0.5 * vEdge * vNear * mix(0.55, 1.0, w);
  vec3 c = mix(uColor * (0.55 + uAmbient), fogColor, vFog);
  gl_FragColor = vec4(c, a * (1.0 - 0.5 * vFog));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const SHAFT_VERT = /* glsl */ `
${COMMON_VERT}
uniform vec3  uDir;
uniform float uField;
uniform float uLength;
uniform float uWidth;
attribute vec4 aShaft; // anchor x, anchor z (in the field box), phase, width jitter
varying vec2 vUv;
varying float vFog;
varying float vPhase;
varying float vNear;
void main() {
  // Anchor wraps around the camera horizontally; shafts hang from just below the surface.
  vec3 top = wrapBox(vec3(aShaft.x, 0.0, aShaft.y), vec3(uCam.x, 0.0, uCam.z), uField);
  top.y = -1.0;
  top.x += sin(uTime * 0.07 + aShaft.z) * 4.0;
  vec3 centre = top + uDir * (uv.y * uLength);
  vec3 side = normalize(cross(uDir, cameraPosition - centre));
  float width = uWidth * aShaft.w * (1.0 + 0.6 * uv.y);
  vec3 w = centre + side * (uv.x - 0.5) * width;
  vec4 mv = viewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vPhase = aShaft.z;
  vFog = presetFog(-mv.z);
  // Fade when the camera is inside a shaft, so it never becomes a flat sheet.
  vNear = smoothstep(8.0, 30.0, distance(cameraPosition.xz, centre.xz));
}
`;

const SHAFT_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3  uColor;
uniform float uOpacity;
uniform float uDepthFade;
varying vec2 vUv;
varying float vFog;
varying float vPhase;
varying float vNear;
void main() {
  float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float soft = across * across * (3.0 - 2.0 * across);
  float along = pow(1.0 - vUv.y, 1.6) * smoothstep(0.0, 0.05, vUv.y);
  float flicker = 0.75 + 0.25 * sin(uTime * 0.6 + vPhase) * sin(uTime * 0.23 + vPhase * 1.7);
  float a = uOpacity * soft * along * flicker * uDepthFade * vNear * (1.0 - vFog);
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;
