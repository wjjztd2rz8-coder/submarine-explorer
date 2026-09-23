/**
 * Arcade submarine physics ("6-DOF-ish": full 3D translation, yaw + pitch, plus
 * a purely cosmetic bank roll).
 *
 * Integrated at a FIXED 60 Hz from main.ts so behaviour is deterministic.
 * The model is deliberately simple and readable rather than hydrodynamically
 * correct:
 *
 *   thrust      along the boat's forward axis, through a `thrustCurve` response
 *               so small stick deflections give fine station-keeping control
 *   rotation    yaw and pitch have their own angular velocity with acceleration
 *               and damping, so the boat has rotational inertia instead of
 *               snapping to the stick
 *   ballast     a world-vertical acceleration (how a real sub changes depth),
 *               lagged by `ballastHalfLife` because the tanks take time to fill
 *   buoyancy    a small constant upward bias plus a trim term that bleeds off
 *               residual vertical speed, so "hands off" hovers
 *   drag        a_drag = -(k1 + k2*|v|) * v  -- linear + quadratic, so speed has
 *               a true terminal value
 *   collision   sphere-vs-heightfield: if the hull dips below the seabed plus a
 *               clearance, push straight out along the terrain normal, bleed
 *               speed, and record a hull-stress spike
 *   crush       past `crushDepth` the hull fails: an emergency blow fires, the
 *               pilot's controls lock out for a few seconds and the boat rises
 *               on its own. There is no game-over; the mission layer decides.
 *
 * Nothing here imports Three.js beyond the vector type, and Terrain is accessed
 * through a narrow interface, so the physics is unit-testable headlessly.
 */

import * as THREE from 'three';
import type { SubmarineConfig } from '../core/Config.js';
import type { InputState } from '../core/Input.js';

/** The only thing the physics needs from the world. */
export interface HeightField {
  sampleHeight(x: number, z: number): number;
  getNormal(x: number, z: number, out?: THREE.Vector3): THREE.Vector3;
}

export interface SubmarineState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Radians. Yaw is measured about +Y; 0 faces north (-Z). */
  yaw: number;
  pitch: number;
  /** Cosmetic bank angle (radians). Physics never reads it. */
  roll: number;
  /** Metres below sea level, always <= 0 underwater. */
  depth: number;
  /** Metres between the hull and the seabed directly below. */
  altitude: number;
  /** Compass heading in degrees, 0 = north. */
  headingDeg: number;
  /** Speed in m/s. */
  speed: number;
  /** depth / crushDepth, clamped to [0,1]; 1 means the hull has failed. */
  crushRatio: number;
  crushWarning: boolean;
  hullBreached: boolean;
  /** True on the step the hull touched bottom. */
  touchedBottom: boolean;
  /** Impact speed of the collision on this step (m/s), else 0. */
  impactSpeed: number;
  /**
   * Combined hull stress, 0..1. The larger of a decaying impact spike and the
   * steady pressure load above `crushWarnRatio`. Drives camera shake, the HUD
   * gauge and the creak/groan audio cues.
   */
  hullStress: number;
  /** True while the emergency blow is running and the controls are locked. */
  emergencyBlow: boolean;
  /** Seconds of control lockout left, 0 when the pilot is in charge. */
  controlLockRemaining: number;
  /** The active sim-speed multiplier (1, 2 or 3). */
  simSpeed: number;
  /** Which entry of `config.hullClasses` is fitted. */
  hullClass: string;
  crushDepth: number;
}

/** Zero input, used when the controls are locked out. */
const LOCKED_INPUT: InputState = Object.freeze({
  throttle: 0,
  yaw: 0,
  pitch: 0,
  ballast: 0,
  lookDx: 0,
  lookDy: 0,
  toggleCamera: false,
  toggleSonar: false,
  boost: false,
  toggleLights: false,
  ping: false,
  scan: false,
  cycleSimSpeed: false,
  togglePhotoMode: false,
}) as InputState;

export class Submarine {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  /** Visual-only bank. Read by SubMesh / CameraRig; never fed back into physics. */
  roll = 0;

  hullBreached = false;
  touchedBottom = false;
  impactSpeed = 0;

  /**
   * Combined hull stress, 0..1: the larger of the decaying impact spike and the
   * steady pressure load. A getter so it is correct the instant the boat is
   * teleported to depth, without waiting for a physics step.
   */
  get hullStress(): number {
    return Math.max(this.impactStress, this.pressureStress());
  }

  /** Physics steps run per call to {@link step}. 1, 2 or 3. */
  private simSpeedIndex: number;
  private crushDepth: number;
  private hullClassId: string;

  private yawRate = 0;
  private pitchRate = 0;
  private ballastCmd = 0;
  private impactStress = 0;
  private controlLock = 0;
  private emergencyBlowActive = false;

  private readonly forward = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly config: SubmarineConfig,
    private readonly terrain: HeightField,
  ) {
    this.simSpeedIndex = clamp(
      config.defaultSimSpeedIndex ?? 0,
      0,
      Math.max(0, (config.simSpeeds?.length ?? 1) - 1),
    );
    this.hullClassId = config.hullClass;
    this.crushDepth = this.resolveCrushDepth(config.hullClass);
  }

  private resolveCrushDepth(classId: string): number {
    // `crushDepth` stays the authority when no matching class is configured, so
    // a test or a mission can set a bare number without inventing a hull class.
    return this.config.hullClasses?.[classId]?.crushDepth ?? this.config.crushDepth;
  }

  /** Fit a different hull. Unknown ids are ignored. */
  setHullClass(classId: string): boolean {
    if (!this.config.hullClasses?.[classId]) return false;
    this.hullClassId = classId;
    this.crushDepth = this.resolveCrushDepth(classId);
    return true;
  }

  getCrushDepth(): number {
    return this.crushDepth;
  }

  /** The active multiplier (1, 2 or 3). */
  get simSpeed(): number {
    return this.config.simSpeeds?.[this.simSpeedIndex] ?? 1;
  }

  /** Advance to the next sim speed and return it. */
  cycleSimSpeed(): number {
    const n = this.config.simSpeeds?.length ?? 1;
    this.simSpeedIndex = (this.simSpeedIndex + 1) % n;
    return this.simSpeed;
  }

  setSimSpeed(multiplier: number): number {
    const i = this.config.simSpeeds?.indexOf(multiplier) ?? -1;
    if (i >= 0) this.simSpeedIndex = i;
    return this.simSpeed;
  }

  /** Place the boat and zero its motion. */
  reset(x: number, y: number, z: number, yaw = 0): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.roll = 0;
    this.yawRate = 0;
    this.pitchRate = 0;
    this.ballastCmd = 0;
    this.hullBreached = false;
    this.touchedBottom = false;
    this.impactSpeed = 0;
    this.impactStress = 0;
    this.controlLock = 0;
    this.emergencyBlowActive = false;
  }

  /** Unit forward vector in world space. +Z is south, so yaw 0 faces north. */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  /**
   * Advance the simulation. `dt` is one fixed tick (1/60 s); the sim-speed
   * multiplier runs that many *whole* ticks, so raising it speeds the world up
   * without changing the integrator's step size or its stability.
   */
  step(input: InputState, dt: number): void {
    this.touchedBottom = false;
    this.impactSpeed = 0;
    const n = this.simSpeed;
    for (let i = 0; i < n; i++) this.stepOnce(input, dt);
  }

  /** One 1/60 s tick. */
  private stepOnce(input: InputState, dt: number): void {
    const c = this.config;

    // --- control lockout ----------------------------------------------------
    if (this.controlLock > 0) {
      this.controlLock -= dt;
      // Snap to zero: repeated float subtraction leaves a 1e-14 tail that would
      // otherwise read as "still locked" to the HUD.
      if (this.controlLock < 1e-9) {
        this.controlLock = 0;
        this.emergencyBlowActive = false;
      }
    }
    const cmd = this.emergencyBlowActive ? LOCKED_INPUT : input;

    // --- orientation --------------------------------------------------------
    // Angular velocity with acceleration + damping: at a held stick the rate
    // converges on `yawRate`, and letting go coasts to a stop over ~1/damping s.
    // Spinning up uses `*Accel`; coasting back to zero once the stick is
    // centred uses `*Damping`, so "how fast it responds" and "how long it
    // carries" are separately tunable.
    // QA-B #15: at 2x/3x this tick runs 2-3 times per frame, so scale the
    // stick down by the multiplier and the boat still turns at its 1x real
    // rate (translation keeps the full speed-up). `simSpeedScalesTurnRate`
    // restores the Phase A behaviour.
    const turnScale = this.turnScale();
    const yawTarget = clamp(cmd.yaw, -1, 1) * c.yawRate * turnScale;
    const pitchTarget = clamp(cmd.pitch, -1, 1) * c.pitchRate * turnScale;
    const kYaw = Math.abs(yawTarget) > 1e-6 ? c.yawAccel : c.yawDamping;
    const kPitch = Math.abs(pitchTarget) > 1e-6 ? c.pitchAccel : c.pitchDamping;
    this.yawRate += (yawTarget - this.yawRate) * Math.min(1, kYaw * dt);
    this.pitchRate += (pitchTarget - this.pitchRate) * Math.min(1, kPitch * dt);

    this.yaw = wrapPi(this.yaw + this.yawRate * dt);
    this.pitch = clamp(this.pitch + this.pitchRate * dt, -c.maxPitch, c.maxPitch);
    // A pitch clamp must also kill the rate, or the boat "sticks" at the limit
    // and then lurches the instant you reverse the stick.
    if (this.pitch === c.maxPitch && this.pitchRate > 0) this.pitchRate = 0;
    if (this.pitch === -c.maxPitch && this.pitchRate < 0) this.pitchRate = 0;

    const fwd = this.getForward(this.forward);

    // --- bank (visual only) -------------------------------------------------
    // Roll into the turn, in proportion to how fast you are actually going: a
    // stationary boat pivoting on the spot should not lean.
    const speedNow = this.velocity.length();
    const bankTarget =
      -(this.yawRate / Math.max(1e-6, c.yawRate * turnScale)) *
      c.maxBankAngle *
      clamp(speedNow / Math.max(1e-6, c.bankFullSpeed), 0, 1);
    this.roll += (bankTarget - this.roll) * decay(c.bankHalfLife, dt);

    // --- accelerations ------------------------------------------------------
    const throttle = curve(clamp(cmd.throttle, -1, 1), c.thrustCurve);
    const boost = cmd.boost ? c.boostMultiplier : 1;
    const accelMag = (throttle >= 0 ? throttle * c.thrustAccel : throttle * c.reverseAccel) * boost;
    const a = this.tmp.copy(fwd).multiplyScalar(accelMag);

    // Ballast lags the stick (the tanks take time to flood or blow).
    const ballastTarget = clamp(cmd.ballast, -1, 1);
    this.ballastCmd += (ballastTarget - this.ballastCmd) * decay(c.ballastHalfLife, dt);
    a.y += c.buoyancyAccel + this.ballastCmd * c.ballastAccel;

    // Neutral-buoyancy trim: with the ballast stick centred the boat actively
    // resists residual vertical drift, which is what makes hovering possible.
    if (c.trimStrength > 0) {
      const centred = 1 - Math.min(1, Math.abs(ballastTarget) * 4);
      if (centred > 0) a.y -= this.velocity.y * c.trimStrength * centred;
    }

    if (this.emergencyBlowActive) a.y += c.emergencyBlowAccel;

    // Drag opposes velocity: linear term dominates at low speed, quadratic at high.
    const v = this.velocity;
    const speed = v.length();
    if (speed > 1e-6) {
      const k = c.dragLinear + c.dragQuadratic * speed;
      a.x -= k * v.x;
      a.y -= k * v.y * c.verticalDragScale;
      a.z -= k * v.z;
    }

    // Semi-implicit Euler: update velocity first, then integrate position with
    // the new velocity. Stable for this kind of damped system.
    v.addScaledVector(a, dt);
    const newSpeed = v.length();
    if (newSpeed > c.maxSpeed) v.multiplyScalar(c.maxSpeed / newSpeed);
    this.position.addScaledVector(v, dt);

    // --- constraints --------------------------------------------------------
    // Seabed first, surface last (QA-B #3): the surface clamp used to run
    // first, so in water shallower than ~20 m the push-out then lifted the
    // hull clean out of the sea. The floor is relaxed in shallow water (see
    // floorFor), and the surface ceiling never pushes the hull into rock.
    const ground = this.terrain.sampleHeight(this.position.x, this.position.z);
    const floor = this.floorFor(ground);
    this.resolveTerrain(floor);
    // Never breach the surface: the conning tower stops at sea level -- unless
    // the water is too shallow to float the hull at all, then it sits aground.
    const ceiling = Math.max(-c.hullRadius, floor);
    if (this.position.y > ceiling) {
      this.position.y = ceiling;
      if (v.y > 0) v.y = 0;
    }

    // --- hull integrity -----------------------------------------------------
    this.impactStress *= Math.pow(0.5, dt / Math.max(1e-6, c.hullStressHalfLife));

    if (this.position.y <= this.crushDepth) {
      this.hullBreached = true;
      if (!this.emergencyBlowActive) {
        this.emergencyBlowActive = true;
        this.controlLock = c.emergencyBlowLockSeconds;
      }
    }
  }

  /** Steady load from being near (or past) the crush depth, 0..1. */
  private pressureStress(): number {
    const c = this.config;
    const ratio = clamp(this.position.y / this.crushDepth, 0, 1);
    const w = c.crushWarnRatio;
    if (ratio <= w) return 0;
    return clamp((ratio - w) / Math.max(1e-6, 1 - w), 0, 1);
  }

  /** 1, or 1/simSpeed when the turn rate is held at the 1x real rate. */
  private turnScale(): number {
    if (this.config.simSpeedScalesTurnRate) return 1;
    return 1 / Math.max(1, this.simSpeed);
  }

  /**
   * Lowest hull-centre Y allowed over a seabed at `ground`. Normally
   * `ground + hullRadius + seabedClearance`; where that would be above the
   * surface ceiling (-hullRadius), the clearance gives way first, so the boat
   * stays submerged whenever the hull physically fits (`ground + hullRadius`
   * <= -hullRadius). Continuous in `ground`, so there is no step to snag on.
   */
  floorFor(ground: number): number {
    const c = this.config;
    const full = ground + c.hullRadius + c.seabedClearance;
    if (full <= -c.hullRadius) return full;
    return Math.max(ground + c.hullRadius, -c.hullRadius);
  }

  /** Push the hull out of the seabed and bleed speed if it hit. */
  private resolveTerrain(floor: number): void {
    const c = this.config;
    if (this.position.y >= floor) return;

    const n = this.terrain.getNormal(this.position.x, this.position.z, this.normal);
    const penetration = floor - this.position.y;
    // Push out along the surface normal rather than straight up, so a sloping
    // wall deflects the boat sideways instead of trapping it.
    this.position.addScaledVector(n, penetration);

    // Remove the into-surface component of velocity, then apply a speed penalty.
    const into = this.velocity.dot(n);
    // The closing speed along the normal is what bends plating, not the total
    // speed: grazing a wall at 6 m/s is not the same as flying into it.
    const closing = into < 0 ? -into : 0;
    if (into < 0) this.velocity.addScaledVector(n, -into);
    this.velocity.multiplyScalar(1 - c.collisionSpeedPenalty);
    this.touchedBottom = true;
    this.impactSpeed = Math.max(this.impactSpeed, closing);
    const spike = clamp(closing / Math.max(1e-6, c.impactStressSpeed), 0, 1);
    if (spike > this.impactStress) this.impactStress = spike;
  }

  /** Snapshot of everything the UI needs. Allocates; call once per frame. */
  getState(): SubmarineState {
    const c = this.config;
    const depth = this.position.y;
    const ground = this.terrain.sampleHeight(this.position.x, this.position.z);
    const crushRatio = clamp(depth / this.crushDepth, 0, 1);
    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      yaw: this.yaw,
      pitch: this.pitch,
      roll: this.roll,
      depth,
      altitude: depth - ground,
      headingDeg: ((((this.yaw * 180) / Math.PI) % 360) + 360) % 360,
      speed: this.velocity.length(),
      crushRatio,
      crushWarning: crushRatio >= c.crushWarnRatio,
      hullBreached: this.hullBreached,
      touchedBottom: this.touchedBottom,
      impactSpeed: this.impactSpeed,
      hullStress: this.hullStress,
      emergencyBlow: this.emergencyBlowActive,
      controlLockRemaining: this.controlLock,
      simSpeed: this.simSpeed,
      hullClass: this.hullClassId,
      crushDepth: this.crushDepth,
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Sign-preserving power curve: `curve(1, n) === 1` for every n. */
function curve(v: number, exponent: number): number {
  if (exponent === 1) return v;
  return Math.sign(v) * Math.pow(Math.abs(v), exponent);
}

/** Lerp factor giving an exponential decay with the given half-life. */
function decay(halfLife: number, dt: number): number {
  if (halfLife <= 0) return 1;
  return 1 - Math.pow(0.5, dt / halfLife);
}

/** Wrap an angle to (-PI, PI]. */
function wrapPi(a: number): number {
  const twoPi = Math.PI * 2;
  let x = (a + Math.PI) % twoPi;
  if (x < 0) x += twoPi;
  return x - Math.PI;
}
