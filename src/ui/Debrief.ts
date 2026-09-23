/**
 * End-of-dive debrief (DOM): distance, max depth, elapsed time, what was
 * scanned this dive and which field-guide entries are new. B3's mission flow
 * calls `show()` on completion; `?debrief=1` opens it for screenshots.
 */

import type { DebriefStats } from '../game/Objectives.js';
import { FocusTrap } from './FocusTrap.js';

export interface DebriefOptions {
  /** Default: reload the same URL. */
  onDiveAgain?: () => void;
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

  show(stats: DebriefStats): void {
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

    const grid = el('div', 'debrief-stats');
    const stat = (label: string, value: string, field: string): void => {
      const cell = el('div', 'debrief-stat');
      cell.dataset.field = field;
      cell.append(el('span', 'debrief-label', label), el('span', 'debrief-value', value));
      grid.append(cell);
    };
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
      'NEW FIELD-GUIDE ENTRIES',
      stats.newEntries.map((e) => e.title),
      'No new entries.',
      'is-new',
    );
    p.append(lists);

    const actions = el('div', 'debrief-actions');
    const again = el('button', 'debrief-btn is-primary', 'Dive again');
    again.type = 'button';
    again.addEventListener('click', () => {
      if (this.options.onDiveAgain) this.options.onDiveAgain();
      else window.location.reload();
    });
    const guide = el('button', 'debrief-btn', 'Field guide');
    guide.type = 'button';
    guide.addEventListener('click', () => this.options.onFieldGuide?.());
    actions.append(again, guide);
    p.append(actions);

    this.open_ = true;
    this.root.hidden = false;
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
