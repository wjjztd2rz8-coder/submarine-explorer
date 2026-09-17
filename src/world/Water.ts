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
 * Not yet implemented (A2 item 6): a proper Fresnel/reflection material. The
 * current lid is a translucent tinted plane; see docs/atmosphere.md.
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
      },
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
  ): void {
    const visible = depth > this.config.surfaceVisibleAboveM;
    this.surface.visible = visible;
    if (!visible) return;
    this.surface.position.set(subPos.x, 0, subPos.z);
    const u = this.material.uniforms;
    u.uTime!.value = elapsed;
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
varying vec3 vViewDir;
void main() {
  vec3 p = position;
  // Two crossed sine trains; enough motion to read as a surface, cheap enough
  // to leave on at every tier. The plane is rotated -90° about X, so its
  // local Z is world Y.
  float k = 6.28318 / max(1.0, uLen);
  p.z += uAmp * (sin(p.x * k + uTime * 0.9) + 0.6 * sin(p.y * k * 1.7 - uTime * 0.7));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFogDepth = -mv.z;
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 fogColor;
uniform float fogDensity;
varying float vFogDepth;
varying vec3 vViewDir;
void main() {
  // Brighter when looked at straight on (light from above), dimmer at grazing
  // angles; a cheap stand-in for Fresnel until a reflective lid lands.
  float facing = abs(vViewDir.z);
  vec3 color = uColor * (0.75 + 0.65 * facing);
  float fog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  color = mix(color, fogColor, clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(color, 0.45 * (1.0 - fog));
}
`;
