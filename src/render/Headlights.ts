/**
 * The submarine's lighting rig: two spotlights on the bow, plus a fake
 * volumetric cone around each so the beam is visible in the water column and
 * not only where it lands.
 *
 * A softened inverse-distance falloff keeps close surfaces colourful and the
 * route ahead readable. Beam opacity integrates lit water along the eye ray,
 * rather than shading the polygon shell: no facet normals or bright rims.
 * Each lamp costs one transparent draw call, with tier-scaled integration.
 */

import * as THREE from 'three';
import type { AtmosphereTier, LightPreset, WaterConfig } from '../core/Config.js';

export class Headlights {
  readonly group = new THREE.Group();
  readonly lights: THREE.SpotLight[] = [];
  readonly fill = new THREE.PointLight(0xfff3dd, 0, 0, 2);

  private readonly cones: THREE.Mesh[] = [];
  private readonly coneMaterial: THREE.ShaderMaterial | null;
  private readonly aim = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private enabled = true;
  private conesSuppressed = false;
  private preset: LightPreset | null = null;
  private workLighting = false;

  constructor(
    private readonly config: WaterConfig,
    private readonly tier: AtmosphereTier,
    private readonly tuning = { intensity: 1, distance: 1, fillIntensity: 1, fillDistance: 1 },
  ) {
    const angle = (config.headlightAngleDeg * Math.PI) / 180;
    for (let i = 0; i < 2; i++) {
      const light = new THREE.SpotLight(
        config.headlightColor,
        config.headlightIntensity,
        config.headlightDistance,
        angle,
        0.7,
        1.35,
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
          uSlope: { value: Math.tan(angle) },
          uTime: { value: 0 },
          uMurk: { value: 1 },
          fogDensity: { value: 0 },
        },
        defines: { BEAM_STEPS: tier.beamDetail >= 2 ? 12 : tier.beamDetail === 1 ? 8 : 6 },
        vertexShader: CONE_VERT,
        fragmentShader: CONE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
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
      this.coneMaterial!.uniforms.uSlope!.value = Math.tan(angle);
    }
    this.setEnabled(this.enabled);
    this.applyLampPreset();
  }

  /** Keep the short ROV rig's broad working light independent of hull-close tuning. */
  private applyLampPreset(): void {
    const preset = this.preset;
    if (!preset) return;
    const work = this.workLighting ? preset.workLight : undefined;
    const tuning = this.workLighting
      ? { intensity: 1, distance: 1, fillIntensity: 1, fillDistance: 1 }
      : this.tuning;
    for (const light of this.lights) {
      light.intensity = preset.intensity * (work?.intensityFactor ?? 1) * tuning.intensity;
      light.distance = preset.distance * tuning.distance;
      light.angle = ((work?.angleDeg ?? preset.angleDeg) * Math.PI) / 180;
      light.penumbra = work ? 0.6 : 0.7;
      light.decay = work ? 1 : 1.35;
    }
    this.fill.intensity =
      preset.fillIntensity * (work?.fillIntensityFactor ?? 1) * tuning.fillIntensity;
    this.fill.distance = (work?.fillDistance ?? preset.fillDistance) * tuning.fillDistance;
    this.fill.decay = work ? 1 : 2;
    this.fill.visible = this.enabled && this.fill.intensity > 0;
  }

  /**
   * @param origin  boat (or, while deployed, ROV) position
   * @param forward its forward direction, unit length
   * @param fog     current fog colour / density, so the cones sit in the same
   *                water as everything else
   */
  update(
    origin: THREE.Vector3,
    forward: THREE.Vector3,
    fog?: { color: THREE.Color; density: number },
    elapsed = 0,
    murk = 1,
    /** Lamp spacing scale: 1 for the sub, smaller for the ROV's tighter light bar. */
    separationScale = 1,
  ): void {
    // The atmosphere system supplies the ROV's smaller lamp-bar spacing.
    // Resolve the vehicle change even with lamps off, so retrieving or changing
    // presets cannot leave the work-light gain on the submarine afterward.
    const workLighting = separationScale < 1;
    if (workLighting !== this.workLighting) {
      this.workLighting = workLighting;
      this.applyLampPreset();
    }
    if (!this.enabled) return;
    if (this.preset) this.fill.position.copy(origin).addScaledVector(forward, 10);
    this.right.crossVectors(forward, this.up).normalize();
    const half = (this.config.headlightSeparationM * separationScale) / 2;

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
  const segments = detail >= 2 ? 64 : detail === 1 ? 48 : 32;
  const geo = new THREE.ConeGeometry(radius, length, segments, 1, false);
  geo.translate(0, -length / 2, 0); // apex at the origin, opening along -Y
  geo.rotateX(-Math.PI / 2); // ...then along +Z
  return geo;
}

const CONE_VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vEye;
void main() {
  vLocal = position;
  // Lamps use rigid transforms. The inverse rotation brings the eye into
  // lamp space without a matrix inverse or a per-lamp uniform upload.
  vec3 translation = -modelViewMatrix[3].xyz;
  vEye = vec3(dot(modelViewMatrix[0].xyz, translation),
              dot(modelViewMatrix[1].xyz, translation),
              dot(modelViewMatrix[2].xyz, translation));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CONE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uLength;
uniform float uSlope;
uniform float uTime;
uniform float uMurk;
uniform float fogDensity;
varying vec3 vLocal;
varying vec3 vEye;

void main() {
  vec3 ray = vLocal - vEye;
  float exitT = length(ray);
  vec3 dir = ray / max(exitT, 0.001);
  float lo = 0.0;
  float hi = exitT;
  // Clip the ray to the finite cone's axial slab, then its analytic sides.
  if (abs(dir.z) > 0.00001) {
    float z0 = -vEye.z / dir.z;
    float z1 = (uLength - vEye.z) / dir.z;
    lo = max(lo, min(z0, z1));
    hi = min(hi, max(z0, z1));
  } else if (vEye.z < 0.0 || vEye.z > uLength) discard;
  float k = uSlope * uSlope;
  float a = dot(dir.xy, dir.xy) - k * dir.z * dir.z;
  float b = 2.0 * (dot(vEye.xy, dir.xy) - k * vEye.z * dir.z);
  float c = dot(vEye.xy, vEye.xy) - k * vEye.z * vEye.z;
  float discriminant = b * b - 4.0 * a * c;
  if (abs(a) < 0.00001) {
    if (abs(b) > 0.00001) {
      if (b > 0.0) hi = min(hi, -c / b);
      else lo = max(lo, -c / b);
    } else if (c > 0.0) discard;
  } else if (discriminant >= 0.0) {
    float r0 = (-b - sqrt(discriminant)) / (2.0 * a);
    float r1 = (-b + sqrt(discriminant)) / (2.0 * a);
    float nearT = min(r0, r1);
    float farT = max(r0, r1);
    if (a > 0.0) {
      lo = max(lo, nearT);
      hi = min(hi, farT);
    } else if (lo < nearT) hi = min(hi, nearT);
    else lo = max(lo, farT);
  } else if (a > 0.0) discard;
  if (hi <= lo) discard;

  float stepM = (hi - lo) / float(BEAM_STEPS);
  float density = 0.0;
  for (int i = 0; i < BEAM_STEPS; i++) {
    float t = lo + (float(i) + 0.5) * stepM;
    vec3 p = vEye + dir * t;
    float radius = length(p.xy) / max(p.z * uSlope, 0.001);
    // Density reaches zero well before the shell: the mesh silhouette never
    // becomes a visible edge. Smooth drift reads as haze, not streak panels.
    float radial = 1.0 - smoothstep(0.35, 1.0, radius);
    float along = pow(max(0.0, 1.0 - p.z / uLength), 2.0);
    float drift = 0.92 + 0.08 * sin(p.x * 0.04 + p.y * 0.03 + p.z * 0.02 - uTime * 0.12);
    float fog = exp(-fogDensity * fogDensity * t * t);
    density += radial * along * drift * fog * smoothstep(2.0, 12.0, t) * stepM;
  }
  float alpha = uOpacity * (1.0 - exp(-density / 55.0)) *
                mix(0.6, 1.3, clamp(uMurk, 0.0, 1.0));
  gl_FragColor = vec4(uColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
