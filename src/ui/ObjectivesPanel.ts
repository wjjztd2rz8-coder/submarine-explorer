/**
 * Mission objectives HUD panel (B3): the objective checklist (primary first,
 * secondary dimmer), a nav line with bearing and range to the nearest open
 * primary objective, and the current sim-speed multiplier.
 *
 * Bearings use the HUD's compass convention (0 = north, 90 = east); the
 * router computes them with `headingFromForward` from geo.ts, the same maths
 * the HUD heading reduces to. Text writes are skipped when unchanged.
 */

import type { ObjectiveStatus } from '../game/Mission.js';

export interface NavReadout {
  name: string;
  primary: boolean;
  /** 0 = north, 90 = east. */
  bearingDeg: number;
  /** 3D slant range, metres: `RNG`, the same metric the scan panel shows (QA-B #11). */
  rangeM: number;
  /** Target depth, positive metres. */
  depthM: number;
  /** Bearing minus current heading, -180..180 (+ = to starboard). */
  relativeDeg: number;
}

export function formatRange(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

/** "AHEAD" inside ±`aheadDeg`, else e.g. "35° STBD" / "120° PORT". */
export function formatTurn(relativeDeg: number, aheadDeg = 10): string {
  const a = Math.round(Math.abs(relativeDeg));
  if (a <= aheadDeg) return 'AHEAD';
  return `${a}° ${relativeDeg > 0 ? 'STBD' : 'PORT'}`;
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

export class ObjectivesPanel {
  readonly root: HTMLDivElement;
  private readonly titleEl: HTMLSpanElement;
  private readonly speedEl: HTMLSpanElement;
  private readonly listEl: HTMLUListElement;
  private readonly navEl: HTMLDivElement;
  private readonly alertEl: HTMLDivElement;
  private readonly navText = new Map<string, HTMLSpanElement>();
  private readonly cache = new Map<string, string>();

  constructor(parent: HTMLElement = document.body) {
    this.root = el('div', 'objectives-panel');
    this.root.setAttribute('aria-label', 'Mission objectives');
    const head = el('div', 'obj-head');
    this.titleEl = el('span', 'obj-title', 'MISSION');
    this.speedEl = el('span', 'obj-speed', 'SIM 1×');
    head.append(this.titleEl, this.speedEl);
    this.listEl = el('ul', 'obj-list');
    this.navEl = el('div', 'obj-nav');
    for (const f of ['target', 'bearing', 'range', 'depth', 'turn']) {
      const span = el('span', `obj-nav-${f}`);
      this.navText.set(f, span);
      this.navEl.append(span);
    }
    // Amber alert strip (e.g. HULL FAILURE — EMERGENCY ASCENT); hidden when empty.
    this.alertEl = el('div', 'obj-alert');
    this.alertEl.setAttribute('role', 'alert');
    this.alertEl.hidden = true;
    this.root.append(head, this.alertEl, this.listEl, this.navEl);
    parent.appendChild(this.root);
  }

  /** Show (or with null, clear) the amber alert strip under the title. */
  setAlert(text: string | null): void {
    this.write(this.alertEl, 'alert', text ?? '');
    this.alertEl.hidden = !text;
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = `MISSION · ${title.toUpperCase()}`;
  }

  setSimSpeed(multiplier: number): void {
    this.write(this.speedEl, 'speed', `SIM ${multiplier}×`);
    this.speedEl.classList.toggle('is-fast', multiplier > 1);
  }

  /** Rebuild the checklist. Cheap; only called when an objective changes. */
  setObjectives(objectives: readonly ObjectiveStatus[]): void {
    const sorted = [...objectives].sort((a, b) => Number(b.primary) - Number(a.primary));
    this.listEl.replaceChildren(
      ...sorted.map((o) => {
        const li = el('li', 'obj-item');
        li.dataset.objective = o.id;
        li.dataset.primary = String(o.primary);
        li.classList.toggle('is-primary', o.primary);
        li.classList.toggle('is-secondary', !o.primary);
        li.classList.toggle('is-complete', o.complete);
        li.classList.toggle('is-unresolved', !o.resolved);
        li.append(el('span', 'obj-box', o.complete ? '☑' : '☐'), el('span', 'obj-text', o.title));
        return li;
      }),
    );
  }

  /** The nav line; `allPrimaryDone` swaps in a completion notice when nothing primary is left. */
  setNav(nav: NavReadout | null, allPrimaryDone: boolean): void {
    const t = (f: string, text: string): void => {
      const span = this.navText.get(f);
      if (span) this.write(span, `nav-${f}`, text);
    };
    this.navEl.classList.toggle('is-done', allPrimaryDone);
    if (!nav) {
      t('target', allPrimaryDone ? 'ALL PRIMARY OBJECTIVES COMPLETE' : 'NO TARGET POSITION');
      for (const f of ['bearing', 'range', 'depth', 'turn']) t(f, '');
      return;
    }
    const prefix = allPrimaryDone ? 'PRIMARY DONE · NEXT ' : '→ ';
    t('target', `${prefix}${nav.name.toUpperCase()}`);
    t('bearing', `BRG ${String(Math.round(nav.bearingDeg) % 360).padStart(3, '0')}°`);
    t('range', `RNG ${formatRange(nav.rangeM)}`);
    t('depth', `DEPTH ${Math.round(nav.depthM).toLocaleString('en-US')} m`);
    t('turn', formatTurn(nav.relativeDeg));
  }

  private write(target: HTMLElement, key: string, text: string): void {
    if (this.cache.get(key) === text) return;
    this.cache.set(key, text);
    target.textContent = text;
  }

  dispose(): void {
    this.root.remove();
  }
}
