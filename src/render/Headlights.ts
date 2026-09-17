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
 * cost one extra transparent draw call each; they are off on the `low` tier.
 */

import * as THREE from 'three';
import type { AtmosphereTier, WaterConfig } from '../core/Config.js';

export class Headlights {
  readonly group = new THREE.Group();
  readonly lights: THREE.SpotLight[] = [];

  private readonly cones: THREE.Mesh[] = [];
  private readonly coneMaterial: THREE.ShaderMaterial | null;
  private readonly aim = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private enabled = true;

  constructor(
    private readonly config: WaterConfig,
    tier: AtmosphereTier,
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

    if (tier.headlightCones) {
      // A cone whose apex sits at the lamp. The shader fades it out at the
      // apex (so the camera never flies into a solid wedge in first person)
      // and at the rim (so the cone has no visible hard edge).
      const length = Math.min(config.headlightDistance, 420);
      const radius = Math.tan(angle) * length;
      const geo = new THREE.ConeGeometry(radius, length, 20, 1, true);
      geo.translate(0, -length / 2, 0); // apex at the origin, opening along -Y
      geo.rotateX(-Math.PI / 2); // ...then along -Z, the boat's forward axis
      this.coneMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(config.headlightColor) },
          uOpacity: { value: config.headlightConeOpacity },
          uLength: { value: length },
          fogDensity: { value: 0 },
        },
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
    for (const c of this.cones) c.visible = on;
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
  ): void {
    if (!this.enabled) return;
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
    }
  }

  dispose(): void {
    for (const c of this.cones) c.geometry.dispose();
    this.coneMaterial?.dispose();
  }
}

const CONE_VERT = /* glsl */ `
varying float vAlong;   // metres from the apex, along the beam
varying float vRadial;  // metres off the beam axis
varying float vDepth;   // metres from the camera, for fog
void main() {
  // The geometry was built with its apex at the origin, opening along -Z.
  vAlong = -position.z;
  vRadial = length(position.xy);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const CONE_FRAG = /* glsl */ `
precision highp float;
uniform vec3  uColor;
uniform float uOpacity;
uniform float uLength;
uniform float fogDensity;
varying float vAlong;
varying float vRadial;
varying float vDepth;

void main() {
  // Fade along the beam and towards the rim, so there is no hard silhouette
  // and the camera never flies into a solid wedge in first person.
  float along = clamp(vAlong / uLength, 0.0, 1.0);
  float body  = (1.0 - along) * (1.0 - along) * smoothstep(0.0, 0.08, along);
  float rim   = 1.0 - clamp(vRadial / max(1.0, vAlong * 0.85 + 1.0), 0.0, 1.0);
  float a = uOpacity * body * mix(0.25, 1.0, rim);
  // Additive light still gets eaten by the water it shines through.
  float f = exp(-fogDensity * fogDensity * vDepth * vDepth);
  gl_FragColor = vec4(uColor * a * f, a * f);
}
`;
