/** Selectors for the one guidance card, by what it is currently showing. */
export const GUIDANCE = {
  /** The card, whatever it shows. */
  any: '.guidance-slot',
  /** A scan in progress or a contact ready to scan. */
  scan: '.guidance-slot[data-kind="scan"]',
  /** A scan result, a sample or a sighting. */
  discovery: '.guidance-slot[data-kind="discovery"]',
  /** A hull, supplies or seabed warning. */
  urgent: '.guidance-slot[data-kind="urgent"]',
  /** The standing "where next" line (and a logged-contact note). */
  objective: '.guidance-slot[data-kind="objective"]',
  /** A tutorial step. */
  tutorial: '.guidance-slot[data-step]',
  /** A one-shot hint or system note (not a tutorial step). */
  hint: '.guidance-slot[data-kind="hint"]:not([data-step])',
  name: '.guidance-name',
  kicker: '.guidance-kicker',
  detail: '.guidance-hint',
  skip: '.guidance-skip',
} as const;
