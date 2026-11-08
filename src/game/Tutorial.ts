/**
 * First-dive tutorial: three short steps that advance when the
 * player does the thing. Pure logic. The onboarding system feeds it the input
 * the sim sees each frame plus a few events; it never touches input handling.
 */

import type { InputDevice } from '../ui/ControlsCard.js';

export type TutorialStepId = 'move' | 'depth' | 'scan';
type TutorialEvent = 'scan:complete' | 'scan:started' | 'scan:aborted';
/** Why a started scan stopped (the scanner's abort reason). */
export type ScanDrop = 'range' | 'facing' | 'released';

interface TutorialStep {
  id: TutorialStepId;
  title: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'move', title: 'Move and turn' },
  { id: 'depth', title: 'Rise and sink' },
  { id: 'scan', title: 'Scan a target' },
];

/** Seconds of held input before a movement step counts as done. */
export const MOVE_HOLD_S = 0.8;
export const TURN_HOLD_S = 0.5;
const DEPTH_HOLD_S = 0.8;
/** A first target this close in depth (m) makes the depth step pointless: skip it. */
export const DEPTH_SKIP_M = 15;
/** Seconds on the move step with no input before the text adds the marker distance. */
export const MOVE_IDLE_S = 20;
const AXIS_MIN = 0.25;

interface TutorialSample {
  /** Unfrozen seconds since the last sample. */
  dt: number;
  throttle: number;
  yaw: number;
  ballast: number;
  /** Metres between the sub and the first target's depth; absent when no target. */
  targetGapM?: number;
}

export class Tutorial {
  private index_ = 0;
  private active_: boolean;
  scanning = false;
  scanProgress = 0;
  private moveS = 0;
  private turnS = 0;
  private depthS = 0;
  private idleS = 0;
  /** Events seen before their step came up; that step completes on arrival. */
  private early = new Set<TutorialEvent>();
  /** Why the last scan was dropped; the scan step keeps that cue until the next scan starts. */
  dropReason: ScanDrop | null = null;

  constructor(active = true) {
    this.active_ = active;
  }

  get active(): boolean {
    return this.active_;
  }

  /** Index of the current step; equals the step count once finished. */
  get index(): number {
    return this.index_;
  }

  get step(): TutorialStep | null {
    return this.active_ ? (TUTORIAL_STEPS[this.index_] ?? null) : null;
  }

  /** True once the move step has seen no input for MOVE_IDLE_S. */
  get stalled(): boolean {
    return this.step?.id === 'move' && this.idleS >= MOVE_IDLE_S;
  }

  get finished(): boolean {
    return this.index_ >= TUTORIAL_STEPS.length;
  }

  /** Feed one frame of input. Returns true when a step was completed. */
  update(s: TutorialSample): boolean {
    const step = this.step;
    if (!step || !(s.dt > 0)) return false;
    if (step.id === 'move') {
      this.moveS = Math.abs(s.throttle) >= AXIS_MIN ? this.moveS + s.dt : 0;
      this.turnS = Math.abs(s.yaw) >= AXIS_MIN ? this.turnS + s.dt : 0;
      this.idleS = this.moveS > 0 || this.turnS > 0 ? 0 : this.idleS + s.dt;
      // Either a sustained push ahead/astern or a sustained turn counts, so a
      // player who only drives (or only turns) is not stuck on this step.
      if (this.moveS >= MOVE_HOLD_S || this.turnS >= TURN_HOLD_S) return this.advance();
    } else if (step.id === 'depth') {
      if (s.targetGapM !== undefined && s.targetGapM <= DEPTH_SKIP_M) return this.advance();
      this.depthS = Math.abs(s.ballast) >= AXIS_MIN ? this.depthS + s.dt : 0;
      if (this.depthS >= DEPTH_HOLD_S) return this.advance();
    }
    return false;
  }

  /** An event only counts for the step that is waiting for it. */
  notify(event: TutorialEvent, drop?: ScanDrop): boolean {
    if (event === 'scan:started') {
      this.scanning = true;
      this.scanProgress = 0;
      this.dropReason = null;
      return false;
    }
    if (event === 'scan:aborted') this.dropReason = drop ?? null;
    if (event === 'scan:aborted' || event === 'scan:complete') this.scanning = false;
    const step = this.step;
    if (!step) return false;
    if (step.id === 'scan' && event === 'scan:complete') return this.advance();
    return false;
  }

  /**
   * Record a finished action done before its step: that step completes on
   * arrival. Never advances the current step. Ignored if it is the current one.
   */
  remember(event: TutorialEvent): void {
    if (event === 'scan:started' || event === 'scan:aborted') return;
    const step = this.step;
    if (step && !this.waitsFor(step.id, event)) this.early.add(event);
  }

  /** Forget remembered actions (a new dive starts). */
  forgetEarly(): void {
    this.early.clear();
    this.scanning = false;
    this.scanProgress = 0;
    this.dropReason = null;
  }

  /** Skip the step on screen. */
  skipStep(): boolean {
    return this.step ? this.advance() : false;
  }

  /** Stop the tutorial for good. */
  skipAll(): void {
    this.active_ = false;
  }

  private waitsFor(id: TutorialStepId, event: TutorialEvent): boolean {
    return id === 'scan' && event === 'scan:complete';
  }

  private advance(): boolean {
    this.index_ += 1;
    this.dropReason = null;
    // Skip any following step whose event already happened.
    for (;;) {
      const next = TUTORIAL_STEPS[this.index_];
      if (!next) break;
      const done = [...this.early].some((e) => this.waitsFor(next.id, e));
      if (!done) break;
      this.index_ += 1;
    }
    if (this.finished) this.active_ = false;
    return true;
  }
}

export interface TutorialKeys {
  move: string;
  turn: string;
  rise: string;
  sink: string;
  scan: string;
}

/**
 * Touch hides the slider card while the sub is still on the approach: no target
 * is in reach yet, so the card would name a control the player has no use for.
 * Progress is unchanged; a slider hold made earlier still completes the step.
 */
export function depthCardWaits(device: InputDevice, targetInReach: boolean): boolean {
  return device === 'touch' && !targetInReach;
}

/** Instruction text for a step on the given device. */
export function tutorialText(
  id: TutorialStepId,
  device: InputDevice,
  k: TutorialKeys,
  scanProgress: number | null = null,
  destination?: string,
  scanDistanceM?: number,
  markerDistanceM?: number,
  dropReason: ScanDrop | null = null,
): string {
  switch (id) {
    case 'move': {
      if (device === 'touch') {
        if (markerDistanceM !== undefined && destination)
          return `Marker ${Math.max(5, Math.round(markerDistanceM / 5) * 5)} m ahead`;
        return destination ? `Follow the marker toward ${destination}.` : 'Drag to move and turn.';
      }
      const guidance = destination ? `Follow the marker toward ${destination}. ` : '';
      return (
        guidance +
        (device === 'gamepad'
          ? 'Use the left stick: up to move, sideways to turn.'
          : `Hold ${k.move} to move, then ${k.turn} to turn.`)
      );
    }
    case 'depth':
      return device === 'touch'
        ? 'Right slider: up to rise, down to sink.'
        : device === 'gamepad'
          ? `Press ${k.rise} to rise or ${k.sink} to sink.`
          : `Hold ${k.rise} to rise or ${k.sink} to sink.`;
    case 'scan':
      if (scanProgress !== null)
        return `Scanning… ${Math.round(Math.max(0, Math.min(1, scanProgress)) * 100)}% · keep holding ${device === 'touch' ? 'SCAN' : k.scan}.`;
      // A dropped beam says why, in the scan card's words, instead of the generic hold line.
      if (dropReason === 'facing') return 'BEAM OFF TARGET';
      if (dropReason === 'released')
        return `HOLD ${device === 'touch' ? 'SCAN' : k.scan} TO RESUME`;
      if (scanDistanceM !== undefined) return `Get closer to scan · ${scanDistanceM.toFixed(0)} m`;
      return device === 'touch'
        ? 'Hold SCAN on a glowing target.'
        : `Hold ${k.scan} on a glowing target.`;
  }
}
