import { Vector3 } from 'three';
import type { RovConfig } from '../core/Config.js';
import type { InputState } from '../core/Input.js';

export interface RovFloor {
  sampleHeight(x: number, z: number): number;
  widthM: number;
  depthM: number;
}

export type RovMode = 'stowed' | 'piloting' | 'returning';

/** Fixed-step ROV motion. The sub pose is the tether anchor and never moves here. */
export class Rov {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  readonly forward = new Vector3(0, 0, -1);
  yaw = 0;
  mode: RovMode = 'stowed';
  tetherUsedM = 0;
  tetherLimit = false;

  constructor(
    readonly config: RovConfig,
    private readonly floor: RovFloor,
  ) {}

  get deployed(): boolean {
    return this.mode !== 'stowed';
  }

  deploy(anchor: Vector3, yaw: number): boolean {
    if (this.deployed) return false;
    this.yaw = yaw;
    this.updateForward();
    this.position.copy(anchor).addScaledVector(this.forward, this.config.deployAheadM);
    this.position.y -= this.config.deployBelowM;
    this.clampToWorld();
    this.velocity.set(0, 0, 0);
    this.mode = 'piloting';
    this.measure(anchor);
    return true;
  }

  retrieve(): void {
    if (this.mode === 'piloting') this.mode = 'returning';
  }

  abort(): void {
    this.mode = 'stowed';
    this.velocity.set(0, 0, 0);
    this.tetherUsedM = 0;
    this.tetherLimit = false;
  }

  step(
    dt: number,
    input: Pick<InputState, 'throttle' | 'yaw' | 'ballast' | 'pitch' | 'boost'>,
    anchor: Vector3,
    current?: Vector3,
  ): void {
    if (!this.deployed || dt <= 0) return;
    if (this.mode === 'returning') {
      const toAnchor = anchor.clone().sub(this.position);
      const distance = toAnchor.length();
      if (distance <= this.config.returnSpeedMps * dt + this.config.radiusM) {
        this.abort();
        return;
      }
      this.velocity.copy(toAnchor.multiplyScalar(this.config.returnSpeedMps / distance));
    } else {
      this.yaw += input.yaw * this.config.yawRateRadS * dt;
      this.updateForward();
      const vertical = Math.max(-1, Math.min(1, input.ballast + input.pitch));
      const desired = this.forward.clone().multiplyScalar(input.throttle * this.config.maxSpeedMps);
      desired.y = vertical * this.config.verticalSpeedMps;
      if (current) desired.addScaledVector(current, this.config.currentScale);
      const fromAnchor = this.position.clone().sub(anchor);
      const distance = fromAnchor.length();
      if (distance > this.config.tetherLengthM - 8 && distance > 0) {
        const outward = desired.dot(fromAnchor) / distance;
        if (outward > 0) {
          const slack = Math.max(0, (this.config.tetherLengthM - distance) / 8);
          desired.addScaledVector(fromAnchor, -(outward * (1 - slack)) / distance);
        }
      }
      const response = 1 - Math.exp(-this.config.responsePerSecond * dt);
      this.velocity.lerp(desired, response);
      const speed = this.velocity.length();
      if (speed > this.config.maxSpeedMps)
        this.velocity.multiplyScalar(this.config.maxSpeedMps / speed);
    }
    this.position.addScaledVector(this.velocity, dt);
    this.clampToWorld();
    const delta = this.position.clone().sub(anchor);
    const distance = delta.length();
    const limit = this.config.tetherLengthM;
    this.tetherLimit = this.mode === 'piloting' && distance >= limit - 0.5;
    if (distance > limit) {
      delta.multiplyScalar(1 / distance);
      this.position.copy(anchor).addScaledVector(delta, limit);
      const outward = this.velocity.dot(delta);
      if (outward > 0) this.velocity.addScaledVector(delta, -outward);
    }
    this.measure(anchor);
  }

  private updateForward(): void {
    this.forward.set(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  private clampToWorld(): void {
    this.position.x = Math.max(
      -this.floor.widthM / 2,
      Math.min(this.floor.widthM / 2, this.position.x),
    );
    this.position.z = Math.max(
      -this.floor.depthM / 2,
      Math.min(this.floor.depthM / 2, this.position.z),
    );
    const minY =
      this.floor.sampleHeight(this.position.x, this.position.z) +
      this.config.radiusM +
      this.config.clearanceM;
    if (this.position.y < minY) {
      this.position.y = minY;
      if (this.velocity.y < 0) this.velocity.y = 0;
    }
    if (this.position.y > -this.config.radiusM) {
      this.position.y = -this.config.radiusM;
      if (this.velocity.y > 0) this.velocity.y = 0;
    }
  }

  private measure(anchor: Vector3): void {
    this.tetherUsedM = this.position.distanceTo(anchor);
  }
}
