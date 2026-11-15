/** Chase, world-fixed free look, first-person and photo orbit camera. */

import * as THREE from 'three';
import type { CameraConfig } from '../core/Config.js';
import type { HeightField } from './Submarine.js';

type CameraMode = 'chase' | 'first-person' | 'orbit';

/**
 * Photo-mode orbit radius limits (metres): close enough to fill the frame with
 * the hull, never so far that the subject is lost in the fog.
 */
export const PHOTO_ORBIT_MIN_M = 6;
export const PHOTO_ORBIT_MAX_M = 220;

/** Per-frame extras. All optional so a bare `update(pos, yaw, pitch, dt)` works. */
interface CameraUpdateOptions {
  /** Cosmetic bank angle of the boat (radians). */
  roll?: number;
  /** Boat velocity, used for speed-proportional look-ahead. */
  velocity?: THREE.Vector3;
}

/** Aim drop (m) at full chase-arm retraction on portrait phones. */
const PORTRAIT_RETRACTED_AIM_DROP_M = 30;

/** Seconds for the reveal's opening move (and the return to the chase view). */
const REVEAL_MOVE_S = 0.6;
/** Seconds over which a takeover during the opening move blends into the orbit. */
const REVEAL_TAKEOVER_S = 0.35;
/** Orbit easing toward the dragged angle, and how fast a fling dies out. */
const REVEAL_EASE_HALF_LIFE_S = 0.06;
const REVEAL_FLING_HALF_LIFE_S = 0.14;
/** Reveal orbit elevation limits (radians): a little below level, never overhead. */
export const REVEAL_MIN_ELEVATION = THREE.MathUtils.degToRad(-8);
export const REVEAL_MAX_ELEVATION = THREE.MathUtils.degToRad(70);
const REVEAL_TERRAIN_CLEARANCE_M = 4;

interface RevealShotInput {
  target: THREE.Vector3;
  /** Where the target sits on screen, in normalized device coordinates (0,0 = centre). */
  screen?: { x: number; y: number };
  distance: number;
  /** Zoom limits for player control (default 0.6x and 2.5x the distance). */
  minDistance?: number;
  maxDistance?: number;
  elevation: number;
  azimuth: number;
  sweep: number;
}

interface RevealUser {
  azimuth: number;
  elevation: number;
  distance: number;
  goalAzimuth: number;
  goalElevation: number;
  goalDistance: number;
  velAzimuth: number;
  velElevation: number;
  dragging: boolean;
  /** 0..1 blend from the pose at takeover (only below 1 when the move was cut short). */
  blend: number;
  fromPosition: THREE.Vector3;
  fromRotation: THREE.Quaternion;
}

interface RevealShot extends RevealShotInput {
  screen: { x: number; y: number };
  minDistance: number;
  maxDistance: number;
  elapsed: number;
  duration: number;
  returning: boolean;
  from: THREE.Vector3;
  rotation: THREE.Quaternion;
  user: RevealUser | null;
}

/**
 * Orient `camera` (no roll) so `target` projects to (`sx`, `sy`) in normalized
 * device coordinates. Exact for a perspective camera with world-up yaw/pitch.
 */
export function aimAtScreenPoint(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  sx: number,
  sy: number,
  euler = new THREE.Euler(0, 0, 0, 'YXZ'),
): void {
  const w = _aim.copy(target).sub(camera.position);
  const len = w.length();
  if (!(len > 1e-9)) return;
  w.divideScalar(len);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  // Direction to the target in camera space, before normalization.
  const cx = sx * tanV * camera.aspect;
  const cy = sy * tanV;
  const cz = -1;
  const cn = Math.hypot(cx, cy, cz);
  const ux = cx / cn;
  const uy = cy / cn;
  const uz = cz / cn;
  // Pitch: rotate (uy, uz) about X so its height matches the world direction.
  const r = Math.hypot(uy, uz);
  const phi = Math.atan2(uz, uy);
  const a = Math.acos(clamp(w.y / r, -1, 1));
  const wrap = (v: number): number => Math.atan2(Math.sin(v), Math.cos(v));
  const p1 = wrap(a - phi);
  const p2 = wrap(-a - phi);
  const pitch = Math.abs(p1) < Math.abs(p2) ? p1 : p2;
  // Yaw: turn the pitched vector's horizontal part onto the world direction.
  const z1 = uy * Math.sin(pitch) + uz * Math.cos(pitch);
  const yaw = Math.atan2(w.x, w.z) - Math.atan2(ux, z1);
  euler.set(pitch, yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}
const _aim = new THREE.Vector3();

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
  private chaseRadiusDefault: number;
  private chaseOffsetX = 0;
  private portraitChaseOffset: { x: number; y: number; radius?: number } | null = null;
  private chaseOffsetY = 0;

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

  private revealShot: RevealShot | null = null;

  beginReveal(shot: RevealShotInput): void {
    this.revealShot = {
      ...shot,
      screen: shot.screen ?? { x: 0, y: 0 },
      minDistance: shot.minDistance ?? shot.distance * 0.6,
      maxDistance: shot.maxDistance ?? shot.distance * 2.5,
      elapsed: 0,
      duration: 6,
      returning: false,
      from: this.camera.position.clone(),
      rotation: this.camera.quaternion.clone(),
      user: null,
    };
  }

  endReveal(): void {
    const shot = this.revealShot;
    if (!shot) return;
    shot.returning = true;
    shot.elapsed = 0;
    shot.from.copy(this.camera.position);
    shot.rotation.copy(this.camera.quaternion);
    if (this.reduceMotion) this.revealShot = null;
  }

  /** True once the player has taken the reveal camera (drag, pinch or wheel). */
  get revealUserControl(): boolean {
    return !!this.revealShot && !this.revealShot.returning && !!this.revealShot.user;
  }

  /**
   * Take the reveal camera from the authored move, starting from the shot's
   * current authored angle. A move still in progress yields: the camera eases
   * from wherever it is.
   */
  private revealTakeover(): RevealUser | null {
    const shot = this.revealShot;
    if (!shot || shot.returning) return null;
    if (shot.user) return shot.user;
    const azimuth = this.revealAuthoredAzimuth(shot);
    const elevation = clamp(shot.elevation, REVEAL_MIN_ELEVATION, REVEAL_MAX_ELEVATION);
    const distance = clamp(shot.distance, shot.minDistance, shot.maxDistance);
    const settled = this.reduceMotion || shot.elapsed >= REVEAL_MOVE_S;
    shot.user = {
      azimuth,
      elevation,
      distance,
      goalAzimuth: azimuth,
      goalElevation: elevation,
      goalDistance: distance,
      velAzimuth: 0,
      velElevation: 0,
      dragging: false,
      blend: settled ? 1 : 0,
      fromPosition: this.camera.position.clone(),
      fromRotation: this.camera.quaternion.clone(),
    };
    return shot.user;
  }

  /**
   * Finish the opening move now (the authored framing, for the journal still),
   * before the player's first gesture takes the camera.
   */
  revealSettle(): void {
    const shot = this.revealShot;
    if (shot && !shot.returning && !shot.user) shot.elapsed = Math.max(shot.elapsed, REVEAL_MOVE_S);
  }

  /** Drag on the view during a reveal: orbit the subject (radians). */
  revealOrbit(dAzimuth: number, dElevation: number): boolean {
    const user = this.revealTakeover();
    if (!user) return false;
    user.dragging = true;
    user.velAzimuth = 0;
    user.velElevation = 0;
    user.goalAzimuth += dAzimuth;
    user.goalElevation = clamp(
      user.goalElevation + dElevation,
      REVEAL_MIN_ELEVATION,
      REVEAL_MAX_ELEVATION,
    );
    return true;
  }

  /** Finger lifted: keep turning at `vAzimuth`/`vElevation` (rad/s), decaying quickly. */
  revealRelease(vAzimuth = 0, vElevation = 0): void {
    const user = this.revealShot?.user;
    if (!user || this.revealShot!.returning) return;
    user.dragging = false;
    const cap = 6;
    user.velAzimuth = clamp(vAzimuth, -cap, cap);
    user.velElevation = clamp(vElevation, -cap, cap);
  }

  /** Pinch / wheel during a reveal: multiply the distance (clamped to the shot's limits). */
  revealZoom(factor: number): boolean {
    if (!(factor > 0) || !Number.isFinite(factor)) return false;
    const user = this.revealTakeover();
    if (!user) return false;
    const shot = this.revealShot!;
    user.goalDistance = clamp(user.goalDistance * factor, shot.minDistance, shot.maxDistance);
    return true;
  }

  private revealAuthoredAzimuth(shot: RevealShot): number {
    return (
      shot.azimuth +
      (this.reduceMotion ? 0 : shot.sweep * Math.min(1, shot.elapsed / shot.duration))
    );
  }

  get revealReturning(): boolean {
    return this.revealShot?.returning ?? false;
  }

  setConfig(config: CameraConfig): void {
    this.config = config;
  }

  constructor(
    private config: CameraConfig,
    aspect: number,
    /** Optional: without it the camera simply does not collide with the seabed. */
    private readonly terrain: HeightField | null = null,
  ) {
    this.camera = new THREE.PerspectiveCamera(config.fovDeg, aspect, config.near, config.far);
    this.camera.name = 'mainCamera';
    this.orbitRadius = config.orbitRadius;
    this.chaseRadius = Math.hypot(config.chaseOffset.x, config.chaseOffset.y, config.chaseOffset.z);
    this.chaseRadiusDefault = this.chaseRadius;
    this.orbitElevation = config.orbitElevation;
    this.setAspect(aspect);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    // Preserve at least the configured horizontal field of view on portrait
    // screens. A fixed vertical FOV crops the close chase hull on narrow phones.
    this.camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(Math.tan(THREE.MathUtils.degToRad(this.config.fovDeg / 2)) / Math.min(1, aspect)),
    );
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
    const back =
      this.mode === 'first-person'
        ? this.camera.getWorldDirection(this.offset).negate()
        : this.offset.copy(this.camera.position).sub(target).normalize();
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

  /** Set the reset distance and framing; portrait offsets also survive rotation/reset. */
  setChaseRadiusDefault(
    radius = Math.hypot(
      this.config.chaseOffset.x,
      this.config.chaseOffset.y,
      this.config.chaseOffset.z,
    ),
    offsetX = 0,
    offsetY = 0,
    portraitOffset?: { x: number; y: number; radius?: number },
  ): void {
    this.chaseRadiusDefault = radius;
    this.chaseRadius = radius;
    this.chaseOffsetX = offsetX;
    this.portraitChaseOffset = portraitOffset ?? null;
    this.chaseOffsetY = offsetY;
  }

  /** Return to this dive's chase view and zoom. */
  resetView(): void {
    this.freeLook = false;
    this.lookAzimuth = 0;
    this.lookElevation = 0;
    this.pendingLookAzimuth = 0;
    this.pendingLookElevation = 0;
    this.freeLookTargetOffset.set(0, 0, 0);
    this.freeLookAimElapsed = 0;
    this.chaseRadius = this.chaseRadiusDefault;
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
    if (this.revealShot && !this.revealShot.returning) {
      this.updateReveal(dt);
      return;
    }
    const revealDt = dt;
    if (this.revealShot) dt = 0;
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
            .multiplyScalar(this.chaseViewRadius());
        } else {
          const portrait = this.camera.aspect < 1 ? this.portraitChaseOffset : null;
          this.offset.x += portrait?.x ?? this.chaseOffsetX;
          this.offset.y += portrait?.y ?? this.chaseOffsetY;
          this.offset.multiplyScalar(this.chaseViewRadius() / this.offset.length());
          this.offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
        }
      } else {
        this.offset
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lookAzimuth)
          .applyQuaternion(this.quat);
      }
      // Retract the whole chase arm as the boat rises, before resolving the
      // terrain. This keeps the view underwater without flattening its angle.
      if (this.mode === 'chase' && subPos.y < 0 && this.offset.y > 0) {
        this.offset.multiplyScalar(clamp((-c.surfaceClearance - subPos.y) / this.offset.y, 0, 1));
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
          .add(this.desiredPosition);
      }
    }

    // Pointer motion is already a direct angular delta. Follow and aim move
    // with it on this frame so no camera travel remains after release.
    this.camera.position.copy(this.desiredPosition);
    this.currentTarget.copy(this.desiredTarget);

    this.clampToTerrain(subPos);
    // Keep first-person aim relative to the eye when clearance translates it.
    if (this.mode === 'first-person')
      this.currentTarget.add(this.camera.position).sub(this.desiredPosition);
    // Tall portrait frames: when the surface or terrain shortens the chase arm, the hull sits
    // low in a close view and ends up under the phone tutorial card.
    // Aim lower in proportion to the lost arm so the hull rides up the frame.
    if (this.mode === 'chase' && !this.freeLook && this.camera.aspect < 0.7) {
      const wanted = this.chaseViewRadius();
      const lost =
        wanted > 0 ? 1 - Math.min(1, this.camera.position.distanceTo(subPos) / wanted) : 0;
      this.currentTarget.y -= lost * PORTRAIT_RETRACTED_AIM_DROP_M;
    }
    this.camera.lookAt(this.currentTarget);
    this.applyBank(opts.roll ?? 0, dt);
    this.updateReveal(revealDt);
  }

  private updateReveal(dt: number): void {
    const shot = this.revealShot;
    if (!shot) return;
    shot.elapsed += Math.max(0, dt);
    const t = Math.min(1, shot.elapsed / REVEAL_MOVE_S);
    const eased = this.reduceMotion ? 1 : t * t * (3 - 2 * t);
    if (shot.returning) {
      this.camera.position.lerpVectors(shot.from, this.camera.position.clone(), eased);
      this.camera.quaternion.slerpQuaternions(shot.rotation, this.camera.quaternion.clone(), eased);
      if (t >= 1) this.revealShot = null;
      this.liftAboveTerrain();
      return;
    }
    const user = shot.user;
    if (user) {
      const step = Math.max(0, dt);
      if (!user.dragging) {
        user.goalAzimuth += user.velAzimuth * step;
        user.goalElevation = clamp(
          user.goalElevation + user.velElevation * step,
          REVEAL_MIN_ELEVATION,
          REVEAL_MAX_ELEVATION,
        );
        const fade = 1 - decay(REVEAL_FLING_HALF_LIFE_S, step);
        user.velAzimuth *= fade;
        user.velElevation *= fade;
      }
      const k = this.reduceMotion ? 1 : decay(REVEAL_EASE_HALF_LIFE_S, step);
      user.azimuth += (user.goalAzimuth - user.azimuth) * k;
      user.elevation += (user.goalElevation - user.elevation) * k;
      user.distance += (user.goalDistance - user.distance) * k;
      const raised = this.placeRevealCamera(
        shot,
        user.azimuth,
        user.elevation,
        user.distance,
        true,
      );
      // Terrain lifted the eye: adopt that elevation so dragging up has no dead zone.
      const lifted = raised ? this.revealLiftedElevation(shot, user.distance) : -Infinity;
      if (lifted > user.goalElevation) {
        user.goalElevation = Math.min(lifted, REVEAL_MAX_ELEVATION);
        user.elevation = Math.max(user.elevation, user.goalElevation);
        user.velElevation = Math.max(0, user.velElevation);
      }
      if (user.blend < 1) {
        user.blend = Math.min(1, user.blend + step / REVEAL_TAKEOVER_S);
        const b = user.blend * user.blend * (3 - 2 * user.blend);
        const rotation = this.camera.quaternion.clone();
        this.camera.position.lerpVectors(user.fromPosition, this.camera.position.clone(), b);
        this.camera.quaternion.slerpQuaternions(user.fromRotation, rotation, b);
      }
    } else {
      this.placeRevealCamera(shot, this.revealAuthoredAzimuth(shot), shot.elevation, shot.distance);
      const rotation = this.camera.quaternion.clone();
      this.camera.position.lerpVectors(shot.from, this.camera.position.clone(), eased);
      this.camera.quaternion.slerpQuaternions(shot.rotation, rotation, eased);
    }
    this.liftAboveTerrain();
  }

  /** Elevation of the camera as placed, relative to the reveal target. */
  private revealLiftedElevation(shot: RevealShot, distance: number): number {
    return Math.asin(
      clamp((this.camera.position.y - shot.target.y) / Math.max(distance, 1e-6), -1, 1),
    );
  }

  /**
   * Put the camera on the reveal sphere and aim so the target lands at the
   * shot's screen point (the middle of the area the card leaves clear).
   */
  private placeRevealCamera(
    shot: RevealShot,
    azimuth: number,
    elevation: number,
    distance: number,
    clearArm = false,
  ): boolean {
    const p = this.camera.position;
    const ce = Math.cos(elevation);
    p.set(Math.sin(azimuth) * ce, Math.sin(elevation), Math.cos(azimuth) * ce)
      .multiplyScalar(distance)
      .add(shot.target);
    let raised = false;
    if (this.terrain) {
      // The eye, and (while orbiting) the line of sight, stay above the seabed.
      let y = this.terrain.sampleHeight(p.x, p.z) + REVEAL_TERRAIN_CLEARANCE_M;
      if (clearArm) {
        for (let i = 4; i < 10; i++) {
          const f = i / 10;
          const h =
            this.terrain.sampleHeight(
              shot.target.x + (p.x - shot.target.x) * f,
              shot.target.z + (p.z - shot.target.z) * f,
            ) + REVEAL_TERRAIN_CLEARANCE_M;
          if (h > shot.target.y) y = Math.max(y, shot.target.y + (h - shot.target.y) / f);
        }
      }
      raised = y > p.y;
      p.y = Math.max(p.y, y);
    }
    aimAtScreenPoint(this.camera, shot.target, shot.screen.x, shot.screen.y, this.euler);
    return raised;
  }

  private liftAboveTerrain(): void {
    if (!this.terrain) return;
    const p = this.camera.position;
    p.y = Math.max(p.y, this.terrain.sampleHeight(p.x, p.z) + REVEAL_TERRAIN_CLEARANCE_M);
  }

  /** Portrait can keep a close authored view while sharing desktop's zoom/reset state. */
  private chaseViewRadius(): number {
    const portraitRadius = this.camera.aspect < 1 ? this.portraitChaseOffset?.radius : undefined;
    return (
      this.chaseRadius * ((portraitRadius ?? this.chaseRadiusDefault) / this.chaseRadiusDefault)
    );
  }

  /** Never let the camera sit inside (or below) the seabed. */
  private clampToTerrain(subPos: THREE.Vector3): void {
    const p = this.camera.position;
    const ceiling = subPos.y < 0 ? -this.config.surfaceClearance : Infinity;
    // A clear eye alone can still leave the chase arm crossing a submerged
    // ridge. Retract at the first obstruction along the actual arm, including
    // reefs that leave no room below the surface. Refine the boundary so the
    // view stays continuous while turning and ascending on steep banks.
    if (this.terrain && Number.isFinite(ceiling)) {
      const dx = p.x - subPos.x;
      const dz = p.z - subPos.z;
      const dy = p.y - subPos.y;
      // An invalid anchor (e.g. a debug teleport below the floor) has no clear
      // arm to retract. Let the existing eye-height clamp recover that pose.
      const checkArm =
        this.mode === 'chase' &&
        this.terrain.sampleHeight(subPos.x, subPos.z) + this.config.terrainClearance <= subPos.y;
      const fits = (t: number): boolean =>
        this.terrain!.sampleHeight(subPos.x + dx * t, subPos.z + dz * t) +
          this.config.terrainClearance <=
        (checkArm ? Math.min(ceiling, subPos.y + dy * t) : ceiling);
      for (let i = 1; i <= 24; i++) {
        if (fits(i / 24)) continue;
        let lo = (i - 1) / 24;
        let hi = i / 24;
        for (let j = 0; j < 16; j++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid;
          else hi = mid;
        }
        p.set(subPos.x + dx * lo, subPos.y + dy * lo, subPos.z + dz * lo);
        break;
      }
    }
    const floor = this.terrain
      ? this.terrain.sampleHeight(p.x, p.z) + this.config.terrainClearance
      : -Infinity;
    p.y = Math.max(floor, Math.min(p.y, ceiling));
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
