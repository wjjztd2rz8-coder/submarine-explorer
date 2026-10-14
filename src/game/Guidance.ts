/**
 * The guidance slot's priority rule. Pure logic: the HUD feeds it whatever each
 * source currently wants to say and shows the single winner.
 *
 * Order, most important first:
 *   urgent     hull, supplies and seabed warnings
 *   scan       a scan in progress, or a contact ready to scan
 *   discovery  a result: NEW ENTRY, a sample, a sighting
 *   hint       the tutorial step or a one-shot contextual hint
 *   objective  the standing "where next" line
 *
 * A scan card that only steers the pilot toward a contact (it cannot be scanned
 * yet) is "soft": it ranks just below discovery, so a fresh result or sighting
 * is not buried under a persistent approach cue. Idle ready contacts also yield
 * to the first three seconds of a fresh result; active scans keep their priority.
 *
 * Hints and tutorial steps are timed or one-shot, so they preempt the standing
 * objective line; otherwise the objective would hide them for the whole dive.
 */

export type GuidanceKind = 'urgent' | 'scan' | 'discovery' | 'hint' | 'objective';

export const GUIDANCE_ORDER: readonly GuidanceKind[] = [
  'urgent',
  'scan',
  'discovery',
  'hint',
  'objective',
];

export type GuidanceTone = 'cyan' | 'amber' | 'dim' | 'alert';

export interface GuidanceMessage {
  /** Small label above the text, e.g. "NEW ENTRY". */
  kicker: string;
  /** The main line: a name or an instruction. */
  text: string;
  /** Optional second line, e.g. "HOLD SCAN TO SCAN". */
  detail?: string;
  tone: GuidanceTone;
  /** A progress ring with a short label (percent or range). */
  ring?: { progress: number; label: string };
  /** A scan-tier cue that only steers toward a contact; yields to discovery. */
  soft?: boolean;
  /** Idle contact; briefly yields to fresh results, unlike an active or interrupted scan. */
  ready?: boolean;
  /** Tutorial step id; the slot shows a Skip button for it. */
  step?: string;
}

export interface GuidanceOffer {
  kind: GuidanceKind;
  message: GuidanceMessage;
  /** When the message last changed. Within one kind the newest wins. */
  since: number;
}

function rank(offer: GuidanceOffer): number {
  const base = GUIDANCE_ORDER.indexOf(offer.kind);
  return offer.kind === 'scan' && offer.message.soft
    ? GUIDANCE_ORDER.indexOf('discovery') + 0.5
    : base;
}

/** The single message to show, or null when nothing is offered. */
export function pickGuidance(
  offers: Iterable<GuidanceOffer>,
): { kind: GuidanceKind; message: GuidanceMessage } | null {
  let best: GuidanceOffer | null = null;
  for (const offer of offers) {
    if (!best) best = offer;
    else {
      const a = rank(offer);
      const b = rank(best);
      if (a < b || (a === b && offer.since >= best.since)) best = offer;
    }
  }
  return best ? { kind: best.kind, message: best.message } : null;
}
