import { FIRST_MINUTE_GUIDANCE } from '../core/Config.js';

interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface Steering {
  throttle: number;
  yaw: number;
  ballast: number;
}

/** A commanded change of pose, rather than a key tap or ambient current drift. */
export class FirstMove {
  private origin: Pose | null = null;
  private commanded = false;
  moved = false;

  reset(pose: Pose): void {
    this.origin = { ...pose };
    this.commanded = false;
    this.moved = false;
  }

  /** Called only during unfrozen play. True once the pilot has moved or turned. */
  update(pose: Pose, steering: Steering): boolean {
    if (this.moved) return true;
    const commanding =
      Math.max(Math.abs(steering.throttle), Math.abs(steering.yaw), Math.abs(steering.ballast)) >
      FIRST_MINUTE_GUIDANCE.axisMin;
    // Anchor at the first command, so earlier idle drift cannot dismiss guidance.
    if (!this.origin || (!this.commanded && !commanding)) this.origin = { ...pose };
    this.commanded ||= commanding;
    if (!this.commanded) return false;
    const distance = Math.hypot(
      pose.x - this.origin.x,
      pose.y - this.origin.y,
      pose.z - this.origin.z,
    );
    const turn = Math.abs(
      Math.atan2(Math.sin(pose.yaw - this.origin.yaw), Math.cos(pose.yaw - this.origin.yaw)),
    );
    this.moved =
      distance >= FIRST_MINUTE_GUIDANCE.moveDistanceM || turn >= FIRST_MINUTE_GUIDANCE.turnRadians;
    return this.moved;
  }
}
