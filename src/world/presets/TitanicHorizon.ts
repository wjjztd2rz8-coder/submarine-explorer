/** Titanic's abyssal water backdrop. No lighting, grade or shared shader changes. */
import * as THREE from 'three';
import type { AtmosphereSample } from '../../render/Atmosphere.js';

// Muted blue-grey, well below the midnight/shallow-water palettes. The fog
// lift is small: scene fog weights it by distance, preserving nearby detail.
const UPPER_WATER = new THREE.Color(0x182630);
const FOG_LIFT = 0.4;

export class TitanicHorizon {
  readonly dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly upper = new THREE.Color();
  private readonly color = new THREE.Color();
  private readonly weights: Float32Array;

  constructor(private readonly scene: THREE.Scene) {
    const geometry = new THREE.SphereGeometry(1, 32, 16);
    const position = geometry.getAttribute('position');
    this.weights = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      // World up, rather than screen up, so cockpit pitch keeps a level horizon.
      this.weights[i] = THREE.MathUtils.smoothstep(position.getY(i), 0, 0.65);
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
    const abyss = THREE.MathUtils.smoothstep(-camera.position.y, 700, 1200);
    this.dome.visible = abyss > 0;
    if (abyss <= 0) return;
    // Preserve the fog hue: the shared post pass derives its foreground
    // readability floor from normalized fog RGB. A tint lerp would recolour
    // hull shadows even where distance fog is negligible.
    atmo.fogColor.multiplyScalar(1 + FOG_LIFT * abyss);
    // Low skips PresetSystem's visual atmosphere sync; its backdrop/fog still
    // need the same colour, independently of the disabled particle layers.
    if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.color.copy(atmo.fogColor);
    if (this.scene.background instanceof THREE.Color) this.scene.background.copy(atmo.fogColor);
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
    this.upper.copy(atmo.fogColor).lerp(UPPER_WATER, abyss);
    const colors = this.dome.geometry.getAttribute('color');
    for (let i = 0; i < this.weights.length; i++) {
      this.color.copy(atmo.fogColor).lerp(this.upper, this.weights[i]!);
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
