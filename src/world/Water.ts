/**
 * Sea surface lid, seen from below.
 *
 * A2 moved fog, ambient/sun lighting and the caustic projector into
 * `render/Atmosphere.ts` and the headlights into `render/Headlights.ts`. What is
 * left here is only the surface plane: a finite, camera-following disc at y = 0
 * with a gentle vertex wobble, drawn only while the camera is shallower than
 * `WaterConfig.surfaceVisibleAboveM` (there is nothing to see from the abyss
 * and it saves a draw call).
 *
 * F1-OCEAN: the lid now follows the optics. From below, light from the sky
 * only gets in through Snell's window, a ~97 degree cone straight overhead
 * whose rim is bright and rippled; outside it the surface is a mirror of the
 * water itself (total internal reflection), which we draw as the fog colour so
 * the horizon stays continuous. From above it is a Fresnel mix of water and
 * sky with a sun glint. The maths is per-fragment on one plane, so it runs on
 * every tier; `detail` only adds fine ripples for medium and up.
 */

import * as THREE from 'three';
import type { WaterConfig } from '../core/Config.js';

export class Water {
  readonly group = new THREE.Group();
  readonly surface: THREE.Mesh;

  private readonly material: THREE.ShaderMaterial;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly config: WaterConfig,
    extentM: number,
    detail = 1,
  ) {
    // Oversized so it always reaches the fog horizon. One quad: the swell is
    // shaded per fragment.
    const size = Math.min(extentM * 3, 60000);
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(config.surfaceColor) },
        uAmp: { value: config.surfaceWaveAmpM },
        uLen: { value: config.surfaceWaveLengthM },
        fogColor: { value: new THREE.Color(0x000000) },
        fogDensity: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uLight: { value: 1 },
      },
      defines: { WATER_DETAIL: detail > 0 ? 1 : 0 },
      vertexShader: SURFACE_VERT,
      fragmentShader: SURFACE_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.surface = new THREE.Mesh(geometry, this.material);
    this.surface.rotation.x = -Math.PI / 2; // lay flat, normal along +Y
    this.surface.frustumCulled = false;
    this.surface.name = 'seaSurface';
    this.group.add(this.surface);
    scene.add(this.group);
  }

  /**
   * @param depth   camera depth in metres (negative below sea level)
   * @param subPos  submarine world position (the lid is centred above it)
   * @param elapsed seconds since start, for the wave animation
   */
  update(
    depth: number,
    subPos: THREE.Vector3,
    elapsed: number,
    fog?: { color: THREE.Color; density: number },
    camPos?: THREE.Vector3,
  ): void {
    const visible = depth > this.config.surfaceVisibleAboveM;
    this.surface.visible = visible;
    if (!visible) return;
    this.surface.position.set(subPos.x, 0, subPos.z);
    const u = this.material.uniforms;
    u.uTime!.value = elapsed;
    if (camPos) (u.uCam!.value as THREE.Vector3).copy(camPos);
    // Daylight that reaches the eye through the window: full near the surface,
    // gone by the base of the twilight zone.
    const t = Math.min(1, Math.max(0, (depth + 160) / 152));
    u.uLight!.value = t * t * (3 - 2 * t);
    if (fog) {
      (u.fogColor!.value as THREE.Color).copy(fog.color);
      u.fogDensity!.value = fog.density;
    }
  }

  dispose(): void {
    this.surface.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.group);
  }
}

const SURFACE_VERT = /* glsl */ `
varying float vFogDepth;
varying vec3 vWorld;
void main() {
  // The plane is huge (tens of km) but only has 96 segments, so displacing its
  // vertices would alias a 22 m swell into garbage. It stays flat; the swell is
  // an analytic normal in the fragment shader instead.
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vec4 mv = viewMatrix * world;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 fogColor;
uniform float fogDensity;
uniform vec3 uCam;
uniform float uLight;
uniform float uTime;
uniform float uAmp;
uniform float uLen;
varying float vFogDepth;
varying vec3 vWorld;

const vec3 SUN = vec3(0.2306, 0.9226, 0.1384);
const float CRIT_COS = 0.6614; // cos of asin(1 / 1.333)

void main() {
  // Swell: two crossed sine trains, as an analytic slope. Slopes flatten with
  // distance so the far surface does not shimmer.
  float k = 6.28318 / max(1.0, uLen);
  vec2 q = vWorld.xz;
  float a1 = q.x * k + uTime * 0.9;
  float a2 = -q.y * k * 1.7 - uTime * 0.7;
  vec2 slope = 0.6 * uAmp * k * vec2(cos(a1), -1.02 * cos(a2));
  #if WATER_DETAIL
    // Fine ripples on top of the swell, so the window rim shimmers.
    // Four waves at unrelated headings, so no lattice shows in the window rim.
    vec2 w1 = vec2(0.83, 0.56); vec2 w2 = vec2(-0.41, 0.91);
    vec2 w3 = vec2(0.97, -0.24); vec2 w4 = vec2(-0.66, -0.75);
    slope += 0.022 * (
      w1 * cos(dot(q, w1) * 0.71 + uTime * 1.3) +
      w2 * cos(dot(q, w2) * 1.13 - uTime * 1.7) +
      w3 * cos(dot(q, w3) * 1.71 + uTime * 2.1) +
      w4 * cos(dot(q, w4) * 2.37 - uTime * 1.9));
  #endif
  slope *= 1.0 / (1.0 + vFogDepth / 140.0);
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

  vec3 v = normalize(vWorld - uCam);          // eye -> surface
  float fog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  vec3 color;
  float alpha;

  if (uCam.y < 0.0) {
    // Below the surface, looking up.
    float cosI = dot(v, n);
    float window = smoothstep(CRIT_COS - 0.06, CRIT_COS + 0.08, cosI);
    // Bright sky through the window, deeper blue toward its rim, and a warm sun
    // glint where the refracted ray meets the sun.
    vec3 sky = mix(vec3(0.22, 0.55, 0.85), vec3(0.55, 0.82, 0.98), smoothstep(CRIT_COS, 1.0, cosI));
    float glint = pow(max(dot(refract(v, -n, 1.333), SUN), 0.0), 40.0);
    // The rim of the window is a thin bright ring where the sky is squeezed.
    float rim = exp(-pow((cosI - CRIT_COS) * 14.0, 2.0));
    vec3 through = sky * 0.95 + vec3(1.0, 0.92, 0.7) * glint * 1.2 + vec3(0.5, 0.85, 1.0) * rim * 0.25;
    // Outside the window the surface is a mirror of the water below.
    vec3 mirror = fogColor * 0.9;
    color = mix(mirror, through * mix(0.35, 1.0, uLight), window * uLight);
    alpha = mix(0.45, 0.9, window * uLight);
  } else {
    // Above the surface, looking down: Fresnel between water and sky.
    float cosI = max(dot(-v, n), 0.0);
    float f = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
    vec3 r = reflect(v, n);
    vec3 sky = mix(vec3(0.5, 0.75, 0.95), vec3(0.8, 0.92, 1.0), clamp(r.y, 0.0, 1.0));
    float glint = pow(max(dot(r, SUN), 0.0), 120.0);
    float diffuse = 0.8 + 0.4 * dot(n, SUN);
    color = mix(uColor * diffuse, sky, f * 0.6) + vec3(1.0, 0.95, 0.8) * glint * 1.5;
    alpha = mix(0.45, 0.7, f);
  }
  color = mix(color, fogColor, clamp(fog, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(color, alpha * (1.0 - 0.7 * fog));
}
`;
