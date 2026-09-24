/**
 * Mission briefing card (B3), shown before the dive. While it is open the
 * mission router freezes the game (no physics, input ignored); "Begin dive"
 * or Enter closes it. All text goes in via `textContent`: mission.json is
 * content, not markup.
 *
 * Keyboard (QA-B #12): Tab is trapped inside the card (FocusTrap), so the
 * DIVE SITES / mission buttons behind it are unreachable. Escape deliberately
 * does nothing here: there is nothing behind the briefing to return to, and
 * starting the dive on Escape would be a surprise. Enter begins the dive.
 *
 * Art direction §0: monospace, 1px hairlines, flat translucent panel, cyan
 * for headings, amber for hazards, the memorial note quiet and italic.
 */

import { FocusTrap } from './FocusTrap.js';
import type { MissionStartPosition } from '../game/MissionRouter.js';

export interface BriefingContent {
  kicker: string;
  title: string;
  summary: string;
  /** Label/value pairs under the title, e.g. ["TARGET DEPTH", "3,800 m"]. */
  meta: Array<[string, string]>;
  facts: string[];
  hazards: string[];
  memorialNote?: string;
  objectives: Array<{ title: string; primary: boolean }>;
  /** Key label / what it does. */
  controls: Array<[string, string]>;
  startPosition?: MissionStartPosition;
}

export interface BriefingOptions {
  onBegin: (choice: MissionStartPosition) => void;
  parent?: HTMLElement;
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

export class Briefing {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private open_ = false;
  private readonly onKey: (e: KeyboardEvent) => void;
  private readonly trap: FocusTrap;
  private choice: MissionStartPosition = 'near-site';

  constructor(private readonly options: BriefingOptions) {
    this.root = el('div', 'briefing');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Mission briefing');
    this.panel = el('div', 'briefing-panel');
    this.root.append(this.panel);
    (options.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root);

    this.onKey = (e) => {
      if (!this.open_ || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
      e.preventDefault(); // or a focused button would also fire a click
      this.begin();
    };
    window.addEventListener('keydown', this.onKey);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  show(c: BriefingContent): void {
    const p = this.panel;
    p.replaceChildren();
    this.choice = c.startPosition ?? 'near-site';

    const head = el('div', 'briefing-head');
    head.append(el('div', 'briefing-kicker', c.kicker), el('h1', 'briefing-title', c.title));
    if (c.meta.length) {
      const meta = el('div', 'briefing-meta');
      for (const [label, value] of c.meta) {
        const cell = el('div', 'briefing-meta-cell');
        cell.append(el('span', 'briefing-label', label), el('span', 'briefing-value', value));
        meta.append(cell);
      }
      head.append(meta);
    }
    p.append(head);
    if (c.summary) p.append(el('p', 'briefing-summary', c.summary));

    const cols = el('div', 'briefing-cols');
    const left = el('div', 'briefing-col');
    const right = el('div', 'briefing-col');
    const list = (title: string, items: string[], cls: string, into: HTMLElement): void => {
      if (!items.length) return;
      const s = el('section', `briefing-section ${cls}`);
      s.append(el('h2', 'briefing-section-title', title));
      const ul = el('ul');
      for (const i of items) ul.append(el('li', undefined, i));
      s.append(ul);
      into.append(s);
    };
    list('FACTS', c.facts, 'is-facts', left);
    list('HAZARDS', c.hazards, 'is-hazards', left);

    const obj = el('section', 'briefing-section is-objectives');
    obj.append(el('h2', 'briefing-section-title', 'OBJECTIVES'));
    const ol = el('ul', 'briefing-objectives');
    for (const o of c.objectives) {
      const li = el('li', o.primary ? 'is-primary' : 'is-secondary');
      li.append(
        el('span', 'briefing-box', '☐'),
        el('span', 'briefing-obj-title', o.title),
        el('span', 'briefing-obj-tag', o.primary ? 'PRIMARY' : 'OPTIONAL'),
      );
      ol.append(li);
    }
    obj.append(ol);
    right.append(obj);

    const ctl = el('section', 'briefing-section is-controls');
    ctl.append(el('h2', 'briefing-section-title', 'CONTROLS'));
    const grid = el('div', 'briefing-controls');
    for (const [key, what] of c.controls) {
      grid.append(el('span', 'briefing-key', key), el('span', 'briefing-key-desc', what));
    }
    ctl.append(grid);
    right.append(ctl);
    // The memorial note sits under the controls, where the right column has
    // room, so the whole card fits a 1280x800 window without scrolling.
    if (c.memorialNote) right.append(el('p', 'briefing-memorial', c.memorialNote));
    cols.append(left, right);
    p.append(cols);

    // The start choice sits in the sticky footer beside Begin, so it is
    // always visible even when the card scrolls.
    const start = el('div', 'briefing-start');
    start.setAttribute('role', 'radiogroup');
    start.setAttribute('aria-label', 'Start position');
    start.append(el('span', 'briefing-section-title', 'START'));
    for (const [value, label, detail] of [
      ['near-site', 'Near site', 'next to the first objective'],
      ['surface', 'Surface', 'full descent'],
    ] as const) {
      const option = el('label', 'briefing-start-option');
      const input = el('input');
      input.type = 'radio';
      input.name = 'briefing-start';
      input.value = value;
      input.checked = this.choice === value;
      input.addEventListener('change', () => {
        if (input.checked) this.choice = value;
      });
      option.append(input, el('span', undefined, label), el('small', undefined, detail));
      start.append(option);
    }
    const foot = el('div', 'briefing-actions');
    const begin = el('button', 'briefing-begin', 'Begin dive');
    begin.type = 'button';
    begin.addEventListener('click', () => this.begin());
    foot.append(begin, el('span', 'briefing-hint', 'OR PRESS ENTER'), start);
    p.append(foot);

    this.open_ = true;
    this.root.hidden = false;
    p.scrollTop = 0;
    this.trap.activate();
  }

  private begin(): void {
    if (!this.open_) return;
    this.hide();
    this.options.onBegin(this.choice);
  }

  hide(): void {
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  dispose(): void {
    this.trap.deactivate();
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
