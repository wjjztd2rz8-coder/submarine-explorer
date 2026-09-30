/**
 * The submarine's lighting rig: two spotlights on the bow, plus a fake
 * volumetric cone around each so the beam is visible in the water column and
 * not only where it lands.
 *
 * Below ~150 m this is the only real light in the scene (art-direction §6), so
 * it is deliberately warm-white (`#FFF3DD`) and inverse-linear rather than
 * inverse-square: a physically-correct decay would put the seabed 300 m ahead
 * at zero and the frame would read as black.
 *
 * Toggled with `L` (the edge comes from `Input.toggleLights`, which A3 owns).
 * The cones are geometry, not a post effect, so they respect the scene fog and
 * cost one extra transparent draw call each. F1-OCEAN: the shell is shaded by
 * how squarely the eye looks through it (so the beam has soft edges and a
 * bright core), it thickens with the water's particulate load and carries a
 * drifting dust texture on the medium tier and up. The `low` tier keeps a
 * plain, low-segment cone with the same shading and no dust.
 */

import * as THREE from 'three';
import type { AtmosphereTier, LightPreset, WaterConfig } from '../core/Config.js';

export class Headlights {
  readonly group = new THREE.Group();
  readonly lights: THREE.SpotLight[] = [];
  readonly fill = new THREE.PointLight(0xfff3dd, 0, 0, 1);

  private readonly cones: THREE.Mesh[] = [];
  private readonly coneMaterial: THREE.ShaderMaterial | null;
  private readonly aim = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private enabled = true;
  private conesSuppressed = false;
  private preset: LightPreset | null = null;

  constructor(
    private readonly config: WaterConfig,
    private readonly tier: AtmosphereTier,
  ) {
    const angle = (config.headlightAngleDeg * Math.PI) / 180;
    for (let i = 0; i < 2; i++) {
      const light = new THREE.SpotLight(
        config.headlightColor,
        config.headlightIntensity,
        config.headlightDistance,
        angle,
        0.6,
        1,
      );
      light.name = `headlight${i}`;
      this.lights.push(light);
      this.group.add(light, light.target);
    }
    this.fill.name = 'headlightFill';
    this.group.add(this.fill);

    if (tier.headlightCones) {
      // A cone whose apex sits at the lamp. The shader fades it out at the
      // apex (so the camera never flies into a solid wedge in first person)
      // and at the rim (so the cone has no visible hard edge).
      const length = Math.min(config.headlightDistance, 420);
      const radius = Math.tan(angle) * length;
      const geo = coneGeometry(radius, length, tier.beamDetail);
      this.coneMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(config.headlightColor) },
          uOpacity: { value: config.headlightConeOpacity },
          uLength: { value: length },
          uTime: { value: 0 },
          uMurk: { value: 1 },
          fogDensity: { value: 0 },
        },
        defines: { BEAM_DUST: tier.beamDetail > 0 ? 1 : 0 },
        vertexShader: CONE_VERT,
        fragmentShader: CONE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 2; i++) {
        const mesh = new THREE.Mesh(geo, this.coneMaterial);
        mesh.frustumCulled = false;
        mesh.renderOrder = 2;
        this.cones.push(mesh);
        this.group.add(mesh);
      }
    } else {
      this.coneMaterial = null;
    }
  }

  get on(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    for (const l of this.lights) l.visible = on;
    for (const c of this.cones) c.visible = on && !this.conesSuppressed;
    this.fill.visible = on && this.fill.intensity > 0;
  }

  /** Hide additive beam geometry near a separate vehicle camera, keeping real illumination. */
  setConesSuppressed(suppressed: boolean): void {
    this.conesSuppressed = suppressed;
    for (const c of this.cones) c.visible = this.enabled && !suppressed;
  }

  setPreset(preset: LightPreset): void {
    this.preset = preset;
    const angle = (preset.angleDeg * Math.PI) / 180;
    for (const light of this.lights) {
      light.intensity = preset.intensity;
      light.distance = preset.distance;
      light.angle = angle;
    }
    this.fill.intensity = preset.fillIntensity;
    this.fill.distance = preset.fillDistance;
    const length = Math.min(preset.distance, 420);
    if (this.cones.length) {
      const radius = Math.tan(angle) * length;
      const geo = coneGeometry(radius, length, this.tier.beamDetail);
      const old = this.cones[0]!.geometry;
      for (const cone of this.cones) cone.geometry = geo;
      old.dispose();
      this.coneMaterial!.uniforms.uOpacity!.value = preset.coneOpacity;
      this.coneMaterial!.uniforms.uLength!.value = length;
    }
    this.setEnabled(this.enabled);
  }

  /**
   * @param origin  boat position
   * @param forward boat forward direction, unit length
   * @param fog     current fog colour / density, so the cones sit in the same
   *                water as everything else
   */
  update(
    origin: THREE.Vector3,
    forward: THREE.Vector3,
    fog?: { color: THREE.Color; density: number },
    elapsed = 0,
    murk = 1,
  ): void {
    if (!this.enabled) return;
    if (this.preset) this.fill.position.copy(origin).addScaledVector(forward, 10);
    this.right.crossVectors(forward, this.up).normalize();
    const half = this.config.headlightSeparationM / 2;

    for (let i = 0; i < this.lights.length; i++) {
      const side = i === 0 ? -half : half;
      const light = this.lights[i]!;
      light.position.copy(origin).addScaledVector(this.right, side);
      this.aim.copy(origin).addScaledVector(forward, 400).addScaledVector(this.right, side);
      light.target.position.copy(this.aim);
      light.target.updateMatrixWorld();

      const cone = this.cones[i];
      if (cone) {
        cone.position.copy(light.position);
        cone.lookAt(this.aim);
      }
    }

    if (this.coneMaterial && fog) {
      this.coneMaterial.uniforms.fogDensity!.value = fog.density;
      this.coneMaterial.uniforms.uTime!.value = elapsed;
      this.coneMaterial.uniforms.uMurk!.value = murk;
    }
  }

  dispose(): void {
    this.cones[0]?.geometry.dispose();
    this.coneMaterial?.dispose();
  }
}

/**
 * A cone with its apex at the origin, opening along +Z (the boat's forward
 * axis once `lookAt` has aimed it). Segment count follows the beam detail.
 */
function coneGeometry(radius: number, length: number, detail: number): THREE.BufferGeometry {
  const segments = detail >= 2 ? 32 : detail === 1 ? 22 : 16;
  const geo = new THREE.ConeGeometry(radius, length, segments, 1, true);
  geo.translate(0, -length / 2, 0); // apex at the origin, opening along -Y
  geo.rotateX(-Math.PI / 2); // ...then along +Z
  return geo;
}

const CONE_VERT = /* glsl */ `
varying float vAlong;   // metres from the apex, along the beam
varying float vAngle;   // angle around the beam axis
varying float vDepth;   // metres from the camera, for fog and near fade
varying vec3 vNormalV;  // view-space shell normal
varying vec3 vViewDir;  // view-space direction from the fragment to the eye
void main() {
  // The geometry was built with its apex at the origin, opening along +Z.
  vAlong = position.z;
  vAngle = atan(position.y, position.x);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const CONE_FRAG = /* glsl */ `
precision highp float;
uniform vec3  uColor;
uniform float uOpacity;
uniform float uLength;
uniform float uTime;
uniform float uMurk;
uniform float fogDensity;
varying float vAlong;
varying float vAngle;
varying float vDepth;
varying vec3 vNormalV;
varying vec3 vViewDir;

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
  float along = clamp(vAlong / uLength, 0.0, 1.0);
  // Beam brightness falls off with range but keeps a long tail: light that far
  // out still reads as a shaft. The apex fades in so the lamp is not a hard dot.
  float body = pow(1.0 - along, 1.5) * smoothstep(0.0, 0.02, along);
  // Looking squarely through the shell means the longest chord of lit water: a
  // bright core with soft edges, and no hard silhouette.
  float chord = abs(dot(normalize(vNormalV), normalize(vViewDir)));
  chord = 0.12 + 0.88 * pow(chord, 1.5);
  float a = uOpacity * 2.6 * body * chord * mix(0.6, 1.5, clamp(uMurk, 0.0, 1.0));
  #if BEAM_DUST
    // Slow drifting streaks: suspended particles catching the light.
    float streak = vnoise(vec2(vAngle * 4.0, vAlong * 0.012 - uTime * 0.12));
    float fine = vnoise(vec2(vAngle * 14.0 + uTime * 0.04, vAlong * 0.05 - uTime * 0.3));
    a *= 0.8 + 0.3 * streak + 0.15 * fine;
  #endif
  // Never fly into a solid wedge: fade out close to the camera.
  a *= smoothstep(1.5, 14.0, vDepth);
  // Additive light still gets eaten by the water it shines through.
  float f = exp(-fogDensity * fogDensity * vDepth * vDepth);
  gl_FragColor = vec4(uColor * a * f, a * f);
}
`;
