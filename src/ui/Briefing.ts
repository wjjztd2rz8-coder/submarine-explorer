/**
 * Mission briefing card (B3), shown before the dive. While it is open the
 * mission router freezes the game (no physics, input ignored); "Begin dive"
 * or Enter closes it. All text goes in via `textContent`: mission.json is
 * content, not markup.
 *
 * Keyboard (QA-B #12): Tab is trapped inside the card (FocusTrap), so the
 * DIVE SITES / mission buttons behind it are unreachable. Escape returns to
 * home when a cancel action is supplied. Enter begins the dive,
 * except on another focused button or a select, which keep their own action.
 *
 * D2-PREDIVE: the sticky footer holds "Dive settings" (game mode, start
 * position and a "Advanced" disclosure) beside Begin. With
 * {@link Briefing.attachDiveSettings} they edit the saved settings, and a
 * start change is reported so the scene previews the real start pose.
 *
 * Art direction §0: monospace, 1px hairlines, flat translucent panel, cyan
 * for headings, amber for hazards, the memorial note quiet and italic.
 */

import type { GameplayOptions } from '../core/Config.js';
import { el } from './dom.js';
import { FocusTrap } from './FocusTrap.js';
import type { MissionStartPosition } from '../game/MissionRouter.js';
import { ModeSelector, type GameplaySettingsSource } from './ModeSelector.js';

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
  startPosition?: MissionStartPosition;
}

export interface BriefingOptions {
  onBegin: (choice: MissionStartPosition) => void;
  onCancel?: () => void;
  parent?: HTMLElement;
}

/**
 * D2-PREDIVE: what the briefing's Dive settings panel edits. Without it the
 * panel shows only the start choice, for this launch.
 */
export interface DiveSettingsOptions {
  settings: GameplaySettingsSource;
  /** `Config.settings.gameplayOptions`: the values each option offers. */
  choices: { readonly [K in keyof GameplayOptions]: readonly GameplayOptions[K][] };
  /** The start position changed while the briefing is open (move the preview). */
  onStartChange?: (choice: MissionStartPosition) => void;
}

const START_CHOICES = [
  ['near-site', 'near the first target'],
  ['surface', 'at the surface'],
] as const;

let uid = 0;

/** The lines in order, without blanks or repeats (case and spacing ignored). */
function unique(items: readonly string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class Briefing {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly trap: FocusTrap;
  private choice: MissionStartPosition = 'near-site';
  // --- D2-PREDIVE: Dive settings ---
  private readonly uid = ++uid;
  private dive: DiveSettingsOptions | null = null;
  private diveDisposers: Array<() => void> = [];
  private diveSlot: HTMLDivElement | null = null;
  private startInputs: HTMLInputElement[] = [];
  private readonly onPanelKey: (e: KeyboardEvent) => void;
  private modeSelector: ModeSelector | null = null;

  constructor(private readonly options: BriefingOptions) {
    this.root = el('div', 'briefing');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Mission briefing');
    this.panel = el('div', 'briefing-panel');
    this.root.append(this.panel);
    (options.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root, {
      onEscape: options.onCancel
        ? () => {
            this.hide();
            options.onCancel?.();
          }
        : null,
      onKeyDown: (event) => this.handleKeyDown(event),
    });
    // The game's Input swallows Space and the arrows on the window; keys
    // aimed at the card's own controls stop here so buttons, selects and
    // radios keep their native keyboard behaviour. Nothing simulates while
    // the briefing is open, so the game loses nothing.
    this.onPanelKey = (e) => {
      if (['Enter', 'NumpadEnter', 'Escape', 'Tab'].includes(e.code)) return;
      const t = e.target;
      if (t instanceof HTMLElement && t.closest('button, select, input, summary, a'))
        e.stopPropagation();
    };
    this.root.addEventListener('keydown', this.onPanelKey);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isOpen || (e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
    // Enter on another focused button (Advanced, About this site) or a
    // select does that control's job, not Begin.
    const t = e.target;
    if (
      t instanceof HTMLElement &&
      this.root.contains(t) &&
      (t.tagName === 'SELECT' ||
        t.tagName === 'SUMMARY' ||
        t.tagName === 'A' ||
        (t.tagName === 'BUTTON' && !t.classList.contains('briefing-begin')))
    )
      return;
    e.preventDefault(); // or a focused button would also fire a click
    this.begin();
  }

  /** The start position Begin will use. */
  get startChoice(): MissionStartPosition {
    return this.choice;
  }

  /** True while "Advanced" is expanded. */
  get advancedOpen(): boolean {
    return this.modeSelector ? !this.modeSelector.advancedPanel.hidden : false;
  }

  /**
   * D2-PREDIVE: connect the Dive settings panel to the saved settings. The
   * mode, start position and Advanced then read and write `settings`;
   * a start change (here, or from a preset or Settings) calls `onStartChange`.
   */
  attachDiveSettings(dive: DiveSettingsOptions): void {
    for (const d of this.diveDisposers) d();
    this.diveDisposers = [];
    this.dive = dive;
    this.choice = dive.settings.get().gameplay.startPosition;
    this.diveDisposers.push(dive.settings.onChange(() => this.syncDive()));
    this.renderDiveSettings();
  }

  get isOpen(): boolean {
    return this.trap.active;
  }

  show(c: BriefingContent): void {
    const p = this.panel;
    p.replaceChildren();
    this.choice = this.dive
      ? this.dive.settings.get().gameplay.startPosition
      : (c.startPosition ?? 'near-site');

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
    p.append(obj);
    // The memorial note stays on the card; everything else about the site is
    // one collapsed disclosure, each fact and hazard listed once.
    if (c.memorialNote) p.append(el('p', 'briefing-memorial', c.memorialNote));
    const facts = unique(c.facts);
    const hazards = unique(c.hazards).filter((h) => !facts.includes(h));
    if (c.summary || facts.length || hazards.length) {
      const more = el('details', 'briefing-site-more');
      more.append(el('summary', undefined, 'About this site'));
      const extra = el('div', 'briefing-site-extra');
      if (c.summary && c.summary !== c.memorialNote)
        extra.append(el('p', 'briefing-summary', c.summary));
      const list = (title: string, items: string[], cls: string): void => {
        if (!items.length) return;
        const s = el('section', `briefing-section ${cls}`);
        s.append(el('h2', 'briefing-section-title', title));
        const ul = el('ul');
        for (const i of items) ul.append(el('li', undefined, i));
        s.append(ul);
        extra.append(s);
      };
      list('FACTS', facts, 'is-facts');
      list('HAZARDS', hazards, 'is-hazards');
      more.append(extra);
      p.append(more);
    }

    // D2-PREDIVE: Dive settings (mode, start, more options) and Begin share
    // the sticky footer, so they stay visible even when the card scrolls.
    const foot = el('div', 'briefing-actions');
    this.diveSlot = el('div', 'briefing-dive-slot');
    this.renderDiveSettings();
    const go = el('div', 'briefing-go');
    const begin = el('button', 'briefing-begin', 'Begin dive');
    begin.type = 'button';
    begin.addEventListener('click', () => this.begin());
    go.append(el('span', 'briefing-hint', 'OR PRESS ENTER'), begin);
    if (this.options.onCancel) {
      const cancel = el('button', 'briefing-cancel', 'Back to home');
      cancel.type = 'button';
      cancel.addEventListener('click', () => {
        this.hide();
        this.options.onCancel?.();
      });
      go.append(cancel);
    }
    foot.append(this.diveSlot, go);
    p.append(foot);

    p.scrollTop = 0;
    this.trap.show();
  }

  private renderDiveSettings(): void {
    const slot = this.diveSlot;
    if (!slot) return;
    const focusedKey = (document.activeElement as HTMLElement | null)?.dataset?.diveKey;
    this.modeSelector?.dispose();
    this.modeSelector = null;
    const section = el('section', 'briefing-dive');
    section.setAttribute('aria-label', 'Dive settings');
    const row = el('div', 'briefing-dive-row');
    if (this.dive) {
      this.modeSelector = new ModeSelector(
        'is-briefing',
        this.dive.settings,
        'Mode',
        ['startPosition'],
        this.dive.choices,
      );
      row.append(this.modeSelector.root);
    }
    const start = el('div', 'briefing-start');
    start.setAttribute('role', 'radiogroup');
    start.setAttribute('aria-label', 'Start position');
    start.append(el('span', 'briefing-start-label', 'Start:'));
    const segments = el('div', 'briefing-start-segments');
    this.startInputs = [];
    for (const [value, label] of START_CHOICES) {
      const option = el('label', 'briefing-start-option');
      const input = el('input');
      input.type = 'radio';
      input.name = `briefing-start-${this.uid}`;
      input.value = value;
      input.dataset.diveKey = `start-${value}`;
      input.checked = this.choice === value;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        if (this.dive) this.dive.settings.setGameplayOption('startPosition', value);
        else this.choice = value;
      });
      option.append(input, el('span', undefined, label));
      segments.append(option);
      this.startInputs.push(input);
    }
    start.append(segments);
    // Start position is rarely changed: it lives inside the collapsed Advanced disclosure.
    if (this.modeSelector) this.modeSelector.advancedPanel.prepend(start);
    else row.append(start);
    section.append(row);

    slot.replaceChildren(section);
    if (focusedKey) slot.querySelector<HTMLElement>(`[data-dive-key="${focusedKey}"]`)?.focus();
  }

  /** Repaint the Dive settings from the saved values (a preset, Settings, or this card). */
  private syncDive(): void {
    if (!this.dive) return;
    const gameplay = this.dive.settings.get().gameplay;
    for (const input of this.startInputs) input.checked = input.value === gameplay.startPosition;
    if (gameplay.startPosition !== this.choice) {
      this.choice = gameplay.startPosition;
      if (this.isOpen) this.dive.onStartChange?.(this.choice);
    }
  }

  private begin(): void {
    if (!this.isOpen) return;
    this.hide();
    this.options.onBegin(this.choice);
  }

  hide(): void {
    this.trap.hide();
  }

  dispose(): void {
    this.trap.dispose();
    for (const d of this.diveDisposers) d();
    this.modeSelector?.dispose();
    this.root.removeEventListener('keydown', this.onPanelKey);
    this.root.remove();
  }
}
