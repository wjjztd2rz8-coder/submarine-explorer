/**
 * First-dive tutorial (F3-ONBOARD): five short steps that advance when the
 * player does the thing. Pure logic. The onboarding system feeds it the input
 * the sim sees each frame plus a few events; it never touches input handling.
 */

export type TutorialStepId = 'move' | 'depth' | 'lights' | 'scan' | 'journal';
export type TutorialEvent = 'lights' | 'scan' | 'journal' | 'photo';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { id: 'move', title: 'Move and turn' },
  { id: 'depth', title: 'Rise and sink' },
  { id: 'lights', title: 'Headlights' },
  { id: 'scan', title: 'Scan a target' },
  { id: 'journal', title: 'Photo or Journal' },
];

/** Seconds of held input before a movement step counts as done. */
export const MOVE_HOLD_S = 0.8;
export const TURN_HOLD_S = 0.5;
export const DEPTH_HOLD_S = 0.8;
const AXIS_MIN = 0.25;

export interface TutorialSample {
  /** Unfrozen seconds since the last sample. */
  dt: number;
  throttle: number;
  yaw: number;
  ballast: number;
}

export class Tutorial {
  private index_ = 0;
  private active_: boolean;
  private moveS = 0;
  private turnS = 0;
  private depthS = 0;

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

  get finished(): boolean {
    return this.index_ >= TUTORIAL_STEPS.length;
  }

  /** Feed one frame of input. Returns true when a step was completed. */
  update(s: TutorialSample): boolean {
    const step = this.step;
    if (!step || !(s.dt > 0)) return false;
    if (step.id === 'move') {
      if (Math.abs(s.throttle) >= AXIS_MIN) this.moveS += s.dt;
      if (Math.abs(s.yaw) >= AXIS_MIN) this.turnS += s.dt;
      // Either a sustained push ahead/astern or a sustained turn counts, so a
      // player who only drives (or only turns) is not stuck on this step.
      if (this.moveS >= MOVE_HOLD_S || this.turnS >= TURN_HOLD_S) return this.advance();
    } else if (step.id === 'depth') {
      if (Math.abs(s.ballast) >= AXIS_MIN) this.depthS += s.dt;
      if (this.depthS >= DEPTH_HOLD_S) return this.advance();
    }
    return false;
  }

  /** An event only counts for the step that is waiting for it. */
  notify(event: TutorialEvent): boolean {
    const step = this.step;
    if (!step) return false;
    if (step.id === 'lights' && event === 'lights') return this.advance();
    if (step.id === 'scan' && event === 'scan') return this.advance();
    if (step.id === 'journal' && (event === 'journal' || event === 'photo')) return this.advance();
    return false;
  }

  /** Skip the step on screen. */
  skipStep(): boolean {
    return this.step ? this.advance() : false;
  }

  /** Stop the tutorial for good. */
  skipAll(): void {
    this.active_ = false;
  }

  private advance(): boolean {
    this.index_ += 1;
    if (this.finished) this.active_ = false;
    return true;
  }
}
