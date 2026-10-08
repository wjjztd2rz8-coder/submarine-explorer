/**
 * Contextual hints (F3-ONBOARD): one-line tips that appear once each, at most
 * one per `minGapS` seconds. Pure logic: the onboarding system feeds a
 * {@link HintContext} every frame and shows whatever `update` returns.
 */

export type HintId = 'battery-low' | 'near-hull' | 'scan-target' | 'creature' | 'rov';

/** Highest priority first: when several are due, the earliest one wins. */
export const HINT_ORDER: readonly HintId[] = [
  'battery-low',
  'near-hull',
  'scan-target',
  'creature',
  'rov',
];

/** Key names for the active input device, filled in by the caller. */
export interface HintLabels {
  scan: string;
  rov: string;
  photo: string;
  lights: string;
}

export const HINT_TEXT: Record<HintId, (l: HintLabels) => string> = {
  'battery-low': (l) => `Battery low. Ascend or turn off lights (${l.lights}).`,
  'near-hull': () => 'Near hull rating. Ascend to ease pressure.',
  'scan-target': (l) => `Face the target. Hold ${l.scan} to scan.`,
  creature: (l) => `Animal nearby. Hold ${l.scan} to scan, or press ${l.photo} for a photo.`,
  rov: (l) => `Press ${l.rov} to deploy the tethered ROV into tight spots.`,
};

export interface HintContext {
  /** Battery 0..1, or null when supplies are off. */
  battery: number | null;
  /** Operating depth divided by the hull rating. */
  ratedRatio: number;
  scanTargetInRange: boolean;
  creatureInView: boolean;
  rovAvailable: boolean;
  /** False while a menu, the tutorial or a debrief owns the screen. */
  canShow: boolean;
}

export const HINT_THRESHOLDS = { battery: 0.3, hull: 0.85 } as const;

/** Give the opening scan card eight seconds of attention before animal guidance. */
export function creatureHintAllowed(diveS: number, scanCardVisible: boolean): boolean {
  return !scanCardVisible || diveS >= 8;
}

export function hintDue(id: HintId, c: HintContext): boolean {
  switch (id) {
    case 'battery-low':
      return c.battery !== null && c.battery < HINT_THRESHOLDS.battery;
    case 'near-hull':
      return c.ratedRatio >= HINT_THRESHOLDS.hull;
    case 'scan-target':
      return c.scanTargetInRange;
    case 'creature':
      return c.creatureInView;
    case 'rov':
      return c.rovAvailable;
  }
}

export class HintEngine {
  private readonly seen_: Set<HintId>;
  private lastShownS = -Infinity;

  constructor(
    seen: Iterable<HintId> = [],
    readonly minGapS = 20,
  ) {
    this.seen_ = new Set(seen);
  }

  get seen(): HintId[] {
    return [...this.seen_];
  }

  hasSeen(id: HintId): boolean {
    return this.seen_.has(id);
  }

  /** The hint to show at clock time `nowS`, marked seen, or null. */
  update(nowS: number, ctx: HintContext): HintId | null {
    if (!ctx.canShow || nowS - this.lastShownS < this.minGapS) return null;
    for (const id of HINT_ORDER) {
      if (this.seen_.has(id) || !hintDue(id, ctx)) continue;
      this.seen_.add(id);
      this.lastShownS = nowS;
      return id;
    }
    return null;
  }

  /** Forget everything (used by "Reset progress"-style flows and tests). */
  reset(): void {
    this.seen_.clear();
    this.lastShownS = -Infinity;
  }
}
