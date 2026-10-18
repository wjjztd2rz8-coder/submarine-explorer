/**
 * Scan HUD (DOM only, never the WebGL canvas).
 *
 * - A thin corner-bracket reticle over the nearest POI's screen position.
 * - The scan, discovery and objective messages for the guidance slot: target
 *   name and "HOLD F TO SCAN", a progress ring while the beam is on, the
 *   "NEW ENTRY" confirmation, and the "where next" objective line. Amber marks
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
}

const isTouch = (): boolean => document.documentElement.classList.contains('is-touch');

export class ScanOverlay {
  readonly root: HTMLDivElement;
  /** The one guidance card; every text source offers its message here. */
  readonly slot: GuidanceSlot;
  private readonly reticle: HTMLDivElement;
  private suppressed = false;
  /** Result content and lifetime; starting another scan ends its ready-contact priority. */
  private complete: {
    title: string;
    firstTime: boolean;
    left: number;
    holdsReady: boolean;
  } | null = null;
  /** The standing objective's direction line, kept for a result card to carry. */
  private cue: string | null = null;

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
    this.slot.clear();
  }

  /** Show the completion confirmation for `completeBannerSeconds`. */
  showComplete(title: string, firstTime: boolean, keys: ScanOverlayKeys): void {
    if (this.suppressed) return;
    this.complete = {
      title,
      firstTime,
      left: this.config.completeBannerSeconds,
      holdsReady: true,
    };
    this.slot.flash(
      'complete',
      'discovery',
      this.completeMessage(title, firstTime, keys),
      this.config.completeBannerSeconds,
    );
  }

  private completeMessage(
    title: string,
    firstTime: boolean,
    keys: ScanOverlayKeys,
  ): GuidanceMessage {
    return {
      kicker: firstTime ? 'NEW ENTRY' : 'SCAN COMPLETE',
      text: title,
      detail:
        this.cue && isTouch()
          ? this.cue
          : firstTime
            ? isTouch()
              ? 'OPEN JOURNAL'
              : `PRESS ${keys.guide} · JOURNAL`
            : 'LOGGED · JOURNAL',
      tone: firstTime ? 'cyan' : 'dim',
      ring: { progress: 1, label: 'OK' },
    };
  }

  /**
   * @param screen CSS-pixel position of the nearest POI, or null if it is
   *   off-screen / behind the camera.
   */
  update(view: ScanView, keys: ScanOverlayKeys, screen: ScreenPoint | null, dt: number): void {
    this.slot.tick(dt);
    if (this.suppressed) return;
    this.updateReticle(view, screen);
    this.cue = this.objectiveCue(view);
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
        ? this.completeMessage(this.complete.title, this.complete.firstTime, keys)
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
      this.reticle.classList.toggle('is-ready', view.candidateId !== null);
      this.reticle.classList.toggle('is-scanned', view.nearestScanned);
    } else {
      this.reticle.hidden = true;
    }
  }

  /** "STERN · TURN 30° PORT": where the outstanding objective lies, unless ready to scan. */
  private objectiveCue(view: ScanView): string | null {
    if (view.objectiveId == null || !view.objectiveName) return null;
    if (view.objectiveId === view.candidateId) return null;
    const turn = view.objectiveTurnDeg;
    const how =
      Math.abs(turn) >= 10
        ? `TURN ${Math.abs(turn).toFixed(0)}° ${turn >= 0 ? 'STARBOARD' : 'PORT'}`
        : view.objectiveInRange
          ? view.objectiveVertDeg >= 0
            ? 'RISE TOWARD TARGET'
            : 'SINK TOWARD TARGET'
          : view.objectiveDistance <= view.objectiveRadius
            ? 'DIVE DEEPER'
            : `${view.objectiveDistance.toFixed(0)} m AHEAD`;
    return `${view.objectiveName} · ${how}`;
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
    // A card is for a contact in range or a scan under way; the objective may stand alone.
    const inContact = hasTarget && (view.phase !== 'idle' || view.nearestInRange);
    if (!inContact && view.objectiveId === null) return none;
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
      const why =
        view.lastAbort === 'range'
          ? 'OUT OF RANGE'
          : view.lastAbort === 'facing'
            ? 'BEAM OFF TARGET'
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
    const guide = (turn: number, vert: number, fallback: string): string => {
      if (Math.abs(turn) >= 10) {
        return `TURN ${Math.abs(turn).toFixed(0)}° ${turn >= 0 ? 'STARBOARD' : 'PORT'}`;
      }
      // Touch has no pitch control: the ballast slider is the vertical aid.
      if (touch) return vert >= 0 ? 'RISE TOWARD TARGET' : 'SINK TOWARD TARGET';
      return fallback;
    };
    if (view.candidateId !== null) {
      // A curiosity beside an outstanding objective is marked optional and keeps the
      // objective's direction on the same card.
      const optional = view.objectiveId != null && view.candidateId !== view.objectiveId;
      return {
        scan: {
          kicker: optional ? 'SCAN TARGET · OPTIONAL' : 'SCAN TARGET',
          text: view.nearestName,
          ready: true,
          detail: optional && touch && this.cue ? this.cue : `HOLD ${scan} TO SCAN`,
          tone: 'cyan',
          ring: { progress: 0, label: dist },
        },
        objective: null,
      };
    }
    const objectiveReady = view.objectiveId === view.nearestId && view.nearestInRange;
    // Phones have no objectives panel, so the card stands. Elsewhere the panel's nav line
    // already names the target and the turn; the card only adds the final aim once in scan range.
    if (
      view.objectiveId != null &&
      view.objectiveName &&
      !objectiveReady &&
      (touch || (inContact && view.objectiveInRange))
    ) {
      const turn = view.objectiveTurnDeg;
      const near =
        view.objectiveDistance <= view.objectiveRadius
          ? 'DIVE DEEPER'
          : `CLOSE TO ${view.objectiveRadius.toFixed(0)} M`;
      return {
        scan: null,
        objective: {
          kicker: 'OBJECTIVE',
          text: view.objectiveName,
          detail: view.objectiveInRange
            ? guide(turn, view.objectiveVertDeg, 'PITCH TOWARD TARGET')
            : Math.abs(turn) >= 10
              ? guide(turn, 0, near)
              : near,
          tone: view.objectiveInRange ? 'amber' : 'dim',
          ring: { progress: 0, label: `${view.objectiveDistance.toFixed(0)} m` },
        },
      };
    }
    // Steering toward a side contact would compete with the objective the nav line leads;
    // once that contact is aimed at, the optional scan card above still offers it.
    if (inContact && (view.objectiveId == null || view.nearestId === view.objectiveId)) {
      return {
        scan: {
          kicker: 'SCAN TARGET',
          text: view.nearestName,
          detail: guide(view.nearestTurnDeg, view.nearestVertDeg, 'PITCH TOWARD TARGET'),
          tone: 'amber',
          ring: { progress: 0, label: dist },
          soft: true,
        },
        objective: null,
      };
    }
    return none;
  }

  dispose(): void {
    this.slot.dispose();
    this.root.remove();
  }
}
