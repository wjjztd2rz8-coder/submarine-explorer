/**
 * Submarine physics, hull classes and failure thresholds.
 * Split out of `core/Config.ts` (F0-CORE); import from `core/Config.js`.
 */

export interface SubmarineConfig {
  /** Forward thrust acceleration at full throttle (m/s^2). */
  thrustAccel: number;
  /** Reverse is deliberately weaker. */
  reverseAccel: number;
  /** Vertical acceleration available from the ballast system (m/s^2). */
  ballastAccel: number;
  /** Yaw / pitch rate at full input (rad/s). */
  yawRate: number;
  pitchRate: number;
  /** Hard clamp on pitch so the sub can never flip (radians). */
  maxPitch: number;
  /**
   * Quadratic drag coefficient k in `a_drag = -k * |v| * v` (1/m).
   * Terminal speed under thrust T is sqrt(T / k).
   */
  dragLinear: number;
  dragQuadratic: number;
  /** Extra drag applied to vertical motion (the hull is not streamlined that way). */
  verticalDragScale: number;
  /**
   * Residual buoyancy acceleration with neutral ballast (m/s^2). Slightly
   * positive so an idle sub drifts gently upward, like a real trimmed boat.
   */
  buoyancyAccel: number;
  /** Speed above which we clamp, as a safety net (m/s). */
  maxSpeed: number;
  /** Independent vertical velocity cap; a forward boost cannot increase descent speed. */
  maxVerticalSpeed: number;
  /** Depth (negative metres) at which the hull fails. */
  crushDepth: number;
  /** Legacy fractional pressure threshold for bare-number test hulls. */
  crushWarnRatio: number;
  /** Collision sphere radius around the sub's origin (m). */
  hullRadius: number;
  /** Minimum clearance kept above the seabed (m). */
  seabedClearance: number;
  /** Fraction of speed retained after scraping the bottom. */
  collisionSpeedPenalty: number;

  // --- A3: feel ------------------------------------------------------------
  /**
   * Throttle response curve exponent. `effective = sign(t) * |t|^n`. n > 1 gives
   * fine control near centre (station-keeping) while still reaching full thrust.
   */
  thrustCurve: number;
  /** Multiplier applied to thrust (and ballast) while the boost key is held. */
  boostMultiplier: number;
  /**
   * Angular dynamics. Rather than snapping the rotation rate to the stick, the
   * rate is itself integrated, so the boat has rotational inertia: it takes
   * ~`1/damping` seconds to spin up and coasts round after you let go.
   */
  yawAccel: number;
  yawDamping: number;
  pitchAccel: number;
  pitchDamping: number;
  /** Peak visual-only bank angle when turning hard at cruise speed (radians). */
  maxBankAngle: number;
  /** Half-life of the roll spring, seconds. */
  bankHalfLife: number;
  /** Speed (m/s) at which banking reaches its full amplitude. */
  bankFullSpeed: number;
  /**
   * Ballast inertia: the tank does not fill instantly. Half-life in seconds for
   * the commanded ballast to reach the stick position.
   */
  ballastHalfLife: number;
  /**
   * Neutral-buoyancy trim. With no ballast input the boat is pulled back toward
   * its trim depth rate of zero with this restoring acceleration per m/s of
   * residual vertical speed; it is what makes "hands off" feel like hovering
   * rather than drifting. 0 disables it.
   */
  trimStrength: number;

  // --- A3: hull integrity --------------------------------------------------
  /** Which entry of {@link hullClasses} is fitted. Sets the crush depth. */
  hullClass: string;
  hullClasses: Record<string, HullClass>;
  /** Impact speed (m/s) that produces a full 1.0 hull-stress spike. */
  impactStressSpeed: number;
  /** Half-life (s) of the impact component of hull stress. */
  hullStressHalfLife: number;
  /** Hull stress below which no event is emitted (noise gate). */
  hullStressEventThreshold: number;

  // --- A3: emergency blow --------------------------------------------------
  /** Upward acceleration during an emergency blow (m/s^2). */
  emergencyBlowAccel: number;
  /** Seconds the pilot's controls stay locked out during the blow. */
  emergencyBlowLockSeconds: number;

  // --- A3: sim speed -------------------------------------------------------
  /** Selectable sim-speed multipliers. Must be positive integers. */
  simSpeeds: number[];
  /** Index into {@link simSpeeds} used at spawn. */
  defaultSimSpeedIndex: number;

  // --- fix S (QA-B) --------------------------------------------------------
  /**
   * QA-B #15. When false (the default) the yaw/pitch *input* is divided by the
   * sim-speed multiplier inside each physics tick, so the boat turns at its 1x
   * real-time rate while translation still runs 2x/3x. True restores the
   * Phase A behaviour (turn rate scales with sim speed too).
   */
  simSpeedScalesTurnRate: boolean;
  /**
   * QA-B #2. Free dive fits the lowest hull class whose rated depth clears the
   * tile's deepest cell (`meta.min_m`) by this many metres. Soft: if no class
   * clears it, the deepest class is fitted and the HUD says the margin is thin.
   */
  freeDiveHullMarginM: number;
  /**
   * QA-B #14. The HUD's SEABED PROXIMITY banner: shown below this altitude
   * (hull centre above the seabed; contact is at hullRadius + seabedClearance).
   */
  seabedWarnAltitudeM: number;
  /**
   * ...or when closing on the seabed fast: below `seabedApproachAltitudeM`
   * and less than this many seconds from contact at the current sink rate.
   * This half of the warning is never suppressed near a scan target.
   */
  seabedWarnTimeToContactS: number;
  seabedApproachAltitudeM: number;
  /** QA-B #6. Hull look below 300 m: a faint fresnel rim and an ambient floor. */
  hullRimColor: number;
  hullRimStrength: number;
  hullEmissive: number;
}

/** An operating rating and a separate game failure threshold. */
export interface HullClass {
  name: string;
  /** Certified operating depth (negative metres). */
  ratedDepth: number;
  /** Game failure threshold below the rating, with a 10% safety margin. */
  crushDepth: number;
}

export const DEFAULT_SUBMARINE: SubmarineConfig = {
  // Runtime gameplay profiles replace these legacy baseline values at boot.
  thrustAccel: 2.0,
  reverseAccel: 0.9,
  ballastAccel: 3.0,
  yawRate: 0.55, // ~31 deg/s sustained
  pitchRate: 0.45,
  maxPitch: Math.PI / 4, // +/- 45 deg
  dragLinear: 0.09,
  dragQuadratic: 0.04,
  verticalDragScale: 1.8,
  buoyancyAccel: 0.05,
  maxSpeed: 40,
  maxVerticalSpeed: 8,
  // Fallback game failure threshold when no named hull is fitted.
  crushDepth: -7150,
  crushWarnRatio: 0.9,
  hullRadius: 8,
  seabedClearance: 4,
  collisionSpeedPenalty: 0.35,

  thrustCurve: 1.6,
  boostMultiplier: 1.8,
  // damping ~2.8 => the boat settles into a turn in about a third of a second
  // and carries a little rotation after you release the stick.
  yawAccel: 2.8,
  yawDamping: 2.8,
  pitchAccel: 3.2,
  pitchDamping: 3.2,
  maxBankAngle: 0.42, // ~24 deg
  bankHalfLife: 0.35,
  bankFullSpeed: 4.0,
  ballastHalfLife: 0.5,
  trimStrength: 0.35,

  hullClass: 'B',
  hullClasses: {
    // A: Triton 3300/3 rated 1,000 m (https://tritonsubs.com/subs/t3300-3/).
    // B: WHOI Alvin rated 6,500 m (https://ndsf.whoi.edu/alvin/specifications/).
    // C: Triton 36000/2 rated 11,000 m for repeated full-ocean-depth dives
    // (https://tritonsubs.com/subs/t36000-2/).
    // The 10% simulated crush margin is gameplay tuning, not a certification claim.
    A: { name: 'Class A - coastal', ratedDepth: -1000, crushDepth: -1100 },
    B: { name: 'Class B - deep ocean', ratedDepth: -6500, crushDepth: -7150 },
    C: { name: 'Class C - full ocean depth', ratedDepth: -11000, crushDepth: -12100 },
  },
  impactStressSpeed: 6.0,
  hullStressHalfLife: 0.9,
  hullStressEventThreshold: 0.05,

  emergencyBlowAccel: 6.0,
  emergencyBlowLockSeconds: 5,

  simSpeeds: [1, 2, 3],
  defaultSimSpeedIndex: 0,

  simSpeedScalesTurnRate: false,
  freeDiveHullMarginM: 300,
  // Contact is at 12 m (hullRadius 8 + seabedClearance 4); wreck scans sit
  // at 12-25 m altitude, so the static banner only fires in the last 3 m.
  seabedWarnAltitudeM: 15,
  seabedWarnTimeToContactS: 4,
  seabedApproachAltitudeM: 60,
  hullRimColor: 0x6f93a3,
  hullRimStrength: 0.55,
  hullEmissive: 0x0b1318,
};
