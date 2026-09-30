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
    // Oversized so it always reaches the fog horizon; segmented so the
    // vertex wobble has something to move.
    const size = Math.min(extentM * 3, 60000);
    const geometry = new THREE.PlaneGeometry(size, size, 96, 96);
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
uniform float uTime;
uniform float uAmp;
uniform float uLen;
varying float vFogDepth;
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  vec3 p = position;
  // Two crossed sine trains; enough motion to read as a surface, cheap enough
  // to leave on at every tier. The plane is rotated -90 degrees about X, so its
  // local Z is world Y and its local Y is world -Z.
  float k = 6.28318 / max(1.0, uLen);
  float a1 = p.x * k + uTime * 0.9;
  float a2 = p.y * k * 1.7 - uTime * 0.7;
  p.z += uAmp * (sin(a1) + 0.6 * sin(a2));
  float hx = uAmp * k * cos(a1);
  float hy = uAmp * k * 1.02 * cos(a2);
  vNormalW = normalize(vec3(-hx, 1.0, hy));
  vec4 world = modelMatrix * vec4(p, 1.0);
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
varying float vFogDepth;
varying vec3 vWorld;
varying vec3 vNormalW;

const vec3 SUN = vec3(0.2306, 0.9226, 0.1384);
const float CRIT_COS = 0.6614; // cos of asin(1 / 1.333)

void main() {
  vec3 n = normalize(vNormalW);
  #if WATER_DETAIL
    // Fine ripples on top of the swell, so the window rim shimmers.
    vec2 q = vWorld.xz;
    n.xz += 0.05 * vec2(
      sin(q.x * 0.9 + q.y * 0.35 + uTime * 1.7) + sin(q.x * 2.3 - q.y * 1.9 - uTime * 2.3),
      sin(q.y * 1.1 - q.x * 0.4 + uTime * 1.3) + sin(q.y * 2.7 + q.x * 1.6 + uTime * 2.1));
    n = normalize(n);
  #endif
  vec3 v = normalize(vWorld - uCam);          // eye -> surface
  float fog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  vec3 color;
  float alpha;

  if (uCam.y < 0.0) {
    // Below the surface, looking up.
    float cosI = dot(v, n);
    float window = smoothstep(CRIT_COS - 0.035, CRIT_COS + 0.05, cosI);
    // Bright sky through the window, deeper blue toward its rim, and a warm sun
    // glint where the refracted ray meets the sun.
    vec3 sky = mix(vec3(0.55, 0.86, 1.0), vec3(0.95, 0.99, 1.0), smoothstep(CRIT_COS, 1.0, cosI));
    float glint = pow(max(dot(refract(v, -n, 1.333), SUN), 0.0), 40.0);
    // The rim of the window is a thin bright ring where the sky is squeezed.
    float rim = exp(-pow((cosI - CRIT_COS) * 14.0, 2.0));
    vec3 through = sky * 1.35 + vec3(1.0, 0.92, 0.7) * glint * 2.5 + vec3(0.6, 0.9, 1.0) * rim * 0.5;
    // Outside the window the surface is a mirror of the water below.
    vec3 mirror = fogColor * 0.9;
    color = mix(mirror, through * mix(0.35, 1.0, uLight), window * uLight);
    alpha = mix(0.55, 0.9, window * uLight);
  } else {
    // Above the surface, looking down: Fresnel between water and sky.
    float cosI = max(dot(-v, n), 0.0);
    float f = 0.02 + 0.98 * pow(1.0 - cosI, 5.0);
    vec3 r = reflect(v, n);
    vec3 sky = mix(vec3(0.55, 0.78, 0.95), vec3(0.85, 0.94, 1.0), clamp(r.y, 0.0, 1.0));
    float glint = pow(max(dot(r, SUN), 0.0), 120.0);
    color = mix(uColor * 0.9, sky, f) + vec3(1.0, 0.95, 0.8) * glint * 3.0;
    alpha = 0.8;
  }
  color = mix(color, fogColor, clamp(fog, 0.0, 1.0) * 0.85);
  gl_FragColor = vec4(color, alpha * (1.0 - 0.7 * fog));
}
`;
