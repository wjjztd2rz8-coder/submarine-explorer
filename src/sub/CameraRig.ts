/** Chase, world-fixed free look, first-person and photo orbit camera. */

import * as THREE from 'three';
import type { CameraConfig } from '../core/Config.js';
import type { HeightField } from './Submarine.js';

export type CameraMode = 'chase' | 'first-person' | 'orbit';

/**
 * Photo-mode orbit radius limits (metres): close enough to fill the frame with
 * the hull, never so far that the subject is lost in the fog.
 */
export const PHOTO_ORBIT_MIN_M = 6;
export const PHOTO_ORBIT_MAX_M = 220;

/** Per-frame extras. All optional so a bare `update(pos, yaw, pitch, dt)` works. */
export interface CameraUpdateOptions {
  /** Cosmetic bank angle of the boat (radians). */
  roll?: number;
  /** Boat velocity, used for speed-proportional look-ahead. */
  velocity?: THREE.Vector3;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'chase';
  /** Accessibility: remove banking follow. */
  reduceMotion = false;

  /** Free-orbit state, driven by `orbit()` from a photo-mode UI. */
  orbitAzimuth = 0;
  orbitElevation: number;
  lookAzimuth = 0;
  freeLook = false;
  lookElevation = 0;
  orbitRadius: number;
  chaseRadius: number;

  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly currentTarget = new THREE.Vector3();
  private readonly lastSubPos = new THREE.Vector3();
  private readonly freeLookTargetOffset = new THREE.Vector3();
  private freeLookAimElapsed = 0;
  private readonly offset = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private pendingLookAzimuth = 0;
  private pendingLookElevation = 0;

  private bank = 0;
  /** Mode the camera returns to when photo mode is switched off. */
  private modeBeforeOrbit: CameraMode = 'chase';

  constructor(
    private readonly config: CameraConfig,
    aspect: number,
    /** Optional: without it the camera simply does not collide with the seabed. */
    private readonly terrain: HeightField | null = null,
  ) {
    this.camera = new THREE.PerspectiveCamera(config.fovDeg, aspect, config.near, config.far);
    this.camera.name = 'mainCamera';
    this.orbitRadius = config.orbitRadius;
    this.chaseRadius = Math.hypot(config.chaseOffset.x, config.chaseOffset.y, config.chaseOffset.z);
    this.orbitElevation = config.orbitElevation;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** The camera-view key: swap between chase and the first-person viewport. */
  toggleMode(): CameraMode {
    if (this.mode === 'orbit') return this.setMode(this.modeBeforeOrbit);
    const next = this.mode === 'chase' ? 'first-person' : 'chase';
    this.resetView();
    return this.setMode(next);
  }

  /** The `P` key: drop into free orbit and back out again. */
  togglePhotoMode(): CameraMode {
    if (this.mode === 'orbit') return this.setMode(this.modeBeforeOrbit);
    this.modeBeforeOrbit = this.mode;
    return this.setMode('orbit');
  }

  // --- D-PHOTO begin ---
  /**
   * Enter photo mode without a jump: the orbit starts on the current line of
   * sight, `target` metres away (clamped), looking at `target`.
   */
  enterPhotoMode(target: THREE.Vector3): CameraMode {
    if (this.mode === 'orbit') return this.mode;
    this.modeBeforeOrbit = this.mode;
    const back = this.camera.getWorldDirection(this.offset).negate();
    const r = this.camera.position.distanceTo(target);
    this.orbitRadius = clamp(
      this.mode === 'first-person' ? this.config.orbitRadius : r,
      PHOTO_ORBIT_MIN_M,
      PHOTO_ORBIT_MAX_M,
    );
    this.orbitElevation = clamp(Math.asin(clamp(back.y, -1, 1)), -1.4, 1.4);
    this.orbitAzimuth = Math.atan2(back.x, back.z);
    return this.setMode('orbit');
  }

  /** Leave photo mode for exactly the view it was entered from. */
  exitPhotoMode(): CameraMode {
    return this.mode === 'orbit' ? this.setMode(this.modeBeforeOrbit) : this.mode;
  }
  // --- D-PHOTO end ---

  setMode(mode: CameraMode): CameraMode {
    this.mode = mode;
    return this.mode;
  }

  /** Return to the configured chase view and zoom. */
  resetView(): void {
    this.freeLook = false;
    this.lookAzimuth = 0;
    this.lookElevation = 0;
    this.pendingLookAzimuth = 0;
    this.pendingLookElevation = 0;
    this.freeLookTargetOffset.set(0, 0, 0);
    this.freeLookAimElapsed = 0;
    this.chaseRadius = Math.hypot(
      this.config.chaseOffset.x,
      this.config.chaseOffset.y,
      this.config.chaseOffset.z,
    );
    this.bank = 0;
    this.setMode('chase');
  }

  /** Drag to orbit in any camera mode; the wheel adjusts chase distance. */
  orbit(dAzimuth: number, dElevation: number, dRadius = 0): void {
    if (this.mode === 'orbit') {
      this.orbitAzimuth += dAzimuth;
      this.orbitElevation = clamp(this.orbitElevation + dElevation, -1.4, 1.4);
      this.orbitRadius = clamp(
        this.orbitRadius * (1 + dRadius),
        PHOTO_ORBIT_MIN_M,
        PHOTO_ORBIT_MAX_M,
      );
    } else {
      if (this.mode === 'chase' && !this.freeLook) {
        this.pendingLookAzimuth += dAzimuth;
        this.pendingLookElevation += dElevation;
        if (Math.hypot(this.pendingLookAzimuth, this.pendingLookElevation) > 0.012) {
          // Capture the current world-space orbit before applying the pointer delta.
          const o = this.camera.position.clone().sub(this.lastSubPos);
          const radius = o.length();
          this.lookAzimuth = Math.atan2(o.x, o.z);
          this.lookElevation = Math.asin(clamp(o.y / Math.max(radius, 1), -1, 1));
          this.freeLookTargetOffset.copy(this.currentTarget).sub(this.lastSubPos);
          this.freeLookAimElapsed = 0;
          this.bank = 0;
          this.freeLook = true;
          dAzimuth = this.pendingLookAzimuth;
          dElevation = this.pendingLookElevation;
          this.pendingLookAzimuth = 0;
          this.pendingLookElevation = 0;
        }
      }
      if (this.freeLook || this.mode === 'first-person') {
        this.lookAzimuth += dAzimuth;
        this.lookElevation = clamp(this.lookElevation + dElevation, -1.4, 1.4);
      }
      this.chaseRadius = clamp(this.chaseRadius * (1 + dRadius), 35, 180);
    }
  }

  /**
   * @param subPos  submarine position
   * @param yaw     submarine yaw (radians, 0 = north, +pi/2 = east: physics convention)
   * @param pitch   submarine pitch (radians)
   * @param dt      real frame delta in seconds
   * @param opts    roll / velocity
   */
  update(
    subPos: THREE.Vector3,
    yaw: number,
    pitch: number,
    dt: number,
    opts: CameraUpdateOptions = {},
  ): void {
    const c = this.config;
    this.lastSubPos.copy(subPos);

    // The boat's orientation as a quaternion (YXZ: yaw then pitch). Physics
    // yaw is a compass angle (+yaw turns toward +X = east, see
    // Submarine.getForward), but a Three.js +Y rotation turns -Z toward -X
    // (west), so the Euler takes -yaw. Without the sign the chase camera sat
    // mirrored across the N-S axis at any heading but 0 / 180.
    this.euler.set(pitch, -yaw, 0);
    this.quat.setFromEuler(this.euler);

    const speed = opts.velocity ? opts.velocity.length() : 0;

    if (this.mode === 'orbit') {
      // A fixed sphere around the boat; no smoothing lag, it is a tripod.
      const ce = Math.cos(this.orbitElevation);
      this.desiredPosition.set(
        Math.sin(this.orbitAzimuth) * ce,
        Math.sin(this.orbitElevation),
        Math.cos(this.orbitAzimuth) * ce,
      );
      this.desiredPosition.multiplyScalar(this.orbitRadius).add(subPos);
      this.desiredTarget.copy(subPos);
    } else {
      const o = this.mode === 'chase' ? c.chaseOffset : c.firstPersonOffset;
      this.offset.set(o.x, o.y, o.z);
      if (this.mode === 'chase') {
        if (this.freeLook) {
          const ce = Math.cos(this.lookElevation);
          this.offset
            .set(
              Math.sin(this.lookAzimuth) * ce,
              Math.sin(this.lookElevation),
              Math.cos(this.lookAzimuth) * ce,
            )
            .multiplyScalar(this.chaseRadius);
        } else {
          this.offset.multiplyScalar(
            this.chaseRadius / Math.hypot(c.chaseOffset.x, c.chaseOffset.y, c.chaseOffset.z),
          );
          this.offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
        }
      } else {
        this.offset
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lookAzimuth)
          .applyQuaternion(this.quat);
      }
      this.desiredPosition.copy(subPos).add(this.offset);

      if (this.mode === 'chase') {
        if (this.freeLook) {
          this.freeLookAimElapsed = Math.min(
            c.freeLookAimSeconds,
            this.freeLookAimElapsed + Math.max(0, dt),
          );
          const t = clamp(this.freeLookAimElapsed / c.freeLookAimSeconds, 0, 1);
          const eased = t * t * (3 - 2 * t);
          this.desiredTarget.copy(subPos).addScaledVector(this.freeLookTargetOffset, 1 - eased);
        } else
          this.desiredTarget
            .set(0, c.chaseLookRise, -c.chaseLookAhead)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)
            .add(subPos);
      } else {
        this.desiredTarget
          .set(0, 0, -1)
          .applyAxisAngle(new THREE.Vector3(1, 0, 0), this.lookElevation * 0.55)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lookAzimuth)
          .applyQuaternion(this.quat)
          .multiplyScalar(c.firstPersonLookAhead + speed * c.lookAheadPerSpeed)
          .add(subPos);
      }
    }

    // Pointer motion is already a direct angular delta. Follow and aim move
    // with it on this frame so no camera travel remains after release.
    this.camera.position.copy(this.desiredPosition);
    this.currentTarget.copy(this.desiredTarget);

    this.clampToTerrain();
    this.camera.lookAt(this.currentTarget);
    this.applyBank(opts.roll ?? 0, dt);
  }

  /** Never let the camera sit inside (or below) the seabed. */
  private clampToTerrain(): void {
    if (!this.terrain) return;
    const p = this.camera.position;
    const floor = this.terrain.sampleHeight(p.x, p.z) + this.config.terrainClearance;
    if (p.y < floor) p.y = floor;
  }

  /**
   * Roll the camera a fraction of the boat's bank. `lookAt` has just reset the
   * roll to zero, so this is applied after it, about the view axis.
   */
  private applyBank(roll: number, dt: number): void {
    const target =
      this.reduceMotion || this.mode === 'orbit' || this.freeLook
        ? 0
        : roll * this.config.bankFollow;
    this.bank +=
      (target - this.bank) * (this.reduceMotion ? 1 : decay(this.config.rotationHalfLife, dt));
    if (Math.abs(this.bank) > 1e-5) {
      this.camera.rotateZ(this.bank);
    }
  }

  /** Place the camera immediately after a respawn. */
  snap(subPos: THREE.Vector3, yaw: number, pitch: number): void {
    this.bank = 0;
    this.update(subPos, yaw, pitch, 0);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Lerp factor giving an exponential decay with the given half-life. */
function decay(halfLife: number, dt: number): number {
  if (halfLife <= 0) return 1;
  return 1 - Math.pow(0.5, dt / halfLife);
}
