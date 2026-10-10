/** Titanic's abyssal water backdrop. No lighting, grade or shared shader changes. */
import * as THREE from 'three';
import type { AtmosphereSample } from '../../render/Atmosphere.js';
import { ABYSS_HORIZON } from '../../core/config/atmosphere.js';

const UPPER_WATER = new THREE.Color(ABYSS_HORIZON.upperColor);
const HAZE_WATER = new THREE.Color(ABYSS_HORIZON.hazeColor);

/** Optional per-site grade of the backdrop (Endurance: a paler water band above the seabed). */
export interface HorizonLook {
  upperColor?: number;
  hazeColor?: number;
  hazePeakElevation?: number;
}

export class TitanicHorizon {
  readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly upper = new THREE.Color();
  private readonly haze = new THREE.Color();
  private readonly color = new THREE.Color();
  private readonly weights: Float32Array;
  private readonly upperWeights: Float32Array;

  private readonly upperWater: THREE.Color;
  private readonly hazeWater: THREE.Color;

  constructor(
    private readonly scene: THREE.Scene,
    look: HorizonLook = {},
  ) {
    this.upperWater = look.upperColor === undefined ? UPPER_WATER : new THREE.Color(look.upperColor);
    this.hazeWater = look.hazeColor === undefined ? HAZE_WATER : new THREE.Color(look.hazeColor);
    const peak = look.hazePeakElevation ?? ABYSS_HORIZON.hazePeakElevation;
    const geometry = new THREE.SphereGeometry(1, 32, 16);
    const position = geometry.getAttribute('position');
    this.weights = new Float32Array(position.count);
    this.upperWeights = new Float32Array(position.count);
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
        glow *
        THREE.MathUtils.smoothstep(
          elevation,
          ABYSS_HORIZON.fogMatchElevation,
          peak,
        );
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
  }

  update(camera: THREE.PerspectiveCamera, atmo: AtmosphereSample): void {
    // Preserve surface starts and the shallower depth bands. Full effect only
    // below 1,200 m, comfortably above the Titanic inspection depth.
    const abyss = THREE.MathUtils.smoothstep(
      -camera.position.y,
      ABYSS_HORIZON.fadeStartM,
      ABYSS_HORIZON.fadeEndM,
    );
    this.dome.visible = abyss > 0;
    if (abyss <= 0) return;
    // Preserve the fog hue: the shared post pass derives its foreground
    // readability floor from normalized fog RGB. A tint lerp would recolour
    // hull shadows even where distance fog is negligible.
    atmo.fogColor.multiplyScalar(1 + ABYSS_HORIZON.fogLift * abyss);
    // Low skips PresetSystem's visual atmosphere sync; its backdrop/fog still
    // need the same colour, independently of the disabled particle layers.
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.color.copy(atmo.fogColor);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(atmo.fogColor);
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
    this.upper.copy(atmo.fogColor).lerp(this.upperWater, abyss);
    this.haze.copy(atmo.fogColor).lerp(this.hazeWater, abyss);
    const colors = this.dome.geometry.getAttribute('color');
    for (let i = 0; i < this.weights.length; i++) {
      this.color.copy(atmo.fogColor).lerp(this.haze, this.weights[i]!);
      this.color.lerp(this.upper, this.upperWeights[i]!);
      colors.setXYZ(i, this.color.r, this.color.g, this.color.b);
    }
    colors.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.dome);
    this.dome.geometry.dispose();
    this.dome.material.dispose();
  }
}
