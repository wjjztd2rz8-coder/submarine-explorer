import * as THREE from 'three';
import type { LightPreset, RovConfig } from '../core/Config.js';
import { ROV_LAMPS } from '../vehicles/rov.js';
import { payout, TetherMesh } from '../vehicles/tether.js';
import { buildRov, lodForTier, type Vehicle } from '../vehicles/index.js';
import type { Rov } from './Rov.js';

/** ROV model scale (the blueprint is life size, ~2 m long). */
const ROV_SCALE = 1.15;

/** Intensity gain for the fill light that sits further from the float. */
const FILL_STANDOFF_GAIN = 3;

/**
 * The work ROV (F1-VEHICLES): the detailed procedural model from
 * `vehicles/rov.ts`, two lamps (SpotLights at the lamp housings) and a warm
 * fill, and a tether that sags between the sub and the ROV and straightens as
 * it reaches the limit. Low tier: simplified model, no wash, a line tether.
 */
export class RovVisual {
  readonly group = new THREE.Group();
  readonly vehicle: Vehicle;
  readonly tether: TetherMesh;
  private readonly body = new THREE.Group();
  private readonly spots: THREE.SpotLight[] = [];
  private readonly fill: THREE.PointLight;
  private readonly rovAnchor = new THREE.Vector3();
  private readonly lastPos = new THREE.Vector3();
  private lastYaw = 0;
  private lastT = -1;
  private readonly v = new THREE.Vector3();
  private time = 0;

  constructor(
    private readonly config: RovConfig,
    tier: string = 'high',
  ) {
    const low = lodForTier(tier) === 'low';
    this.vehicle = buildRov(tier, ROV_SCALE);
    this.body.add(this.vehicle.root);
    for (const p of ROV_LAMPS) {
      const light = new THREE.SpotLight(0xb4dce3, 0, 0, Math.PI / 5, 0.8, 2);
      light.position.copy(p).multiplyScalar(ROV_SCALE);
      light.position.z -= 0.08;
      light.target.position.set(light.position.x, -12, -20);
      this.spots.push(light);
      this.body.add(light, light.target);
    }
    this.fill = new THREE.PointLight(0xffb973, config.fillMinIntensity, config.fillDistanceM, 2);
    // Well above and behind the float (inverse-square: close in, it blows the
    // float's top out to flat orange); intensity is scaled up to keep the work
    // area lit as before.
    this.fill.position.set(0, 7.5, 6);
    this.body.add(this.fill);
    this.group.add(this.body);
    this.tether = low
      ? new TetherMesh({ segments: 24, line: true })
      : new TetherMesh({ segments: tier === 'medium' ? 32 : 48, radial: 6, radius: 0.07 });
    this.group.add(this.tether.object);
    this.group.visible = false;
  }

  setLightPreset(preset: LightPreset): void {
    const work = preset.workLight;
    for (const spot of this.spots) {
      spot.intensity =
        preset.intensity * (work?.intensityFactor ?? 1) * this.config.spotIntensityFactor;
      spot.distance = preset.distance * this.config.spotDistanceFactor;
    }
    this.fill.intensity =
      FILL_STANDOFF_GAIN *
      Math.max(
        this.config.fillMinIntensity,
        preset.fillIntensity * (work?.fillIntensityFactor ?? 1) * this.config.fillIntensityFactor,
      );
  }

  /**
   * Pose the ROV and its tether. `anchor` is where the tether leaves the sub
   * (SubMesh.tetherAnchor, or the sub's position). `dt` drives the thruster
   * animation; without it the frame time is measured.
   */
  update(rov: Rov, anchor: THREE.Vector3, dt?: number): void {
    this.group.visible = rov.deployed;
    const now = performance.now() / 1000;
    const step = dt ?? (this.lastT < 0 ? 0 : Math.min(0.1, now - this.lastT));
    this.lastT = now;
    if (!rov.deployed) {
      this.lastPos.copy(rov.position);
      this.lastYaw = rov.yaw;
      return;
    }
    this.time += step;
    this.body.position.copy(rov.position);
    this.body.rotation.y = -rov.yaw;

    // Thrusters follow what the ROV is actually doing.
    const c = this.config;
    const inv = step > 1e-4 ? 1 / step : 0;
    let dYaw = rov.yaw - this.lastYaw;
    dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
    this.v.copy(rov.velocity);
    this.vehicle.update(
      {
        throttle: this.v.dot(rov.forward) / Math.max(0.1, c.maxSpeedMps),
        yaw: THREE.MathUtils.clamp(dYaw * inv * 0.8, -1, 1),
        vertical: this.v.y / Math.max(0.1, c.verticalSpeedMps),
        scanning: false,
        lightsOn: true,
      },
      step,
    );
    this.lastPos.copy(rov.position);
    this.lastYaw = rov.yaw;

    // Tether from the sub to the termination on the ROV's back.
    this.body.updateMatrixWorld();
    this.rovAnchor.copy(this.vehicle.tetherAnchor).applyMatrix4(this.body.matrixWorld);
    const chord = anchor.distanceTo(this.rovAnchor);
    const length = payout(chord, c.tetherLengthM, rov.tetherLimit);
    this.tether.update(anchor, this.rovAnchor, length, Math.sin(this.time * 0.4) * 0.3);
  }

  dispose(): void {
    this.vehicle.dispose();
    this.tether.dispose();
    this.group.removeFromParent();
  }
}
