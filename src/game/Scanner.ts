/**
 * The scan beam.
 *
 * While the scan control is held, the scanner locks the best candidate POI --
 * the nearest one within its `radius` whose direction lies inside the facing
 * cone -- and accumulates progress over that POI's `scanSeconds`. Releasing the
 * control, drifting out of range or turning away interrupts the scan: one
 * `scan:aborted` is emitted and the progress *decays* rather than resetting,
 * so re-acquiring the same target quickly resumes where it left off.
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
  landmarkId: string;
  position: Vector3;
  radius: number;
  scanSeconds: number;
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
>;

export type ScanPhase = 'idle' | 'scanning' | 'interrupted';
export type AbortReason = GameEvents['scan:aborted']['reason'];

/** Read-only snapshot for the overlay (and e2e). Updated in place every call. */
export interface ScanView {
  phase: ScanPhase;
  /** The POI being scanned, or decaying after an interruption. */
  activeId: string | null;
  activeName: string;
  /** 0..1 progress on the active POI. */
  progress: number;
  /** Best scannable POI right now (in range AND facing), if any. */
  candidateId: string | null;
  /** Nearest POI within hint range (radius * hintRangeFactor), if any. */
  nearestId: string | null;
  nearestName: string;
  nearestDistance: number;
  nearestRadius: number;
  nearestInRange: boolean;
  nearestFacing: boolean;
  /** Angle between forward and the nearest POI, degrees. */
  nearestAngleDeg: number;
  /**
   * Signed horizontal turn to face the nearest POI, degrees: positive means
   * turn to starboard (clockwise seen from above).
   */
  nearestTurnDeg: number;
  /** Reason for the most recent interruption, while phase === 'interrupted'. */
  lastAbort: AbortReason | null;
  /** Completed scans since construction (handy for tests and e2e). */
  completed: number;
  lastCompleteId: string | null;
  lastCompleteFirstTime: boolean;
}

interface Geometry {
  distance: number;
  angleDeg: number;
  turnDeg: number;
  inRange: boolean;
  facing: boolean;
}

export class Scanner {
  readonly view: ScanView = {
    phase: 'idle',
    activeId: null,
    activeName: '',
    progress: 0,
    candidateId: null,
    nearestId: null,
    nearestName: '',
    nearestDistance: Infinity,
    nearestRadius: 0,
    nearestInRange: false,
    nearestFacing: false,
    nearestAngleDeg: 180,
    nearestTurnDeg: 0,
    lastAbort: null,
    completed: 0,
    lastCompleteId: null,
    lastCompleteFirstTime: false,
  };

  /** When false, a held control is treated as released (overlay open, cutscene...). */
  enabled = true;

  private targets: ScanTarget[] = [];
  private active: ScanTarget | null = null;
  /** After a completion, the control must be released before rescanning that POI. */
  private latchedId: string | null = null;
  private sinceProgressEmit = Infinity;
  private readonly cosCone: number;

  constructor(
    private readonly config: ScannerConfig,
    private readonly bus: ScanEmitter,
    private readonly recorder: DiscoveryRecorder | null = null,
  ) {
    this.cosCone = Math.cos((config.coneHalfAngleDeg * Math.PI) / 180);
  }

  setTargets(targets: ScanTarget[]): void {
    this.targets = [...targets];
    if (this.active && !this.targets.includes(this.active)) this.clearActive();
  }

  getTargets(): readonly ScanTarget[] {
    return this.targets;
  }

  get isScanning(): boolean {
    return this.view.phase === 'scanning';
  }

  /**
   * Advance by `dt` seconds.
   * @param forward unit forward vector of the sub (`sub.getForward()`).
   */
  update(dt: number, position: Vector3, forward: Vector3, scanHeld: boolean): void {
    const v = this.view;
    const held = scanHeld && this.enabled;
    if (!held) this.latchedId = null;

    // Nearest target (for hints) and best scannable candidate.
    let candidate: ScanTarget | null = null;
    let candidateDist = Infinity;
    let nearest: ScanTarget | null = null;
    let nearestGeo: Geometry | null = null;
    let activeGeo: Geometry | null = null;
    for (const t of this.targets) {
      const g = this.geometry(t, position, forward);
      if (t === this.active) activeGeo = g;
      if (g.inRange && g.facing && g.distance < candidateDist && t.id !== this.latchedId) {
        candidate = t;
        candidateDist = g.distance;
      }
      const hintRange = t.radius * this.config.hintRangeFactor;
      if (g.distance <= hintRange && (!nearestGeo || g.distance < nearestGeo.distance)) {
        nearest = t;
        nearestGeo = g;
      }
    }
    // Stickiness: keep scanning the active target while it stays valid, even
    // if another one drifts slightly closer.
    if (
      this.active &&
      activeGeo?.inRange &&
      activeGeo.facing &&
      this.active.id !== this.latchedId
    ) {
      candidate = this.active;
    }

    v.candidateId = candidate?.id ?? null;
    v.nearestId = nearest?.id ?? null;
    v.nearestName = nearest?.name ?? '';
    v.nearestDistance = nearestGeo?.distance ?? Infinity;
    v.nearestRadius = nearest?.radius ?? 0;
    v.nearestInRange = nearestGeo?.inRange ?? false;
    v.nearestFacing = nearestGeo?.facing ?? false;
    v.nearestAngleDeg = nearestGeo?.angleDeg ?? 180;
    v.nearestTurnDeg = nearestGeo?.turnDeg ?? 0;

    if (held && candidate) {
      if (this.active !== candidate) {
        // Switching to a different target abandons the old one outright.
        if (this.active && v.phase === 'scanning') {
          this.bus.emit('scan:aborted', { poiId: this.active.id, reason: 'facing' });
        }
        this.active = candidate;
        v.progress = 0;
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

  /** Drop any scan in progress without emitting (e.g. after a teleport). */
  cancel(): void {
    this.clearActive();
  }

  private complete(t: ScanTarget): void {
    const v = this.view;
    const firstTime = this.recorder ? this.recorder.record(t.landmarkId, t.id).firstTime : true;
    this.bus.emit('scan:progress', { poiId: t.id, progress: 1 });
    this.bus.emit('scan:complete', { poiId: t.id, landmarkId: t.landmarkId, firstTime });
    v.completed += 1;
    v.lastCompleteId = t.id;
    v.lastCompleteFirstTime = firstTime;
    this.latchedId = t.id;
    this.clearActive();
    v.candidateId = null;
  }

  private clearActive(): void {
    const v = this.view;
    this.active = null;
    v.phase = 'idle';
    v.activeId = null;
    v.activeName = '';
    v.progress = 0;
    v.lastAbort = null;
  }

  private geometry(t: ScanTarget, p: Vector3, f: Vector3): Geometry {
    const dx = t.position.x - p.x;
    const dy = t.position.y - p.y;
    const dz = t.position.z - p.z;
    const distance = Math.hypot(dx, dy, dz);
    const inRange = distance <= t.radius;
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
    return { distance, angleDeg, turnDeg: turn, inRange, facing };
  }
}
