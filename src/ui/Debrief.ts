/**
 * End-of-dive debrief (DOM): objectives, distance, max depth, elapsed time,
 * what was scanned this dive and which Journal entries are new. The mission
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
    if (stats.subtitle) {
      // Objectives and time already have their own cells; keep the outcome once.
      const subtitle = stats.objectives
        ? stats.subtitle.replace(/ · \d+ of \d+ objectives · [\d:]+$/, '')
        : stats.subtitle;
      head.append(el('p', 'debrief-subtitle', subtitle));
    }
    p.append(head);
    if (rating) {
      const row = el('div', 'debrief-rating');
      const stars = el(
        'span',
        'debrief-stars',
        '★'.repeat(rating.stars) + '☆'.repeat(3 - rating.stars),
      );
      stars.setAttribute('aria-label', `${rating.stars} of 3 stars`);
      row.append(stars, el('span', undefined, `${rating.points} research points earned`));
      row.append(
        el(
          'small',
          undefined,
          rating.stars === 3
            ? 'All objectives + photo or species goal'
            : rating.stars === 2
              ? 'Every objective · add a photo or species scan for 3 stars'
              : rating.stars === 1
                ? 'Primaries complete · finish secondaries for 2 stars'
                : 'Finish the primary objectives to earn a star',
        ),
      );
      p.append(row);
    }

    const grid = el('div', 'debrief-stats');
    const stat = (label: string, value: string, field: string): void => {
      const cell = el('div', 'debrief-stat');
      cell.dataset.field = field;
      cell.append(el('span', 'debrief-label', label), el('span', 'debrief-value', value));
      grid.append(cell);
    };
    if (stats.objectives) {
      const { completed, total } = stats.objectives;
      stat('OBJECTIVES', `${completed} of ${total}`, 'objectives');
      grid.className += ' has-objectives';
    }
    stat('SCANS', String(stats.discoveries.length), 'discoveries');
    stat('DISTANCE', formatDistance(stats.distanceM), 'distance');
    stat('MAX DEPTH', `${Math.round(stats.maxDepthM).toLocaleString('en-US')} m`, 'maxDepth');
    stat('DIVE TIME', formatDuration(stats.elapsedS), 'elapsed');
    p.append(grid);

    const lists = el('div', 'debrief-lists');
    const section = (title: string, items: string[], cls: string): void => {
      if (!items.length) return;
      const s = el('div', `debrief-section ${cls}`);
      s.append(el('h2', 'debrief-section-title', title));
      if (items.length) {
        const ul = el('ul');
        for (const i of items) ul.append(el('li', undefined, i));
        s.append(ul);
      }
      lists.append(s);
    };
    section(
      'SCANNED THIS DIVE',
      stats.discoveries.map((d) => d.name),
      'is-discoveries',
    );
    if (stats.newEntries.length) {
      const count = stats.newEntries.length;
      lists.append(
        el(
          'p',
          'debrief-journal-summary',
          `${count} new Journal ${count === 1 ? 'entry' : 'entries'}`,
        ),
      );
    } else if (!stats.discoveries.length) {
      lists.append(el('p', 'debrief-empty', 'Hold Scan near a target to add a Journal entry.'));
    }
    const exploration = this.exploration?.();
    if (exploration && exploration.total) {
      section(
        `SECRETS FOUND ${exploration.found}/${exploration.total}`,
        exploration.secrets,
        'is-secrets',
      );
      section('SAMPLES COLLECTED', exploration.samples, 'is-samples');
      if (exploration.events.length) section('EVENTS WITNESSED', exploration.events, 'is-events');
    }
    p.append(lists);

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
    const more = el('details', 'debrief-more');
    more.append(el('summary', 'debrief-more-toggle', 'More'));
    const moreBox = el('div', 'debrief-more-items');
    more.append(moreBox);
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
