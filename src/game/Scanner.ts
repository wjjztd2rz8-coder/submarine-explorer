/**
 * The scan beam.
 *
 * While the scan control is held, the scanner locks the best candidate POI --
 * the mission objective if eligible, otherwise the most central eligible mission contact --
 * and accumulates progress over that POI's `scanSeconds`. Releasing the
 * control, drifting out of range or turning away interrupts the scan: one
 * `scan:aborted` is emitted and the progress *decays* rather than resetting,
 * so re-acquiring the same target quickly resumes where it left off.
 * Completed targets stay unavailable for the rest of this dive, regardless of
 * whether the control is released. resetDive() clears only that session state.
 *
 * Pure TypeScript (Vector3 is the only Three.js type used) and driven by an
 * explicit `dt`, so it runs headless in vitest and is fixed-step friendly.
 *
 * Events (plan/PHASE-B-CONTRACTS.md §4): scan:started, scan:progress (<= the
 * configured Hz), scan:aborted, scan:complete.
 */

import type { Vector3 } from 'three';
import type { ScanConfig } from '../core/Config.js';
import type { GameEvents } from '../core/EventBus.js';

/** What the scanner needs to know about a target. `PlacedPoi` satisfies it. */
export interface ScanTarget {
  id: string;
  name: string;
  /** Revealed name after scanning, when the contact starts unidentified. */
  discoveryName?: string;
  landmarkId: string;
  position: Vector3;
  radius: number;
  /** The sub must be at least this deep (m) to scan; absent = any depth. */
  minDepthM?: number;
  scanSeconds: number;
  /** An approach contact plays on arrival; it never takes the scan beam. */
  arrivalRadiusM?: number;
}

/** Records a completed scan; returns true if it was the first time. */
interface DiscoveryRecorder {
  record(landmarkId: string, poiId: string): { firstTime: boolean };
}

/** The part of EventBus the scanner emits on. */
interface ScanEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

export type ScannerConfig = Pick<
  ScanConfig,
  'coneHalfAngleDeg' | 'closeRangeM' | 'decayPerSecond' | 'progressEventHz' | 'hintRangeFactor'
> & {
  radiusFloorM?: number;
  radiusCeilM?: number;
  /** Extra half-angle a scan in progress keeps its lock through (ScanConfig). */
  lockConeExtraDeg?: number;
  /**
   * Facing compares heading only, ignoring pitch and height (Arcade): a level
   * boat pointed at a wreck below it is facing it.
   */
  levelCone?: boolean;
};

/** Apply the mode floor after sensor scaling and any mission approach cap. */
export function resolveScanRadius(
  radius: number,
  config: Pick<ScannerConfig, 'radiusFloorM' | 'radiusCeilM'>,
): number {
  // The ceiling keeps wide-area targets from scanning before the approach slows.
  return Math.min(Math.max(radius, config.radiusFloorM ?? 0), config.radiusCeilM ?? Infinity);
}

type ScanPhase = 'idle' | 'scanning' | 'interrupted';
type AbortReason = GameEvents['scan:aborted']['reason'];

/** Read-only snapshot for the overlay (and e2e). Updated in place every call. */
export interface ScanView {
  phase: ScanPhase;
  /** The POI being scanned, or decaying after an interruption. */
  activeId: string | null;
  activeName: string;
  /** Distance to the held or interrupted target, even when another contact is nearer. */
  activeDistance: number;
  /** 0..1 progress on the active POI. */
  progress: number;
  /** Best scannable POI right now (in range AND facing), if any. */
  candidateId: string | null;
  /** The SCAN TARGET prompt, when hold would start that contact immediately. */
  promptId: string | null;
  /** Scannable contacts in objective, mission, incidental order. */
  candidateIds?: readonly string[];
  /** Display names for scannable contacts in candidateIds order. */
  candidateNames?: Readonly<Record<string, string>>;
  /** Unscanned contacts in scan range, then logged POIs in range, then remote hints. */
  nearestId: string | null;
  nearestName: string;
  nearestDistance: number;
  nearestRadius: number;
  nearestInRange: boolean;
  nearestFacing: boolean;
  /** The nearest contact has already been scanned during this dive. */
  nearestScanned: boolean;
  nearestArrivalRadiusM?: number;
  /** Angle between forward and the nearest POI, degrees. */
  nearestAngleDeg: number;
  /**
   * Signed horizontal turn to face the nearest POI, degrees: positive means
   * turn to starboard (clockwise seen from above).
   */
  nearestTurnDeg: number;
  /**
   * Signed vertical correction to face the nearest POI, degrees: positive means
   * the target is above the current heading line (rise or pitch up).
   */
  nearestVertDeg: number;
  /**
   * Active mission objective (set via setObjective), when it is an unscanned
   * fixed target. An eligible objective takes priority when selecting a scan.
   */
  objectiveId: string | null;
  objectiveName: string;
  objectiveDistance: number;
  objectiveRadius: number;
  objectiveInRange: boolean;
  /** Signed turn to face the objective, degrees (positive = starboard). */
  objectiveTurnDeg: number;
  /** Signed vertical correction toward the objective, degrees (positive = above). */
  objectiveVertDeg: number;
  /** Reason for the most recent interruption, while phase === 'interrupted'. */
  lastAbort: AbortReason | null;
  /** Distinct discoveries this dive, including POIs, wildlife and curiosity targets. */
  completed: number;
  lastCompleteId: string | null;
  lastCompleteFirstTime: boolean;
  /** The last completed scan was not the outstanding objective, which is still pending. */
  lastCompleteSideFind: boolean;
}

interface Geometry {
  distance: number;
  angleDeg: number;
  turnDeg: number;
  vertDeg: number;
  inRange: boolean;
  facing: boolean;
}

export class Scanner {
  readonly view: ScanView = {
    phase: 'idle',
    activeId: null,
    activeName: '',
    activeDistance: Infinity,
    progress: 0,
    candidateId: null,
    promptId: null,
    nearestId: null,
    nearestName: '',
    nearestDistance: Infinity,
    nearestRadius: 0,
    nearestInRange: false,
    nearestFacing: false,
    nearestScanned: false,
    nearestAngleDeg: 180,
    nearestTurnDeg: 0,
    nearestVertDeg: 0,
    objectiveId: null,
    objectiveName: '',
    objectiveDistance: Infinity,
    objectiveRadius: 0,
    objectiveInRange: false,
    objectiveTurnDeg: 0,
    objectiveVertDeg: 0,
    lastAbort: null,
    completed: 0,
    lastCompleteId: null,
    lastCompleteFirstTime: false,
    lastCompleteSideFind: false,
  };

  /** When false, a held control is treated as released (overlay open, cutscene...). */
  enabled = true;

  private targets: ScanTarget[] = [];
  /**
   * Live targets that come and go (animals). The array is owned by the
   * caller and may change every frame; POIs always win over these for the
   * hint and the candidate, so objectives never lose the beam to a passing fish.
   */
  private extra: readonly ScanTarget[] = [];
  private supplemental: readonly ScanTarget[] = [];

  /** Fixed curiosity targets have their own pool so wildlife cannot overwrite them. */
  setSupplementalTargets(targets: readonly ScanTarget[]): void {
    this.supplemental = targets;
  }
  getSupplementalTargets(): readonly ScanTarget[] {
    return this.supplemental;
  }
  /** Public per-dive state for sonar, objectives and other presentation layers. */
  readonly scannedThisDive = new Set<string>();
  private active: ScanTarget | null = null;
  private objectiveSource: string | null | (() => string | null) = null;

  /** Mission callers supply a live resolver so completion advances guidance immediately. */
  setObjective(poiId: string | null | (() => string | null)): void {
    this.objectiveSource = poiId;
  }
  private manualId: string | null = null;
  private cycleRequested = false;
  private readonly savedProgress = new Map<string, number>();

  /** Apply at the next geometry update, before the beam starts. */
  cycleCandidate(): void {
    if (this.enabled) this.cycleRequested = true;
  }

  selectCandidate(id: string): boolean {
    if (!this.enabled || !this.view.candidateIds?.includes(id)) return false;
    this.manualId = id;
    return true;
  }

  private sinceProgressEmit = Infinity;
  private cosCone: number;
  private cosLockCone: number;
  private rejected: string | null = null;

  setConfig(config: ScannerConfig): void {
    this.config = config;
    [this.cosCone, this.cosLockCone] = Scanner.cones(config);
  }

  private static cones(config: ScannerConfig): [number, number] {
    const rad = (deg: number): number => (Math.min(180, deg) * Math.PI) / 180;
    return [
      Math.cos(rad(config.coneHalfAngleDeg)),
      Math.cos(rad(config.coneHalfAngleDeg + (config.lockConeExtraDeg ?? 0))),
    ];
  }

  constructor(
    private config: ScannerConfig,
    private readonly bus: ScanEmitter,
    private readonly recorder: DiscoveryRecorder | null = null,
  ) {
    [this.cosCone, this.cosLockCone] = Scanner.cones(config);
  }

  setTargets(targets: ScanTarget[]): void {
    this.targets = [...targets];
    if (
      this.active &&
      !this.targets.includes(this.active) &&
      !this.extra.includes(this.active) &&
      !this.supplemental.includes(this.active)
    )
      this.clearActive();
  }

  /** Hand over the live, caller-owned list of moving targets (animals). */
  setExtraTargets(targets: readonly ScanTarget[]): void {
    const removed = (id: string | null): boolean =>
      id !== null &&
      this.extra.some((t) => t.id === id) &&
      ![targets, this.targets, this.supplemental].some((list) => list.some((t) => t.id === id));
    if (removed(this.view.candidateId)) this.view.candidateId = null;
    if (removed(this.view.nearestId)) {
      Object.assign(this.view, {
        nearestId: null,
        nearestName: '',
        nearestDistance: Infinity,
        nearestRadius: 0,
        nearestInRange: false,
        nearestFacing: false,
        nearestScanned: false,
        nearestAngleDeg: 180,
        nearestTurnDeg: 0,
        nearestVertDeg: 0,
      });
    }
    this.extra = targets;
    if (
      this.active &&
      !targets.includes(this.active) &&
      !this.targets.includes(this.active) &&
      !this.supplemental.includes(this.active)
    )
      this.clearActive();
  }

  getExtraTargets(): readonly ScanTarget[] {
    return this.extra;
  }

  /** All placed POIs, regardless of hint range or objective status; excludes wildlife. */
  nearestUnscannedFixedDistance(position: Vector3): number {
    let distance = Infinity;
    for (const target of this.targets) {
      if (!this.isScanned(target.landmarkId, target.id))
        distance = Math.min(distance, position.distanceTo(target.position));
    }
    return distance;
  }

  getTargets(): readonly ScanTarget[] {
    return this.targets;
  }

  get isScanning(): boolean {
    return this.view.phase === 'scanning';
  }

  isScanned(landmarkId: string, poiId: string): boolean {
    return this.scannedThisDive.has(`${landmarkId}/${poiId}`);
  }

  /** A new dive may scan a Journal entry again; persistence is unaffected. */
  resetDive(): void {
    this.rejected = null;
    this.scannedThisDive.clear();
    this.manualId = null;
    this.cycleRequested = false;
    this.savedProgress.clear();
    this.view.candidateIds = [];
    this.clearActive();
    this.view.completed = 0;
    this.view.lastCompleteId = null;
    this.view.lastCompleteFirstTime = false;
    this.view.lastCompleteSideFind = false;
    this.view.candidateId = null;
    this.view.promptId = null;
    this.view.nearestId = null;
    this.view.nearestScanned = false;
  }

  /**
   * Advance by `dt` seconds.
   * @param forward unit forward vector of the sub (`sub.getForward()`).
   */
  update(dt: number, position: Vector3, forward: Vector3, scanHeld: boolean): void {
    const v = this.view;
    const held = scanHeld && this.enabled;
    if (!held) {
      this.rejected = null;
      if (v.phase === 'idle') v.lastAbort = null;
    }

    this.updateObjective(position, forward);

    // Nearest target (for hints) and best scannable candidate.
    let candidate: ScanTarget | null = null;
    const eligible: { target: ScanTarget; geometry: Geometry; rank: number }[] = [];
    const collect = (target: ScanTarget, geometry: Geometry, rank: number): void => {
      if (geometry.inRange && geometry.facing && target.arrivalRadiusM === undefined)
        eligible.push({ target, geometry, rank: target.id === v.objectiveId ? 0 : rank });
    };
    let nearest: ScanTarget | null = null;
    let nearestGeo: Geometry | null = null;
    let scannedNearest: ScanTarget | null = null;
    let scannedNearestGeo: Geometry | null = null;
    let activeGeo: Geometry | null = null;
    for (const t of this.targets) {
      const g = this.geometry(t, position, forward);
      if (t === this.active) activeGeo = g;
      if (this.isScanned(t.landmarkId, t.id)) {
        if (g.inRange && (!scannedNearestGeo || g.distance < scannedNearestGeo.distance)) {
          scannedNearest = t;
          scannedNearestGeo = g;
        }
        continue;
      }
      collect(t, g, 1);
      const hintRange = resolveScanRadius(t.radius, this.config) * this.config.hintRangeFactor;
      if (
        g.distance <= hintRange &&
        (!nearestGeo ||
          (g.inRange && !nearestGeo.inRange) ||
          (g.inRange === nearestGeo.inRange && g.distance < nearestGeo.distance))
      ) {
        nearest = t;
        nearestGeo = g;
      }
    }
    // Curiosity targets are hinted only in scan range; never reveal a name remotely.
    for (const t of this.supplemental) {
      const g = this.geometry(t, position, forward);
      if (t === this.active) activeGeo = g;
      if (this.isScanned(t.landmarkId, t.id) || !g.inRange) continue;
      if (!nearestGeo || !nearestGeo.inRange || g.distance < nearestGeo.distance) {
        nearest = t;
        nearestGeo = g;
      }
      collect(t, g, 2);
    }
    // A remote hint must not hide a logged contact where the pilot is still
    // hovering. Nearby unscanned fixed contacts retain priority over both.
    if (scannedNearest && !nearestGeo?.inRange) {
      nearest = scannedNearest;
      nearestGeo = scannedNearestGeo;
    }
    // Moving targets (animals): considered only where no POI already claims the
    // hint or the candidate, and only hinted once they are in range.
    const poiNearest = nearest;
    for (const t of this.extra) {
      const g = this.geometry(t, position, forward);
      if (t === this.active) activeGeo = g;
      // An animal already logged this dive is not hinted again.
      if (this.isScanned(t.landmarkId, t.id)) continue;
      if (!poiNearest && g.inRange && (!nearestGeo || g.distance < nearestGeo.distance)) {
        nearest = t;
        nearestGeo = g;
      }
      collect(t, g, 2);
    }
    if (this.active && !activeGeo) this.clearActive();
    eligible.sort(
      (a, b) =>
        a.rank - b.rank ||
        a.geometry.angleDeg - b.geometry.angleDeg ||
        a.geometry.distance - b.geometry.distance ||
        a.target.id.localeCompare(b.target.id),
    );
    v.candidateIds = eligible.map((entry) => entry.target.id);
    v.candidateNames = Object.fromEntries(
      eligible.map((entry) => [entry.target.id, entry.target.name]),
    );
    const manual = [...this.targets, ...this.supplemental, ...this.extra].find(
      (t) =>
        t.id === this.manualId &&
        !this.isScanned(t.landmarkId, t.id) &&
        this.geometry(t, position, forward).inRange,
    );
    if (!manual) this.manualId = null;
    const auto =
      eligible.find((e) => e.target.id === v.objectiveId)?.target ?? eligible[0]?.target ?? null;
    candidate =
      eligible.find((e) => e.target.id === this.manualId)?.target ?? (this.manualId ? null : auto);
    if (this.cycleRequested && eligible.length > 0) {
      const index = eligible.findIndex((e) => e.target === candidate);
      candidate = eligible[(index + 1) % eligible.length]!.target;
      this.manualId = candidate.id;
    }
    this.cycleRequested = false;
    // A running beam keeps its lock. An interrupted beam re-enters through the
    // same eligibility calculation as a fresh hold; no stale lock can veto it.
    if (this.active && v.phase === 'scanning' && activeGeo?.inRange && activeGeo.facing) {
      candidate = this.active;
    } else if (!this.manualId && candidate?.id !== v.objectiveId) {
      const objective = this.targets.find((t) => t.id === v.objectiveId);
      if (objective) {
        const g = this.geometry(objective, position, forward);
        const near =
          -position.y >= (objective.minDepthM ?? 0) &&
          g.distance <= resolveScanRadius(objective.radius, this.config) * 1.2 &&
          (g.facing || g.angleDeg <= this.config.coneHalfAngleDeg + 10);
        // Alignment never times out into an incidental scan. A held control
        // starts the objective on the first eligible frame, even after a drop.
        if (near) candidate = null;
      }
      // Briefly losing an objective's cone must not hand its partial scan to fish.
      if (this.active?.id === v.objectiveId && activeGeo?.inRange && v.progress > 0)
        candidate = null;
    }
    const beam = candidate;
    const prompt =
      this.enabled && beam && (beam.id === v.objectiveId || beam.id === this.manualId)
        ? beam
        : null;
    // Hint geometry follows the beam when eligible; prompt policy remains independent.
    if (beam) {
      nearest = beam;
      nearestGeo = this.geometry(beam, position, forward);
    }

    v.candidateId = beam?.id ?? null;
    v.promptId = prompt?.id ?? null;
    v.nearestId = nearest?.id ?? null;
    v.nearestName = nearest?.name ?? '';
    v.nearestArrivalRadiusM = nearest?.arrivalRadiusM;
    v.nearestDistance = nearestGeo?.distance ?? Infinity;
    v.nearestRadius = nearest ? resolveScanRadius(nearest.radius, this.config) : 0;
    v.nearestInRange = nearestGeo?.inRange ?? false;
    v.nearestFacing = nearestGeo?.facing ?? false;
    v.nearestScanned = nearest ? this.isScanned(nearest.landmarkId, nearest.id) : false;
    v.nearestAngleDeg = nearestGeo?.angleDeg ?? 180;
    v.nearestTurnDeg = nearestGeo?.turnDeg ?? 0;
    v.nearestVertDeg = nearestGeo?.vertDeg ?? 0;

    v.activeDistance = activeGeo?.distance ?? Infinity;

    if (held && beam) {
      this.rejected = null;
      if (this.active !== beam) {
        // Switching to a different target abandons the old one outright.
        if (this.active && v.phase === 'scanning') {
          this.bus.emit('scan:aborted', {
            poiId: this.active.id,
            reason: activeGeo?.inRange ? 'facing' : 'range',
          });
        }
        if (this.active) this.savedProgress.set(this.active.id, v.progress);
        this.clearActive();
        v.progress = this.savedProgress.get(beam.id) ?? 0;
        this.savedProgress.delete(beam.id);
        this.active = beam;
        v.activeDistance = position.distanceTo(beam.position);
      }
      if (v.phase !== 'scanning') {
        v.phase = 'scanning';
        v.activeId = beam.id;
        v.activeName = beam.name;
        v.lastAbort = null;
        this.sinceProgressEmit = Infinity; // report the (resumed) progress at once
        this.bus.emit('scan:started', { poiId: beam.id });
      }
      v.progress = Math.min(1, v.progress + dt / Math.max(1e-3, beam.scanSeconds));
      this.sinceProgressEmit += dt;
      if (v.progress >= 1) {
        this.complete(beam);
        // Completion listeners advance the mission synchronously. Refresh before drawing.
        this.updateObjective(position, forward);
      } else if (this.sinceProgressEmit >= 1 / this.config.progressEventHz) {
        this.sinceProgressEmit = 0;
        this.bus.emit('scan:progress', { poiId: beam.id, progress: v.progress });
      }
      return;
    }

    // A rejected initial hold needs the same explanation as a dropped beam.
    // Emit once per target/reason, not once per frame while the button stays down.
    if (
      held &&
      !candidate &&
      nearest &&
      nearest.arrivalRadiusM === undefined &&
      !v.nearestScanned &&
      v.phase === 'idle'
    ) {
      const reason: AbortReason = nearestGeo?.inRange ? 'facing' : 'range';
      const rejection = `${nearest.id}/${reason}`;
      v.lastAbort = reason;
      if (this.rejected !== rejection) this.bus.emit('scan:aborted', { poiId: nearest.id, reason });
      this.rejected = rejection;
    } else {
      this.rejected = null;
    }

    // Not scanning this step.
    if (v.phase === 'scanning' && this.active) {
      const reason: AbortReason = !held
        ? 'released'
        : !activeGeo || !activeGeo.inRange
          ? 'range'
          : 'facing';
      v.phase = 'interrupted';
      v.lastAbort = reason;
      this.bus.emit('scan:aborted', { poiId: this.active.id, reason });
    }
    if (v.phase === 'interrupted') {
      v.progress = Math.max(0, v.progress - this.config.decayPerSecond * dt);
      if (v.progress <= 0) this.clearActive();
    }
  }

  private updateObjective(position: Vector3, forward: Vector3): void {
    const poiId =
      typeof this.objectiveSource === 'function' ? this.objectiveSource() : this.objectiveSource;
    const v = this.view;
    const t = this.targets.find((x) => x.id === poiId);
    if (!t || this.isScanned(t.landmarkId, t.id)) {
      v.objectiveId = null;
      v.objectiveName = '';
      v.objectiveDistance = Infinity;
      v.objectiveRadius = 0;
      v.objectiveInRange = false;
      v.objectiveTurnDeg = 0;
      v.objectiveVertDeg = 0;
      return;
    }
    const g = this.geometry(t, position, forward);
    v.objectiveId = t.id;
    v.objectiveName = t.name;
    v.objectiveDistance = g.distance;
    v.objectiveRadius = resolveScanRadius(t.radius, this.config);
    v.objectiveInRange = g.inRange;
    v.objectiveTurnDeg = g.turnDeg;
    v.objectiveVertDeg = g.vertDeg;
  }

  /** Drop any scan in progress without emitting (e.g. after a teleport). */
  cancel(): void {
    this.rejected = null;
    this.manualId = null;
    this.cycleRequested = false;
    this.savedProgress.clear();
    this.clearActive();
  }

  private complete(t: ScanTarget): void {
    const v = this.view;
    if (this.isScanned(t.landmarkId, t.id)) return;
    this.scannedThisDive.add(`${t.landmarkId}/${t.id}`);
    this.savedProgress.delete(t.id);
    v.candidateIds = v.candidateIds?.filter((id) => id !== t.id);
    if (this.manualId === t.id) this.manualId = null;
    const firstTime = this.recorder ? this.recorder.record(t.landmarkId, t.id).firstTime : true;
    v.completed = this.scannedThisDive.size;
    v.lastCompleteId = t.id;
    v.lastCompleteFirstTime = firstTime;
    v.lastCompleteSideFind = v.objectiveId !== null && v.objectiveId !== t.id;
    this.bus.emit('scan:progress', { poiId: t.id, progress: 1 });
    this.bus.emit('scan:complete', { poiId: t.id, landmarkId: t.landmarkId, firstTime });
    this.clearActive();
    v.candidateId = null;
    v.promptId = null;
  }

  private clearActive(): void {
    const v = this.view;
    this.active = null;
    v.phase = 'idle';
    v.activeId = null;
    v.activeName = '';
    v.activeDistance = Infinity;
    v.progress = 0;
    v.lastAbort = null;
  }

  private geometry(t: ScanTarget, p: Vector3, f: Vector3): Geometry {
    const dx = t.position.x - p.x;
    const dy = t.position.y - p.y;
    const dz = t.position.z - p.z;
    const distance = Math.hypot(dx, dy, dz);
    const inRange =
      distance <= resolveScanRadius(t.radius, this.config) && -p.y >= (t.minDepthM ?? 0);
    let cos = 1;
    if (distance > 1e-6) {
      const fl = Math.hypot(f.x, f.y, f.z) || 1;
      cos = (dx * f.x + dy * f.y + dz * f.z) / (distance * fl);
    }

    const horizontal = Math.hypot(dx, dz);
    let coneCos = cos;
    if (this.config.levelCone && horizontal > 1e-6) {
      const fh = Math.hypot(f.x, f.z) || 1;
      coneCos = (dx * f.x + dz * f.z) / (horizontal * fh);
    }
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, coneCos))) * 180) / Math.PI;
    // Over the target counts as on top of it even when clearance keeps the boat
    // well above: no heading puts it "ahead", and a player told to turn just circles.
    // A scan in progress holds its lock through a wider cone, so passing works.
    const facing =
      distance <= this.config.closeRangeM ||
      horizontal <= this.config.closeRangeM ||
      coneCos >=
        (t === this.active && this.view.phase === 'scanning' ? this.cosLockCone : this.cosCone);
    // Horizontal turn: +Y-up cross product sign, flipped because +Z is south,
    // so a clockwise (starboard) turn seen from above is positive.
    const hf = Math.atan2(f.x, -f.z);
    const ht = Math.atan2(dx, -dz);
    let turn = ((ht - hf) * 180) / Math.PI;
    turn = ((turn + 540) % 360) - 180;
    const fl = Math.hypot(f.x, f.y, f.z) || 1;
    const vertDeg =
      distance > 1e-6
        ? ((Math.asin(Math.max(-1, Math.min(1, dy / distance))) -
            Math.asin(Math.max(-1, Math.min(1, f.y / fl)))) *
            180) /
          Math.PI
        : 0;
    return { distance, angleDeg, turnDeg: turn, vertDeg, inRange, facing };
  }
}
