/**
 * Camera rig: a smoothed chase camera, a first-person viewport, and a free
 * orbit mode that photo mode hangs off.
 *
 * Smoothing is frame-rate independent (exponential decay expressed as a
 * half-life), so the feel does not change between 30 and 144 fps.
 *
 * Two things stop the camera ruining the shot:
 *  - **Terrain collision.** The camera is lifted to stay `terrainClearance`
 *    metres above the seabed, so flying low never puts the view inside rock.
 *  - **Shake.** Hull stress displaces the camera on a decaying oscillation.
 *    `reduceMotion` disables it, and the banking follow, outright (C5).
 *
 * And one thing stops the boat ruining the shot (QA-B #6): with a scan target
 * in range (`CameraUpdateOptions.focus`), the chase camera slides sideways, to
 * the target's side, and up, and pulls its aim part-way toward the target, so
 * the line of sight to the wreck clears the hull instead of running through
 * it. The blend in and out is smoothed with `focusHalfLife`.
 */

import * as THREE from 'three';
import type { CameraConfig } from '../core/Config.js';
import type { HeightField } from './Submarine.js';

export type CameraMode = 'chase' | 'first-person' | 'orbit';

/** Per-frame extras. All optional so a bare `update(pos, yaw, pitch, dt)` works. */
export interface CameraUpdateOptions {
  /** Cosmetic bank angle of the boat (radians). */
  roll?: number;
  /** Boat velocity, used for speed-proportional look-ahead. */
  velocity?: THREE.Vector3;
  /** Hull stress 0..1. Anything above the previous peak re-triggers the shake. */
  hullStress?: number;
  /**
   * A scan target in range (world position), or null/undefined for none. In
   * chase mode the camera is offset so the boat does not hide it.
   */
  focus?: THREE.Vector3 | null;
}

/**
 * Which side (+1 starboard, -1 port) the chase camera slides to for a focus
 * target `lateralM` metres to starboard of the boat's axis. Keeps `prevSide`
 * unless the target is clearly (more than `hysteresisM`) on the other side,
 * so a target dead ahead does not make the camera flip-flop.
 */
export function chooseFocusSide(lateralM: number, prevSide: 1 | -1, hysteresisM: number): 1 | -1 {
  if (lateralM > hysteresisM) return 1;
  if (lateralM < -hysteresisM) return -1;
  return prevSide;
}

/** Chase offset (boat frame) with the focus framing blended in by `weight` (0..1). */
export function focusedChaseOffset(
  c: Pick<CameraConfig, 'chaseOffset' | 'focusSideM' | 'focusRaiseM'>,
  weight: number,
  side: 1 | -1,
  out: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
): { x: number; y: number; z: number } {
  const w = clamp(weight, 0, 1);
  out.x = c.chaseOffset.x + w * side * c.focusSideM;
  out.y = c.chaseOffset.y + w * c.focusRaiseM;
  out.z = c.chaseOffset.z;
  return out;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  mode: CameraMode = 'chase';
  /** Accessibility: kill camera shake and banking follow. */
  reduceMotion = false;

  /** Free-orbit state, driven by `orbit()` from a photo-mode UI. */
  orbitAzimuth = 0;
  orbitElevation: number;
  orbitRadius: number;

  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();
  private readonly currentTarget = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private readonly shakeOffset = new THREE.Vector3();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private initialised = false;

  private shake = 0;
  private shakePhase = 0;
  private bank = 0;
  /** 0..1 blend of the scan-target framing (QA-B #6), and the side it uses. */
  focusWeight = 0;
  focusSide: 1 | -1 = 1;
  private readonly lastFocus = new THREE.Vector3();
  private hasFocus = false;
  private readonly chaseOffsetNow = { x: 0, y: 0, z: 0 };
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
    this.orbitElevation = config.orbitElevation;
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** The `C` key: swap between chase and the first-person viewport. */
  toggleMode(): CameraMode {
    if (this.mode === 'orbit') return this.setMode(this.modeBeforeOrbit);
    return this.setMode(this.mode === 'chase' ? 'first-person' : 'chase');
  }

  /** The `P` key: drop into free orbit and back out again. */
  togglePhotoMode(): CameraMode {
    if (this.mode === 'orbit') return this.setMode(this.modeBeforeOrbit);
    this.modeBeforeOrbit = this.mode;
    return this.setMode('orbit');
  }

  setMode(mode: CameraMode): CameraMode {
    if (mode !== this.mode) this.initialised = false; // snap rather than sweep
    this.mode = mode;
    return this.mode;
  }

  /** Drag the free-orbit camera. Radians; no-op outside orbit mode. */
  orbit(dAzimuth: number, dElevation: number, dRadius = 0): void {
    if (this.mode !== 'orbit') return;
    this.orbitAzimuth += dAzimuth;
    // Stop short of the poles so the up-vector never flips.
    this.orbitElevation = clamp(this.orbitElevation + dElevation, -1.4, 1.4);
    this.orbitRadius = clamp(this.orbitRadius * (1 + dRadius), 15, 4000);
  }

  /**
   * Kick the shake. Idempotent per frame: a stress level only re-triggers when
   * it exceeds what is already decaying, so a long scrape does not resonate.
   */
  addShake(stress: number): void {
    if (this.reduceMotion) return;
    if (stress > this.shake) this.shake = Math.min(1, stress);
  }

  /**
   * @param subPos  submarine position
   * @param yaw     submarine yaw (radians, 0 = north, +pi/2 = east: physics convention)
   * @param pitch   submarine pitch (radians)
   * @param dt      real frame delta in seconds
   * @param opts    roll / velocity / hull stress
   */
  update(
    subPos: THREE.Vector3,
    yaw: number,
    pitch: number,
    dt: number,
    opts: CameraUpdateOptions = {},
  ): void {
    const c = this.config;
    if (opts.hullStress !== undefined) this.addShake(opts.hullStress);

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
      this.updateFocus(subPos, yaw, dt, opts.focus ?? null);
      const o =
        this.mode === 'chase'
          ? focusedChaseOffset(c, this.focusWeight, this.focusSide, this.chaseOffsetNow)
          : c.firstPersonOffset;
      this.offset.set(o.x, o.y, o.z).applyQuaternion(this.quat);
      this.desiredPosition.copy(subPos).add(this.offset);

      // Look ahead of the boat rather than at it, which reads better in fog,
      // and further ahead the faster you are going.
      const base = this.mode === 'chase' ? c.chaseLookAhead : c.firstPersonLookAhead;
      this.desiredTarget
        .set(0, 0, -1)
        .applyQuaternion(this.quat)
        .multiplyScalar(base + speed * c.lookAheadPerSpeed)
        .add(subPos);
      if (this.mode === 'chase') {
        this.desiredTarget.y -= c.chaseLookDrop;
        if (this.hasFocus && this.focusWeight > 1e-4) {
          this.desiredTarget.lerp(this.lastFocus, clamp(c.focusLookBlend, 0, 1) * this.focusWeight);
        }
      }
    }

    // Orbit is a tripod, not a chase: it tracks exactly, so a drag moves the
    // view immediately instead of sliding after the pointer.
    if (!this.initialised || this.mode === 'orbit') {
      this.camera.position.copy(this.desiredPosition);
      this.currentTarget.copy(this.desiredTarget);
      this.initialised = true;
    } else {
      this.camera.position.lerp(this.desiredPosition, decay(c.positionHalfLife, dt));
      this.currentTarget.lerp(this.desiredTarget, decay(c.rotationHalfLife, dt));
    }

    this.applyShake(dt);
    this.clampToTerrain();
    this.camera.lookAt(this.currentTarget);
    this.applyBank(opts.roll ?? 0, dt);
  }

  /**
   * Blend the scan-target framing in (focus given, chase mode) or out. The
   * last focus position is kept so the aim eases back instead of snapping.
   */
  private updateFocus(
    subPos: THREE.Vector3,
    yaw: number,
    dt: number,
    focus: THREE.Vector3 | null,
  ): void {
    const c = this.config;
    const active = this.mode === 'chase' && focus !== null;
    if (active) {
      this.lastFocus.copy(focus);
      this.hasFocus = true;
      // Lateral offset of the target in the boat's (yaw-only) frame: +X is
      // starboard, i.e. (cos yaw, 0, sin yaw) with +yaw toward east.
      const lateral = (focus.x - subPos.x) * Math.cos(yaw) + (focus.z - subPos.z) * Math.sin(yaw);
      this.focusSide = chooseFocusSide(lateral, this.focusSide, c.focusSideHysteresisM);
    }
    const want = active ? 1 : 0;
    if (!this.initialised) this.focusWeight = want;
    else this.focusWeight += (want - this.focusWeight) * decay(c.focusHalfLife, dt);
    if (this.focusWeight < 1e-4 && !active) {
      this.focusWeight = 0;
      this.hasFocus = false;
    }
  }

  /** Decaying oscillation on two axes; not a random walk, so it reads as impact. */
  private applyShake(dt: number): void {
    if (this.shake <= 1e-4) {
      this.shake = 0;
      this.shakeOffset.set(0, 0, 0);
      return;
    }
    const c = this.config;
    this.shakePhase += dt * c.shakeFrequency * Math.PI * 2;
    const amp = this.shake * c.shakeAmplitude;
    this.shakeOffset.set(
      Math.sin(this.shakePhase) * amp,
      Math.sin(this.shakePhase * 1.7 + 1.1) * amp * 0.7,
      0,
    );
    this.camera.position.add(this.shakeOffset);
    this.shake *= Math.pow(0.5, dt / Math.max(1e-6, c.shakeHalfLife));
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
    const target = this.reduceMotion || this.mode === 'orbit' ? 0 : roll * this.config.bankFollow;
    this.bank += (target - this.bank) * decay(this.config.rotationHalfLife, dt);
    if (Math.abs(this.bank) > 1e-5) {
      this.camera.rotateZ(this.bank);
    }
  }

  /** Place the camera immediately, skipping the smoothing (e.g. after a respawn). */
  snap(subPos: THREE.Vector3, yaw: number, pitch: number): void {
    this.initialised = false;
    this.shake = 0;
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
