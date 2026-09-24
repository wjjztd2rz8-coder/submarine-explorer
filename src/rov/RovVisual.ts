import * as THREE from 'three';
import type { LightPreset, RovConfig } from '../core/Config.js';
import type { Rov } from './Rov.js';

/** A readable small frame, two lamps, and a taut world-space tether. */
export class RovVisual {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly tether: THREE.Line;
  private readonly spots: THREE.SpotLight[] = [];
  private readonly fill: THREE.PointLight;

  constructor(private readonly config: RovConfig) {
    const metal = new THREE.MeshStandardMaterial({
      color: 0xe07a12,
      metalness: 0.05,
      roughness: 0.9,
      emissive: 0x783005,
      emissiveIntensity: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x13232a,
      metalness: 0.1,
      roughness: 0.85,
      emissive: 0x071015,
      emissiveIntensity: 0.12,
    });
    const lamp = new THREE.MeshStandardMaterial({
      color: 0x4f9dae,
      emissive: 0x1f6678,
      emissiveIntensity: 0.7,
    });
    const box = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
    ): void => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      this.body.add(mesh);
    };
    box(1.45, 0.22, 1.9, 0, 0.55, 0, metal);
    box(1.45, 0.22, 1.9, 0, -0.55, 0, metal);
    for (const x of [-0.68, 0.68]) {
      box(0.14, 1, 0.14, x, 0, -0.85, metal);
      box(0.14, 1, 0.14, x, 0, 0.85, metal);
      box(0.42, 0.35, 0.55, x, 0, 0.15, dark);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), lamp);
      lens.position.set(x, 0.18, -1.03);
      this.body.add(lens);
      const light = new THREE.SpotLight(0xb4dce3, 0, 0, Math.PI / 5, 0.8, 2);
      light.position.set(x, 0.18, -1.12);
      light.target.position.set(x, -12, -20);
      this.spots.push(light);
      this.body.add(light, light.target);
    }
    this.fill = new THREE.PointLight(0xffb973, config.fillMinIntensity, config.fillDistanceM, 2);
    this.fill.position.set(0, 2, 2);
    this.body.add(this.fill);
    box(0.8, 0.65, 0.9, 0, 0, 0, dark);
    this.group.add(this.body);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.tether = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: 0xffd078, transparent: true, opacity: 0.75 }),
    );
    this.tether.frustumCulled = false;
    this.group.add(this.tether);
    this.group.visible = false;
  }

  setLightPreset(preset: LightPreset): void {
    for (const spot of this.spots) {
      spot.intensity = preset.intensity * this.config.spotIntensityFactor;
      spot.distance = preset.distance * this.config.spotDistanceFactor;
    }
    this.fill.intensity = Math.max(
      this.config.fillMinIntensity,
      preset.fillIntensity * this.config.fillIntensityFactor,
    );
  }

  update(rov: Rov, anchor: THREE.Vector3): void {
    this.group.visible = rov.deployed;
    if (!rov.deployed) return;
    this.body.position.copy(rov.position);
    this.body.rotation.y = -rov.yaw;
    const points = this.tether.geometry.attributes.position as THREE.BufferAttribute;
    points.setXYZ(0, anchor.x, anchor.y, anchor.z);
    points.setXYZ(1, rov.position.x, rov.position.y, rov.position.z);
    points.needsUpdate = true;
  }
}
