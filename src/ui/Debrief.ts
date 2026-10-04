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
    if (stats.subtitle) head.append(el('p', 'debrief-subtitle', stats.subtitle));
    p.append(head);
    if (rating) {
      const row = el('div', 'debrief-rating');
      const stars = el(
        'span',
        'debrief-stars',
        '★'.repeat(rating.stars) + '☆'.repeat(3 - rating.stars),
      );
      stars.setAttribute('aria-label', `${rating.stars} of 3 stars`);
      row.append(stars, el('span', undefined, `${rating.points} RP earned this dive`));
      row.append(
        el(
          'small',
          undefined,
          rating.stars === 3
            ? 'Every objective + photo or species goal'
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
    }
    stat('DISTANCE', formatDistance(stats.distanceM), 'distance');
    stat('MAX DEPTH', `${Math.round(stats.maxDepthM).toLocaleString('en-US')} m`, 'maxDepth');
    stat('DIVE TIME', formatDuration(stats.elapsedS), 'elapsed');
    stat('SCANS', String(stats.discoveries.length), 'discoveries');
    p.append(grid);

    const lists = el('div', 'debrief-lists');
    const section = (title: string, items: string[], empty: string, cls: string): void => {
      const s = el('div', `debrief-section ${cls}`);
      s.append(el('h2', 'debrief-section-title', title));
      if (items.length) {
        const ul = el('ul');
        for (const i of items) ul.append(el('li', undefined, i));
        s.append(ul);
      } else {
        s.append(el('p', 'debrief-empty', empty));
      }
      lists.append(s);
    };
    section(
      'DISCOVERIES THIS DIVE',
      stats.discoveries.map((d) => d.name),
      'Nothing scanned this dive.',
      'is-discoveries',
    );
    section(
      'NEW JOURNAL ENTRIES',
      stats.newEntries.map((e) => e.title),
      'No new entries.',
      'is-new',
    );
    const exploration = this.exploration?.();
    if (exploration && exploration.total) {
      section(
        `SECRETS FOUND ${exploration.found}/${exploration.total}`,
        exploration.secrets,
        'Follow faint nearby sonar contacts to find secrets.',
        'is-secrets',
      );
      section(
        'SAMPLES COLLECTED',
        exploration.samples,
        'No samples collected this dive.',
        'is-samples',
      );
      if (exploration.events.length)
        section('EVENTS WITNESSED', exploration.events, '', 'is-events');
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
    for (const a of list) {
      const b = el('button', a.primary ? 'debrief-btn is-primary' : 'debrief-btn', a.label);
      b.type = 'button';
      b.dataset.action = a.id;
      b.addEventListener('click', () => a.run());
      row.append(b);
    }
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
