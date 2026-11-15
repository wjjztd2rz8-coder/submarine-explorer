/** Prop/game-loop glue stays separate so startup wiring remains small. */

import * as THREE from 'three';
import type { PropsConfig } from '../../core/Config.js';
import type { EventBus } from '../../core/EventBus.js';
import { latLonToWorld } from '../../util/geo.js';
import type { TileMeta } from '../../util/types.js';
import type { Props, PropsHeightField } from '../Props.js';

interface AtSpawn {
  lat: number;
  lon: number;
  headingDeg: number;
}

/** Parse `?at=lat,lon[,heading]`. Returns null when absent or malformed. */
export function parseAtParam(value: string | null): AtSpawn | null {
  if (!value) return null;
  const parts = value.split(',').map((s) => Number(s.trim()));
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lat, lon, heading = 0] = parts as [number, number, number?];
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon, headingDeg: heading };
}

/**
 * World pose for an `?at=` spawn: at `depthM` (positive) if given, but never
 * closer than `clearanceM` to the seabed; otherwise `clearanceM` above it.
 * `yaw` uses the submarine's convention (radians, 0 = north, +pi/2 = east).
 */
export function atSpawnPose(
  at: AtSpawn,
  meta: TileMeta,
  hf: PropsHeightField,
  depthM: number | null,
  clearanceM: number,
  hullRadius: number,
): { x: number; y: number; z: number; yaw: number } {
  const { x, z } = latLonToWorld(meta, at.lat, at.lon);
  const floor = hf.sampleHeight(x, z) + clearanceM;
  const y = Math.min(-hullRadius, depthM !== null ? Math.max(floor, -depthM) : floor);
  return { x, y, z, yaw: THREE.MathUtils.degToRad(at.headingDeg) };
}

/** The bits of the submarine collision needs (Submarine satisfies it). */
interface CollidingBody {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  getForward?(out?: THREE.Vector3): THREE.Vector3;
}

/**
 * Applies prop collision to the submarine once per frame, after the physics
 * steps: push-out, damp the into-surface velocity, and raise `sub:collided`
 * (rate-limited) so audio and HUD react as they do to seabed impacts.
 */
export class PropContact {
  private readonly normal = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly slide = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private cooldown = 0;
  /** True while touching a prop; for tests and the debug readout. */
  touching = false;
  /** True when driving forward into the current prop contact normal. */
  headOn = false;
  /** Last push normal from collide(); for guidance and tests. */
  readonly contactNormal = new THREE.Vector3();

  constructor(
    private readonly props: Props,
    private readonly bus: EventBus,
    private readonly cfg: PropsConfig,
    private readonly radius: number,
  ) {}

  resolve(body: CollidingBody, dt: number, throttle = 0): boolean {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.headOn = false;
    const hit = this.props.collide(body.position, this.radius, this.normal);
    this.contactNormal.copy(this.normal);
    if (hit) {
      const speed = body.velocity.length();
      const into = body.velocity.dot(this.normal);
      if (into < 0)
        body.velocity.addScaledVector(this.normal, -into * this.cfg.collisionVelocityDamping);
      if ((!this.touching || into < -0.5) && this.cooldown === 0) {
        this.cooldown = this.cfg.collisionEventCooldownS;
        this.bus.emit('sub:collided', { depth: body.position.y, speed });
      }
      this.deflectAlongSurface(body, throttle);
    }
    this.touching = hit;
    return hit;
  }

  /**
   * Classifies a contact as head-on when thrust pushes straight into a prop, so guidance can
   * tell the player to climb. It does not move the hull: an injected slide sent the sub up the
   * Blue Hole's wall to the surface, and the cue alone gets a player past towers and walls.
   */
  private deflectAlongSurface(body: CollidingBody, throttle: number): void {
    if (!body.getForward || throttle <= 0.05) return;
    const fwd = body.getForward(this.forward);
    const into = fwd.dot(this.normal);
    const horiz = Math.hypot(body.velocity.x, body.velocity.z);
    if (into < 0.2 && horiz > 2) return;
    this.slide.copy(fwd).addScaledVector(this.normal, -into);
    if (this.slide.lengthSq() < 0.04) {
      const nxz = new THREE.Vector3(this.normal.x, 0, this.normal.z);
      if (nxz.lengthSq() > 1e-6) {
        nxz.normalize();
        this.slide.crossVectors(this.up, nxz);
        if (this.slide.dot(fwd) < 0) this.slide.negate();
      } else {
        this.slide.set(1, 0, 0);
      }
      if (this.normal.y < 0.92) {
        const lateral = this.slide.clone();
        this.slide.set(0, 1, 0);
        if (lateral.lengthSq() > 1e-6) this.slide.addScaledVector(lateral.normalize(), 0.35);
      }
      this.headOn = true;
    } else {
      this.headOn = into > 0.65;
    }
  }
}
