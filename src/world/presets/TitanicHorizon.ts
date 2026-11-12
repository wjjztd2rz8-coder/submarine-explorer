/**
 * The deep-water backdrop dome: graded horizon haze, a down-welling crown that is
 * never darker than the haze-lit water, and sparse distant marine snow. No
 * lighting, grade or shared shader changes.
 */
import * as THREE from 'three';
import type { AtmosphereSample } from '../../render/Atmosphere.js';
import { ABYSS_HORIZON } from '../../core/config/atmosphere.js';

const UPPER_WATER = new THREE.Color(ABYSS_HORIZON.upperColor);
const HAZE_WATER = new THREE.Color(ABYSS_HORIZON.hazeColor);

/** Optional per-site grade of the backdrop (Endurance: a paler water band above the seabed). */
interface HorizonLook {
  upperColor?: number;
  hazeColor?: number;
  hazePeakElevation?: number;
  /** Extra fog brightness at full abyss depth (default ABYSS_HORIZON.fogLift); hue is preserved. */
  fogLift?: number;
  /** Share (0..1) of the haze colour mixed into the fog at full abyss depth; default 0 keeps the fog hue. */
  fogHaze?: number;
  /** Camera depth (m) where the backdrop starts and reaches full effect; default ABYSS_HORIZON fade band. */
  fadeStartM?: number;
  fadeEndM?: number;
}

export class TitanicHorizon {
  readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly snowUniforms = { uSnow: { value: 0 }, uTime: { value: 0 } };
  private readonly crown = new THREE.Color();
  private readonly upper = new THREE.Color();
  private readonly haze = new THREE.Color();
  private readonly color = new THREE.Color();
  private readonly weights: Float32Array;
  private readonly upperWeights: Float32Array;
  private readonly ridgeWeights: Float32Array;

  private readonly fadeStartM: number;
  private readonly fadeEndM: number;
  private readonly fogLift: number;
  private readonly fogHaze: number;
  private readonly upperWater: THREE.Color;
  private readonly hazeWater: THREE.Color;

  constructor(
    private readonly scene: THREE.Scene,
    look: HorizonLook = {},
    ridge = 0,
    /** Marine-snow density multiplier (0 on Low, where the dome stays plain vertex colour). */
    snowScale = 0,
  ) {
    this.fadeStartM = look.fadeStartM ?? ABYSS_HORIZON.fadeStartM;
    this.fadeEndM = look.fadeEndM ?? ABYSS_HORIZON.fadeEndM;
    this.fogLift = look.fogLift ?? ABYSS_HORIZON.fogLift;
    this.fogHaze = look.fogHaze ?? 0;
    this.upperWater =
      look.upperColor === undefined ? UPPER_WATER : new THREE.Color(look.upperColor);
    this.hazeWater = look.hazeColor === undefined ? HAZE_WATER : new THREE.Color(look.hazeColor);
    const peak = look.hazePeakElevation ?? ABYSS_HORIZON.hazePeakElevation;
    const geometry = new THREE.SphereGeometry(1, ridge > 0 ? 64 : 32, ridge > 0 ? 64 : 16);
    const position = geometry.getAttribute('position');
    this.weights = new Float32Array(position.count);
    this.upperWeights = new Float32Array(position.count);
    this.ridgeWeights = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      // World up, rather than screen up, so cockpit pitch keeps a level horizon.
      // Carry the exact fog colour through the first ring above level. Far
      // seabed silhouettes sit slightly above/below level; starting the lift
      // right at zero makes vertex interpolation outline that boundary.
      const elevation = position.getY(i);
      const azimuth = Math.atan2(position.getZ(i), position.getX(i));
      const glow =
        1 - ABYSS_HORIZON.glowVariation * (0.5 + 0.5 * Math.cos(azimuth * ABYSS_HORIZON.glowLobes));
      this.weights[i] =
        glow * THREE.MathUtils.smoothstep(elevation, ABYSS_HORIZON.fogMatchElevation, peak);
      // Far ridge: a lighter haze bank below a wavy skyline, drawn only when asked for.
      const top =
        ABYSS_HORIZON.ridgeBase +
        ABYSS_HORIZON.ridgeLobes.reduce(
          (sum, l) => sum + l.amplitude * Math.sin(azimuth * l.count + l.phase),
          0,
        );
      const w = ABYSS_HORIZON.ridgeEdgeWidth;
      this.ridgeWeights[i] =
        ridge *
        THREE.MathUtils.smoothstep(elevation, 0, w * 2) *
        (1 - THREE.MathUtils.smoothstep(elevation, top - w, top + w));
      this.upperWeights[i] = THREE.MathUtils.smoothstep(
        elevation,
        peak,
        ABYSS_HORIZON.upperElevation,
      );
    }
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(position.count * 3), 3),
    );
    this.dome = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false,
        // Three applies terrain fog after tone mapping on the direct/Low
        // path. Keep this unlit fog-colour backdrop on that same path.
        toneMapped: false,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.dome.name = 'titanicHorizon';
    // Draw behind all terrain/hull geometry, without touching the depth buffer.
    // Same unlit vertex-colour dome approach as the title's water backdrop.
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    this.dome.visible = false;
    scene.add(this.dome);
    if (snowScale > 0) this.addSnow(snowScale);
  }

  /**
   * Sparse distant marine snow painted by the dome's own fragment shader (a hashed
   * dot grid over view direction): no extra draw, object or particle buffer.
   */
  private addSnow(scale: number): void {
    const cfg = ABYSS_HORIZON.snow;
    const f = (n: number): string => n.toFixed(4);
    this.dome.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.snowUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec3 vDir;\nvoid main() {')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'void main() {',
          'varying vec3 vDir;\nuniform float uSnow;\nuniform float uTime;\nvoid main() {',
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 d = normalize(vDir);
          vec2 g = vec2(atan(d.z, d.x) + uTime, d.y) * ${f(cfg.cells / (2 * Math.PI))};
          vec2 cell = floor(g);
          vec2 h = fract(sin(vec2(dot(cell, vec2(127.1, 311.7)), dot(cell, vec2(269.5, 183.3)))) * 43758.5453);
          float flake = step(1.0 - ${f(cfg.density * scale)}, h.x) *
            (1.0 - smoothstep(${f(cfg.radius / 2)}, ${f(cfg.radius)}, length(fract(g) - (0.2 + 0.6 * h.yx)))) *
            smoothstep(${f(cfg.minElevation)}, ${f(cfg.minElevation + 0.1)}, d.y) *
            (1.0 - smoothstep(${f(cfg.maxElevation - 0.2)}, ${f(cfg.maxElevation)}, d.y));
          diffuseColor.rgb += vec3(0.75, 0.88, 0.92) * flake * uSnow;`,
        );
    };
  }

  update(camera: THREE.PerspectiveCamera, atmo: AtmosphereSample, elapsed = 0): void {
    // Preserve surface starts and the shallower depth bands. Full effect only
    // below 1,200 m, comfortably above the Titanic inspection depth.
    const abyss = THREE.MathUtils.smoothstep(-camera.position.y, this.fadeStartM, this.fadeEndM);
    this.dome.visible = abyss > 0;
    if (abyss <= 0) return;
    // Preserve the fog hue: the shared post pass derives its foreground
    // readability floor from normalized fog RGB. A tint lerp would recolour
    // hull shadows even where distance fog is negligible.
    atmo.fogColor.multiplyScalar(1 + this.fogLift * abyss);
    if (this.fogHaze > 0) atmo.fogColor.lerp(this.hazeWater, this.fogHaze * abyss);
    // Low skips PresetSystem's visual atmosphere sync; its backdrop/fog still
    // need the same colour, independently of the disabled particle layers.
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.color.copy(atmo.fogColor);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(atmo.fogColor);
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
    this.upper.copy(atmo.fogColor).lerp(this.upperWater, abyss);
    // Brighten only: per-channel max against the down-welling floor.
    this.crown.copy(atmo.fogColor).lerp(this.hazeWater, ABYSS_HORIZON.downwell * abyss);
    this.upper.r = Math.max(this.upper.r, this.crown.r);
    this.upper.g = Math.max(this.upper.g, this.crown.g);
    this.upper.b = Math.max(this.upper.b, this.crown.b);
    this.haze.copy(atmo.fogColor).lerp(this.hazeWater, abyss);
    const colors = this.dome.geometry.getAttribute('color');
    for (let i = 0; i < this.weights.length; i++) {
      this.color.copy(atmo.fogColor).lerp(this.haze, this.weights[i]!);
      this.color.lerp(this.upper, this.upperWeights[i]!);
      this.color.lerp(this.haze, this.ridgeWeights[i]!);
      colors.setXYZ(i, this.color.r, this.color.g, this.color.b);
    }
    colors.needsUpdate = true;
    this.snowUniforms.uSnow.value = ABYSS_HORIZON.snow.opacity * abyss;
    this.snowUniforms.uTime.value = elapsed * ABYSS_HORIZON.snow.driftRadPerS;
  }

  dispose(): void {
    this.scene.remove(this.dome);
    this.dome.geometry.dispose();
    this.dome.material.dispose();
  }
}
