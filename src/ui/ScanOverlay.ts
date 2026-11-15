import { contactLabel, type ContactState } from '../game/Contacts.js';
/**
 * Scan HUD (DOM only, never the WebGL canvas).
 *
 * - A thin corner-bracket reticle over the nearest POI's screen position.
 * - The scan, discovery and objective messages for the guidance slot: target
 *   name and "Hold F", a progress ring while the beam is on, the
 *   "New Journal entry" confirmation, and the "where next" objective line. Amber marks
 *   states that need the pilot's attention (interrupted, turn to face).
 *
 * Colours follow docs/art-direction.md §5: cyan #2ED9D9 for the beam and nav
 * readouts, amber #FFB020 for attention, neutral #CDE0E5 for labels.
 */

import type { ScanConfig } from '../core/Config.js';
import type { GuidanceMessage } from '../game/Guidance.js';
import type { ScanView } from '../game/Scanner.js';
import { hudRegions } from './hudRegions.js';
import { GuidanceSlot } from './GuidanceSlot.js';
import { reticleClearOfControls } from './ScanReticleLayout.js';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScanOverlayKeys {
  scan: string;
  guide: string;
  rise?: string;
  sink?: string;
}

const isTouch = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('is-touch');

/** Steering bands and reading time, shared by objective and contact guidance. */
export const CUE_CONFIG = {
  turnOnDeg: 15,
  turnOffDeg: 6,
  aroundOnDeg: 120,
  aroundOffDeg: 90,
  holdSeconds: 1.2,
};

type Turn = 'left' | 'right' | 'around' | null;
interface HeldTurn {
  id: string | null;
  cue: Turn;
  age: number;
  initialized: boolean;
}

/** Plain directions shared by touch, keyboard and controller guidance. */
export const turnCue = (turn: number): string =>
  Math.abs(turn) > 90 ? 'Turn around' : `Turn ${turn >= 0 ? 'right' : 'left'}`;

/** A depth instruction when the target is well above or below, else null. */
export const depthCue = (
  distance: number,
  vertDeg: number,
  keys?: Pick<ScanOverlayKeys, 'rise' | 'sink'>,
): string | null => {
  const dy = distance * Math.sin((vertDeg * Math.PI) / 180);
  if (Math.abs(dy) < 40 || Math.abs(vertDeg) < 12) return null;
  // Touch players have the labelled RISE/SINK slider; keys are named only off touch.
  const key = isTouch() ? undefined : dy > 0 ? keys?.rise : keys?.sink;
  return `${dy > 0 ? 'Go up ↑' : 'Go down ↓'} ${Math.abs(dy).toFixed(0)} m${key ? ` (hold ${key})` : ''}`;
};

export const facingCue = (turn: number): string =>
  Math.abs(turn) > 90
    ? 'Turn around to face the marker'
    : `Turn toward the marker · ${turn >= 0 ? 'right →' : 'left ←'}`;

export class ScanOverlay {
  readonly root: HTMLDivElement;
  /** The one guidance card; every text source offers its message here. */
  readonly slot: GuidanceSlot;
  private readonly reticle: HTMLDivElement;
  private suppressed = false;
  private cycleKey = 'N';
  setCycleKey(key: string): void {
    this.cycleKey = key;
  }
  /** Result content and lifetime; starting another scan ends its ready-contact priority. */
  private complete: {
    title: string;
    fact?: string;
    firstTime: boolean;
    sideFind: boolean;
    left: number;
    holdsReady: boolean;
  } | null = null;
  /** The standing objective's direction line, kept for a result card to carry. */
  private cue: string | null = null;
  /** The outstanding objective, so a side-find result can say it is still open. */
  private openObjective: { name: string; ready: boolean } | null = null;
  /** Labeled contact names refreshed each frame for secondary guidance lines. */
  private labeled = new Map<string, string>();
  /** One-line cue when a prop blocks the straight approach (from the HUD). */
  private approachObstacle: string | null = null;

  private readonly turns: Record<'objective' | 'nearest', HeldTurn> = {
    objective: { id: null, cue: null, age: 0, initialized: false },
    nearest: { id: null, cue: null, age: 0, initialized: false },
  };

  /** Hold only the steering words; range, input bindings and urgent offers stay live. */
  private updateTurn(
    source: 'objective' | 'nearest',
    id: string | null,
    turn: number,
    dt: number,
  ): void {
    const held = this.turns[source];
    if (held.id !== id) Object.assign(held, { id, cue: null, age: 0, initialized: false });
    held.age += Math.max(0, dt);
    const angle = Math.abs(turn);
    const around =
      angle > (held.cue === 'around' ? CUE_CONFIG.aroundOffDeg : CUE_CONFIG.aroundOnDeg);
    const turning = angle > (held.cue ? CUE_CONFIG.turnOffDeg : CUE_CONFIG.turnOnDeg);
    const next: Turn = !id || !turning ? null : around ? 'around' : turn >= 0 ? 'right' : 'left';
    if (!held.initialized || (next !== held.cue && held.age >= CUE_CONFIG.holdSeconds)) {
      held.cue = next;
      held.initialized = true;
      held.age = 0;
    }
  }

  private turnAngle(source: 'objective' | 'nearest'): number | null {
    const cue = this.turns[source].cue;
    return cue === null ? null : cue === 'around' ? 180 : cue === 'right' ? 45 : -45;
  }

  constructor(
    private readonly config: Pick<
      ScanConfig,
      'ringSizePx' | 'ringStrokePx' | 'reticleSizePx' | 'completeBannerSeconds'
    >,
    parent?: HTMLElement,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'scan-overlay';
    this.root.style.setProperty('--scan-reticle-size', `${config.reticleSizePx}px`);

    this.reticle = document.createElement('div');
    this.reticle.className = 'scan-reticle';
    this.reticle.hidden = true;
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const c = document.createElement('span');
      c.className = `scan-reticle-corner ${corner}`;
      this.reticle.appendChild(c);
    }
    this.slot = new GuidanceSlot(config.ringSizePx, config.ringStrokePx);
    this.root.append(this.reticle);
    (parent ?? document.body).appendChild(this.root);
    // The card lives in the HUD's guidance region; only the reticle floats over the scene.
    (parent ?? hudRegions()).appendChild(this.slot.root);
  }

  /** Discard all guidance while play is covered (e.g. by the Journal). */
  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
    this.slot.setSuppressed(suppressed);
    if (suppressed) this.clear();
  }

  /** Discard the previous dive's guidance and result priority. */
  clear(): void {
    this.reticle.hidden = true;
    this.complete = null;
    this.cue = null;
    this.openObjective = null;
    this.approachObstacle = null;
    for (const held of Object.values(this.turns))
      Object.assign(held, { id: null, cue: null, age: 0, initialized: false });
    this.slot.clear();
  }

  /** Shown once on the objective line while thrusting into a blocking prop. */
  setApproachObstacle(detail: string | null): void {
    this.approachObstacle = detail;
  }

  /**
   * Show the completion confirmation for `completeBannerSeconds`. A side find
   * (the objective is still pending) keeps pointing at the objective.
   */
  showComplete(
    title: string,
    firstTime: boolean,
    keys: ScanOverlayKeys,
    sideFind = false,
    fact?: string,
  ): void {
    if (this.suppressed) return;
    this.complete = {
      title,
      fact,
      firstTime,
      sideFind,
      left: this.config.completeBannerSeconds,
      holdsReady: true,
    };
    this.slot.flash(
      'complete',
      'discovery',
      this.completeMessage(title, firstTime, sideFind, keys, fact),
      this.config.completeBannerSeconds,
    );
  }

  private completeMessage(
    title: string,
    firstTime: boolean,
    sideFind: boolean,
    keys: ScanOverlayKeys,
    fact?: string,
  ): GuidanceMessage {
    return {
      kicker: sideFind
        ? 'Side find - not the objective'
        : firstTime
          ? 'New Journal entry'
          : 'SCAN COMPLETE',
      text: title,
      detail:
        fact ??
        (sideFind && this.openObjective
          ? this.sideFindDetail(keys)
          : this.cue && (sideFind || isTouch())
            ? this.cue
            : firstTime
              ? isTouch()
                ? 'OPEN JOURNAL'
                : `PRESS ${keys.guide} · JOURNAL`
              : 'LOGGED · JOURNAL'),
      tone: firstTime ? 'cyan' : 'dim',
      ring: { progress: 1, label: 'OK' },
    };
  }

  /**
   * A side find did not count. Say so, and name the objective still open rather
   * than a turn toward it, which would read as progress.
   */
  private sideFindDetail(keys: ScanOverlayKeys): string {
    const open = this.openObjective!;
    if (open.ready) return `${open.name} · ${isTouch() ? 'Hold SCAN' : `Hold ${keys.scan}`}`;
    return `Objective still open · ${open.name}`;
  }

  /**
   * @param screen CSS-pixel position of the nearest POI, or null if it is
   *   off-screen / behind the camera.
   */
  private contactState: ((id: string) => ContactState | null) | null = null;
  setContactState(state: (id: string) => ContactState | null): void {
    this.contactState = state;
  }

  update(view: ScanView, keys: ScanOverlayKeys, screen: ScreenPoint | null, dt: number): void {
    // Copy the view so scanner state and completion reveal retain the authored names.
    const label = (id: string | null, name: string): string => {
      const state = id ? this.contactState?.(id) : null;
      return state ? contactLabel({ name }, state) : name;
    };
    view = {
      ...view,
      activeName: label(view.activeId, view.activeName),
      nearestName: label(view.nearestId, view.nearestName),
      objectiveName: label(view.objectiveId, view.objectiveName),
    };
    this.labeled.clear();
    for (const id of [
      view.activeId,
      view.nearestId,
      view.objectiveId,
      view.promptId,
      ...(view.candidateIds ?? []),
    ]) {
      if (id)
        this.labeled.set(
          id,
          id === view.activeId
            ? view.activeName
            : id === view.nearestId
              ? view.nearestName
              : id === view.objectiveId
                ? view.objectiveName
                : label(id, id),
        );
    }
    this.slot.tick(dt);
    if (this.suppressed) return;
    this.updateTurn('objective', view.objectiveId, view.objectiveTurnDeg, dt);
    this.updateTurn('nearest', view.nearestId, view.nearestTurnDeg, dt);
    this.updateReticle(view, screen);
    this.cue = this.objectiveCue(view, keys);
    this.openObjective =
      view.objectiveId != null && view.objectiveName && view.objectiveId !== view.lastCompleteId
        ? { name: view.objectiveName, ready: view.objectiveId === view.promptId }
        : null;
    if (this.complete) {
      this.complete.left -= dt;
      if (this.complete.left <= 0) this.complete = null;
      else if (view.phase === 'scanning') this.complete.holdsReady = false;
    }
    // Refresh directions and input labels without renewing the result's topic or lifetime.
    this.slot.offer(
      'complete',
      'discovery',
      this.complete
        ? this.completeMessage(
            this.complete.title,
            this.complete.firstTime,
            this.complete.sideFind,
            keys,
            this.complete.fact,
          )
        : null,
    );
    const { scan, objective } = this.messages(view, keys);
    // A result has just been shown: the next contact is usually already in range and
    // ready, but for the result's few seconds that card steps aside. A new scan under
    // way (or an interrupted one) takes the slot back at once.
    const resultHolds = this.complete?.holdsReady && view.phase === 'idle';
    this.slot.offer('scan', 'scan', scan && resultHolds ? { ...scan, soft: true } : scan);
    this.slot.offer('objective', 'objective', objective);
  }

  private updateReticle(view: ScanView, screen: ScreenPoint | null): void {
    const controls =
      screen && isTouch()
        ? Array.from(
            document.querySelectorAll<HTMLElement>(
              '.tc-stick, .tc-slider, .tc-buttons, .tc-btn-pause',
            ),
          )
            .filter((el) => el.checkVisibility())
            .map((el) => el.getBoundingClientRect())
        : [];
    if (
      screen &&
      view.nearestId !== null &&
      view.nearestInRange &&
      reticleClearOfControls(screen, this.config.reticleSizePx, controls)
    ) {
      this.reticle.hidden = false;
      this.reticle.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
      this.reticle.classList.toggle('is-locked', view.phase === 'scanning');
      this.reticle.classList.toggle('is-ready', view.promptId !== null);
      this.reticle.classList.toggle('is-scanned', view.nearestScanned);
    } else {
      this.reticle.hidden = true;
    }
  }

  /** Keep the outstanding objective on the result, including a side find's next scan. */
  private objectiveCue(view: ScanView, keys: ScanOverlayKeys): string | null {
    if (view.objectiveId == null || !view.objectiveName || view.objectiveId === view.lastCompleteId)
      return null;
    if (view.objectiveId === view.promptId)
      return this.complete?.sideFind
        ? `${view.objectiveName} · ${isTouch() ? 'Hold SCAN' : `Hold ${keys.scan}`}`
        : null;
    const turn = this.turnAngle('objective');
    const how =
      turn !== null
        ? turnCue(turn)
        : view.objectiveInRange
          ? view.objectiveVertDeg >= 0
            ? 'RISE TOWARD TARGET'
            : 'SINK TOWARD TARGET'
          : view.objectiveDistance <= view.objectiveRadius
            ? 'DIVE DEEPER'
            : `${view.objectiveDistance.toFixed(0)} m AHEAD`;
    return `${view.objectiveName} · ${how}`;
  }

  private candidateName(view: ScanView, id: string): string {
    return (
      this.labeled.get(id) ??
      view.candidateNames?.[id] ??
      (id === view.nearestId ? view.nearestName : id)
    );
  }

  /** What the scan beam and the objective each have to say right now. */
  private messages(
    view: ScanView,
    keys: ScanOverlayKeys,
  ): { scan: GuidanceMessage | null; objective: GuidanceMessage | null } {
    const touch = isTouch();
    const scan = touch ? 'SCAN' : keys.scan;
    const none = { scan: null, objective: null };
    const hasTarget = view.nearestId !== null || view.activeId !== null;
    // Remote contacts use the same slot to explain the remaining approach.
    const inContact = hasTarget && (view.phase !== 'idle' || view.nearestInRange);
    if (!hasTarget && view.objectiveId === null) return none;
    const dist = Number.isFinite(view.nearestDistance)
      ? `${view.nearestDistance.toFixed(0)} m`
      : '';

    if (view.phase === 'scanning') {
      return {
        scan: {
          kicker: view.activeId?.startsWith('sample:') ? 'SCANNING FIND' : 'SCANNING',
          text: view.activeName,
          detail: `HOLD ${scan} · KEEP ON TARGET`,
          tone: 'cyan',
          ring: { progress: view.progress, label: `${Math.floor(view.progress * 100)}%` },
        },
        objective: null,
      };
    }
    // A logged contact is standing information; an outstanding mission objective
    // leads the next approach even while the pilot is still beside this contact.
    if (view.nearestScanned && view.nearestInRange && view.objectiveId === null) {
      return {
        scan: null,
        objective: {
          kicker: '✓ SCANNED THIS DIVE',
          text: view.nearestName,
          detail: 'Logged · Journal',
          tone: 'dim',
          ring: { progress: 1, label: '✓' },
        },
      };
    }
    if (view.phase === 'interrupted') {
      const activeDist = Number.isFinite(view.activeDistance)
        ? `${view.activeDistance.toFixed(0)} m`
        : dist;
      const why =
        view.lastAbort === 'range'
          ? `Get closer to scan · ${activeDist}`
          : view.lastAbort === 'facing'
            ? facingCue(view.nearestTurnDeg)
            : `HOLD ${scan} TO RESUME`;
      return {
        scan: {
          kicker: 'SCAN INTERRUPTED',
          text: view.activeName,
          detail: why,
          tone: 'amber',
          ring: { progress: view.progress, label: `${Math.floor(view.progress * 100)}%` },
        },
        objective: null,
      };
    }

    // Guide the pilot towards a scannable pose. The scan prompt follows the
    // candidate; where-to-go guidance follows the mission objective.
    const guide = (turn: number | null, vert: number, fallback: string): string => {
      if (turn !== null) {
        return facingCue(turn);
      }
      // Touch has no pitch control: the ballast slider is the vertical aid.
      if (touch) return vert >= 0 ? 'RISE TOWARD TARGET' : 'SINK TOWARD TARGET';
      return fallback === 'PITCH TOWARD TARGET' ? facingCue(0) : fallback;
    };
    const objectiveReady = view.objectiveId === view.promptId;
    const alsoInRange = (): string | null => {
      if (view.objectiveId == null || objectiveReady || (view.candidateIds?.length ?? 0) < 2)
        return null;
      const extra = view.candidateIds!.find((id) => id !== view.objectiveId);
      if (!extra) return null;
      const switchHint =
        !touch && (view.candidateIds?.length ?? 0) > 1 ? ` · ${this.cycleKey} to switch` : '';
      return `Also in range: ${this.candidateName(view, extra)}${switchHint}`;
    };
    // Keep the range instruction in the same slot as the ready-to-scan prompt.
    if (view.objectiveId != null && view.objectiveName && !objectiveReady) {
      const turn = this.turnAngle('objective');
      const near =
        view.objectiveDistance <= view.objectiveRadius
          ? 'DIVE DEEPER'
          : `Get closer to scan · ${view.objectiveDistance.toFixed(0)} m`;
      // In range but steeply below or above (hovering over it): turning cannot bring
      // it into the beam, a depth change can. Touch keeps its slider wording.
      const inRange = (): string => {
        const vert = view.objectiveVertDeg;
        // A steep target needs ballast before steering, even during the turn hold.
        if (Math.abs(vert) < 35) return guide(turn, vert, 'PITCH TOWARD TARGET');
        if (touch) return guide(null, vert, 'PITCH TOWARD TARGET');
        return (
          depthCue(view.objectiveDistance, vert, keys) ?? guide(turn, vert, 'PITCH TOWARD TARGET')
        );
      };
      const approachDetail = view.objectiveInRange
        ? inRange()
        : (() => {
            const depth = depthCue(view.objectiveDistance, view.objectiveVertDeg, keys);
            const obstacle = this.approachObstacle;
            return [
              obstacle,
              obstacle ? null : depth,
              !obstacle && !depth && turn !== null ? turnCue(turn) : null,
              turn !== null || depth || obstacle
                ? `${view.objectiveDistance.toFixed(0)} m`
                : near,
            ];
          })()
            .filter(Boolean)
            .join(' · ');
      const extra = alsoInRange();
      return {
        scan: null,
        objective: {
          kicker: 'OBJECTIVE',
          text: view.objectiveName,
          detail: extra ? `${approachDetail} · ${extra}` : approachDetail,
          tone: view.objectiveInRange ? 'amber' : 'dim',
          ring: { progress: 0, label: `${view.objectiveDistance.toFixed(0)} m` },
        },
      };
    }
    if (inContact && view.nearestArrivalRadiusM !== undefined) {
      const approach = `APPROACH TO ${view.nearestArrivalRadiusM.toFixed(0)} M`;
      return {
        scan: {
          kicker: 'OPTIONAL CONTACT',
          text: view.nearestName,
          detail:
            this.turnAngle('nearest') !== null
              ? guide(this.turnAngle('nearest'), view.nearestVertDeg, approach)
              : Math.abs(view.nearestVertDeg) >= 10
                ? view.nearestVertDeg >= 0
                  ? 'RISE TOWARD TARGET'
                  : 'SINK TOWARD TARGET'
                : approach,
          tone: 'cyan',
          soft: true,
          ring: { progress: 0, label: dist },
        },
        objective: null,
      };
    }
    if (view.promptId !== null) {
      const name = this.candidateName(view, view.promptId);
      const multi =
        !touch && (view.candidateIds?.length ?? 0) > 1 ? ` · ${this.cycleKey} next` : '';
      return {
        scan: {
          kicker: 'SCAN TARGET',
          text: name,
          ready: true,
          detail: touch ? 'Hold SCAN' : `Hold ${keys.scan}${multi}`,
          tone: 'cyan',
          ring: { progress: 0, label: dist },
        },
        objective: null,
      };
    }
    if (
      hasTarget &&
      !view.nearestInRange &&
      view.nearestDistance > view.nearestRadius &&
      view.objectiveId == null
    ) {
      return {
        scan: null,
        objective: {
          kicker: 'OBJECTIVE',
          text: view.nearestName,
          detail: `Get closer to scan · ${dist}`,
          tone: 'dim',
          ring: { progress: 0, label: dist },
        },
      };
    }
    if (inContact && view.objectiveId == null) {
      return {
        scan: null,
        objective: {
          kicker: 'SCAN TARGET',
          text: view.nearestName,
          detail: guide(this.turnAngle('nearest'), view.nearestVertDeg, 'PITCH TOWARD TARGET'),
          tone: 'amber',
          ring: { progress: 0, label: dist },
          soft: view.nearestScanned,
        },
      };
    }
    return none;
  }

  dispose(): void {
    this.slot.dispose();
    this.root.remove();
  }
}
