/**
 * End-of-dive debrief (DOM): score, one highlight and a next suggestion. The mission
 * router (D-FLOW) opens it when the player surfaces and passes its own
 * actions (Keep exploring, Dive again, Dive sites, Home, Journal);
 * `?debrief=1` opens the free-dive variant for screenshots.
 */

import type { DiveRating } from '../game/Progress.js';
import type { DebriefStats } from '../game/Objectives.js';
import { FocusTrap } from './FocusTrap.js';

/** One debrief button. `id` becomes `data-action` (stable for tests and CSS). */
export interface DebriefAction {
  id: string;
  label: string;
  primary?: boolean;
  run: () => void;
}

export interface ExplorationSummary {
  found: number;
  total: number;
  secrets: string[];
  samples: string[];
  events: string[];
}

export interface DebriefOptions {
  /** Default: reload the same URL. Used when `show()` gets no actions. */
  onDiveAgain?: () => void;
  /** Opens the Journal. Used when `show()` gets no actions. */
  onFieldGuide?: () => void;
  parent?: HTMLElement;
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
}

export function formatDuration(s: number): string {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Keep a surfaced dive rewarding, with a single concrete thing to do next. */
export function summarizeDive(
  stats: DebriefStats,
  rating?: DiveRating,
  exploration?: ExplorationSummary,
): {
  highlight: string;
  next: string;
  kind: 'discoveries' | 'secrets' | 'events' | 'samples' | null;
} {
  const cause = stats.subtitle?.split(' · ')[0];
  if (cause?.startsWith('Hull failure'))
    return {
      highlight: `${cause}.`,
      next: 'Try a shallower route or a stronger hull.',
      kind: null,
    };
  if (cause === 'Supplies exhausted')
    return {
      highlight: 'Supplies exhausted · safe ascent completed.',
      next: 'Refill supplies before diving again.',
      kind: null,
    };

  const scan = stats.discoveries[0];
  const secret = exploration?.secrets[0];
  const event = exploration?.events[0];
  const sample = exploration?.samples[0];
  const entry = stats.newEntries[0];
  const kind = scan
    ? 'discoveries'
    : secret
      ? 'secrets'
      : event
        ? 'events'
        : sample
          ? 'samples'
          : null;
  const highlight = scan
    ? `Scanned ${scan.name}.`
    : secret
      ? `Found ${secret}.`
      : event
        ? `Witnessed ${event}.`
        : sample
          ? `Collected ${sample}.`
          : entry
            ? `Logged ${entry.title}.`
            : 'The site is waiting for your first scan.';
  const next =
    rating?.stars === 3
      ? 'Try another dive site.'
      : rating?.stars === 2
        ? 'Take a photo or scan a species for 3 stars.'
        : rating?.stars === 1
          ? 'Finish the remaining objectives for 2 stars.'
          : !scan && !entry
            ? 'Face a target and hold Scan.'
            : stats.objectives && stats.objectives.completed < stats.objectives.total
              ? 'Keep exploring to finish the primary objectives.'
              : 'Open the Journal to read your finds.';
  return { highlight, next, kind };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class Debrief {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private open_ = false;
  /** Read when shown, so both free dives and mission debriefs include curiosity. */
  exploration: (() => ExplorationSummary) | null = null;
  /** The stats last shown (for tests / B3). */
  last: DebriefStats | null = null;
  /** QA-B #12: Tab stays inside the debrief while it is open. */
  private readonly trap: FocusTrap;

  constructor(private readonly options: DebriefOptions = {}) {
    this.root = el('div', 'debrief');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Dive debrief');
    this.root.setAttribute('aria-modal', 'true');
    this.panel = el('div', 'debrief-panel');
    this.root.append(this.panel);
    (options.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  /** @param actions the buttons, in order; default Dive again + Journal. */
  show(stats: DebriefStats, actions?: DebriefAction[], rating?: DiveRating): void {
    this.last = stats;
    const p = this.panel;
    p.replaceChildren();

    const head = el('div', 'debrief-head');
    head.append(
      el(
        'div',
        'debrief-kicker',
        stats.landmarkName ? stats.landmarkName.toUpperCase() : 'DIVE LOG',
      ),
    );
    head.append(el('h1', 'debrief-title', stats.title ?? 'Dive debrief'));
    p.append(head);

    const score = el('div', 'debrief-rating debrief-score');
    if (rating) {
      const stars = el(
        'span',
        'debrief-stars',
        '★'.repeat(rating.stars) + '☆'.repeat(3 - rating.stars),
      );
      stars.setAttribute('aria-label', `${rating.stars} of 3 stars`);
      score.append(stars, el('span', undefined, `${rating.points} research points`));
    }
    const metric = (field: string, value: string, label: string): void => {
      const item = el('span', 'debrief-score-item');
      item.dataset.field = field;
      item.append(el('span', 'debrief-value', value), el('span', undefined, ` ${label}`));
      score.append(item);
    };
    metric(
      'discoveries',
      String(stats.discoveries.length),
      stats.discoveries.length === 1 ? 'scan' : 'scans',
    );
    if (stats.objectives) {
      metric(
        'objectives',
        `${stats.objectives.completed} of ${stats.objectives.total}`,
        'objectives',
      );
    }
    p.append(score);
    const summary = summarizeDive(stats, rating, this.exploration?.());
    p.append(
      el('p', `debrief-highlight${summary.kind ? ` is-${summary.kind}` : ''}`, summary.highlight),
      el('p', 'debrief-next', `Next: ${summary.next}`),
    );

    const row = el('div', 'debrief-actions');
    const list = actions ?? [
      {
        id: 'dive-again',
        label: 'Dive again',
        primary: true,
        run: () => {
          if (this.options.onDiveAgain) this.options.onDiveAgain();
          else window.location.reload();
        },
      },
      { id: 'journal', label: 'Journal', run: () => this.options.onFieldGuide?.() },
    ];
    // Navigation is the main next step. Resume/replay remain available below it.
    const primary =
      list.find((a) => a.id === 'dive-sites') ?? list.find((a) => a.primary) ?? list[0];
    const navigation = el('div', 'debrief-navigation');
    const secondary = el('div', 'debrief-secondary');
    const more = el('div', 'debrief-more');
    const toggle = el('button', 'debrief-more-toggle', 'More');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const moreBox = el('div', 'debrief-more-items');
    moreBox.hidden = true;
    toggle.addEventListener('click', () => {
      moreBox.hidden = !moreBox.hidden;
      toggle.setAttribute('aria-expanded', String(!moreBox.hidden));
    });
    more.append(toggle, moreBox);
    // One filled primary; at most two quiet links (first choice + Journal); the rest tuck under More.
    const rest = list.filter((a) => a !== primary);
    const quiet = [
      rest.find((a) => a.id !== 'journal' && a.id !== 'home'),
      rest.find((a) => a.id === 'journal'),
    ];
    const mk = (a: DebriefAction, cls: string): HTMLButtonElement => {
      const b = el('button', cls, a.label);
      b.type = 'button';
      b.dataset.action = a.id;
      b.addEventListener('click', () => a.run());
      return b;
    };
    if (primary) navigation.append(mk(primary, 'debrief-btn is-primary'));
    for (const a of quiet) if (a) secondary.append(mk(a, 'debrief-btn'));
    for (const a of rest) if (!quiet.includes(a)) moreBox.append(mk(a, 'debrief-btn'));
    if (moreBox.childElementCount) secondary.append(more);
    row.append(navigation, secondary);
    p.append(row);

    this.open_ = true;
    this.root.hidden = false;
    // Returning from Keep exploring creates a new summary in the same panel.
    p.scrollTop = 0;
    this.trap.activate();
  }

  hide(): void {
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  dispose(): void {
    this.trap.deactivate();
    this.root.remove();
  }
}
