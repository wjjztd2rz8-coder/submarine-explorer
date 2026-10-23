/**
 * The scan beam.
 *
 * While the scan control is held, the scanner locks the best candidate POI --
 * the mission objective if eligible, otherwise the nearest eligible contact --
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
export interface DiscoveryRecorder {
  record(landmarkId: string, poiId: string): { firstTime: boolean };
}

/** The part of EventBus the scanner emits on. */
export interface ScanEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

export type ScannerConfig = Pick<
  ScanConfig,
  'coneHalfAngleDeg' | 'closeRangeM' | 'decayPerSecond' | 'progressEventHz' | 'hintRangeFactor'
> & { radiusFloorM?: number };

/** Apply the mode floor after sensor scaling and any mission approach cap. */
export function resolveScanRadius(
  radius: number,
  config: Pick<ScannerConfig, 'radiusFloorM'>,
): number {
  return Math.max(radius, config.radiusFloorM ?? 0);
}

export type ScanPhase = 'idle' | 'scanning' | 'interrupted';
export type AbortReason = GameEvents['scan:aborted']['reason'];

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
  private objectivePoiId: string | null = null;

  /** Point the card's guidance at the active mission objective (POI id), or null. */
  setObjective(poiId: string | null): void {
    this.objectivePoiId = poiId;
  }
  private sinceProgressEmit = Infinity;
  private readonly cosCone: number;

  setConfig(config: ScannerConfig): void {
    this.config = config;
  }

  constructor(
    private config: ScannerConfig,
    private readonly bus: ScanEmitter,
    private readonly recorder: DiscoveryRecorder | null = null,
  ) {
    this.cosCone = Math.cos((config.coneHalfAngleDeg * Math.PI) / 180);
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
    this.scannedThisDive.clear();
    this.clearActive();
    this.view.completed = 0;
    this.view.lastCompleteId = null;
    this.view.lastCompleteFirstTime = false;
    this.view.candidateId = null;
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

    // Nearest target (for hints) and best scannable candidate.
    let candidate: ScanTarget | null = null;
    let candidateDist = Infinity;
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
      if (
        g.inRange &&
        g.facing &&
        (candidate === null ||
        (t.id === this.objectivePoiId) !== (candidate.id === this.objectivePoiId)
          ? t.id === this.objectivePoiId || candidate === null
          : g.distance < candidateDist)
      ) {
        candidate = t;
        candidateDist = g.distance;
      }
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
      if (
        t.arrivalRadiusM === undefined &&
        g.facing &&
        candidate?.id !== this.objectivePoiId &&
        g.distance < candidateDist
      ) {
        candidate = t;
        candidateDist = g.distance;
      }
    }
    // A remote hint must not hide a logged contact where the pilot is still
    // hovering. Nearby unscanned fixed contacts retain priority over both.
    if (scannedNearest && !nearestGeo?.inRange) {
      nearest = scannedNearest;
      nearestGeo = scannedNearestGeo;
    }
    // Moving targets (animals): considered only where no POI already claims the
    // hint or the candidate, and only hinted once they are in range.
    const poiCandidate = candidate;
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
      if (!poiCandidate && g.inRange && g.facing && g.distance < candidateDist) {
        candidate = t;
        candidateDist = g.distance;
      }
    }
    // Caller-owned live lists can drop the active object without a setter call.
    // Match the setters' silent clear instead of retaining progress on a removed contact.
    if (this.active && !activeGeo) this.clearActive();
    // Keep an uninterrupted beam locked. After release, a newly eligible
    // objective wins the next hold over an incidental contact's partial scan.
    if (
      this.active &&
      activeGeo?.inRange &&
      activeGeo.facing &&
      (v.phase === 'scanning' || candidate?.id !== this.objectivePoiId) &&
      !this.isScanned(this.active.landmarkId, this.active.id)
    ) {
      candidate = this.active;
    }
    // One shared selection: whatever Scan will scan is also what the card,
    // reticle and prompt name, even if a nearer off-axis contact exists.
    if (candidate && nearest !== candidate) {
      nearest = candidate;
      nearestGeo = this.geometry(candidate, position, forward);
    }

    v.candidateId = candidate?.id ?? null;
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

    this.updateObjective(position, forward);
    v.activeDistance = activeGeo?.distance ?? Infinity;

    if (held && candidate) {
      if (this.active !== candidate) {
        // Switching to a different target abandons the old one outright.
        if (this.active && v.phase === 'scanning') {
          this.bus.emit('scan:aborted', {
            poiId: this.active.id,
            reason: activeGeo?.inRange ? 'facing' : 'range',
          });
        }
        this.clearActive();
        this.active = candidate;
        v.activeDistance = position.distanceTo(candidate.position);
      }
      if (v.phase !== 'scanning') {
        v.phase = 'scanning';
        v.activeId = candidate.id;
        v.activeName = candidate.name;
        v.lastAbort = null;
        this.sinceProgressEmit = Infinity; // report the (resumed) progress at once
        this.bus.emit('scan:started', { poiId: candidate.id });
      }
      v.progress = Math.min(1, v.progress + dt / Math.max(1e-3, candidate.scanSeconds));
      this.sinceProgressEmit += dt;
      if (v.progress >= 1) {
        this.complete(candidate);
      } else if (this.sinceProgressEmit >= 1 / this.config.progressEventHz) {
        this.sinceProgressEmit = 0;
        this.bus.emit('scan:progress', { poiId: candidate.id, progress: v.progress });
      }
      return;
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
    const v = this.view;
    const t = this.objectivePoiId
      ? (this.targets.find((x) => x.id === this.objectivePoiId) ?? null)
      : null;
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
    this.clearActive();
  }

  private complete(t: ScanTarget): void {
    const v = this.view;
    if (this.isScanned(t.landmarkId, t.id)) return;
    this.scannedThisDive.add(`${t.landmarkId}/${t.id}`);
    const firstTime = this.recorder ? this.recorder.record(t.landmarkId, t.id).firstTime : true;
    v.completed = this.scannedThisDive.size;
    v.lastCompleteId = t.id;
    v.lastCompleteFirstTime = firstTime;
    this.bus.emit('scan:progress', { poiId: t.id, progress: 1 });
    this.bus.emit('scan:complete', { poiId: t.id, landmarkId: t.landmarkId, firstTime });
    this.clearActive();
    v.candidateId = null;
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
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    const facing = distance <= this.config.closeRangeM || cos >= this.cosCone;
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
