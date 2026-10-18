/**
 * Mission objectives HUD panel. The top-right list shows all short missions;
 * long missions show the current objective and the next few. Navigation and
 * the current hint sit under the list; Esc keeps the full list available.
 * Under it: the completion banner ("Primary objectives complete" with Keep
 * exploring / Surface and debrief). On phones only the banner shows; the
 * guidance slot carries the current objective.
 *
 * Bearings use the HUD's compass convention (0 = north, 90 = east); the
 * router computes them with `headingFromForward` from geo.ts, the same maths
 * the HUD heading reduces to. Text writes are skipped when unchanged.
 */

import { hudRegions } from './hudRegions.js';
import type { ObjectiveStatus } from '../game/Mission.js';

export interface NavReadout {
  id: string;
  name: string;
  primary: boolean;
  /** 0 = north, 90 = east. */
  bearingDeg: number;
  /** Target depth, positive metres. */
  depthM: number;
  /** Bearing minus current heading, -180..180 (+ = to starboard). */
  relativeDeg: number;
}

/** The completion banner: a title, a detail line and the two end-of-dive choices. */
export interface CompletionBanner {
  /** 0 to 3; omitted when the dive is not rated. */
  stars?: number;
  title: string;
  detail: string;
  onKeepExploring: () => void;
  onSurface: () => void;
}

/** "AHEAD" inside ±`aheadDeg`, else e.g. "35° STBD" / "120° PORT". */
export function formatTurn(relativeDeg: number, aheadDeg = 10): string {
  const a = Math.round(Math.abs(relativeDeg));
  if (a <= aheadDeg) return 'AHEAD';
  return `${a}° ${relativeDeg > 0 ? 'STBD' : 'PORT'}`;
}

/** The progress line: "1 of 4 objectives · 1 of 2 primary" (resolvable objectives only). */
export function formatProgress(objectives: readonly ObjectiveStatus[]): string {
  const live = objectives.filter((o) => o.resolved);
  const done = live.filter((o) => o.complete).length;
  const primary = live.filter((o) => o.primary);
  const primaryDone = primary.filter((o) => o.complete).length;
  const all = `${done} of ${live.length} objectives`;
  if (live.length && done === live.length) return `${all} · all complete`;
  if (primary.length && primaryDone === primary.length) return `${all} · primaries done`;
  return `${all} · ${primaryDone} of ${primary.length} primary`;
}

/** Keep an instruction visible while navigation waits for its first position. */
export function currentObjectiveId(
  objectives: readonly ObjectiveStatus[],
  preferred: string | null,
): string | null {
  const current = objectives.find((o) => o.id === preferred && !o.complete);
  return (
    (
      current ??
      objectives.find((o) => !o.complete && o.primary && o.resolved) ??
      objectives.find((o) => !o.complete && o.resolved) ??
      objectives.find((o) => !o.complete && o.primary) ??
      objectives.find((o) => !o.complete) ??
      objectives.find((o) => o.primary) ??
      objectives[0]
    )?.id ?? null
  );
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
  private readonly navEl: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly hintEl: HTMLDivElement;
  private objectives: readonly ObjectiveStatus[] = [];
  private currentId: string | null = null;
  private readonly progressEl: HTMLDivElement;
  private readonly bannerEl: HTMLDivElement;
  private readonly bannerTitle: HTMLElement;
  private readonly bannerDetail: HTMLElement;
  private readonly bannerStars: HTMLElement;
  private banner: CompletionBanner | null = null;
  private wanted = true;
  /** The guidance card is showing, so the hint line stays down. */
  private guided = false;
  private readonly navText = new Map<string, HTMLSpanElement>();
  private readonly cache = new Map<string, string>();

  constructor(parent: HTMLElement = hudRegions()) {
    this.root = el('div', 'objectives-panel');
    this.root.setAttribute('aria-label', 'Mission objectives');
    const head = el('div', 'obj-head');
    this.titleEl = el('span', 'obj-title', 'MISSION');
    head.append(this.titleEl);
    this.navEl = el('div', 'obj-nav');
    this.listEl = el('div', 'obj-list');
    this.hintEl = el('div', 'obj-hint');
    for (const f of ['target', 'bearing', 'depth', 'turn']) {
      const span = el('span', `obj-nav-${f}`);
      this.navText.set(f, span);
      this.navEl.append(span);
    }
    this.progressEl = el('div', 'obj-progress');
    // Completion banner. Never takes focus: the player's hands are on the
    // flight keys, and Space/Enter on a focused button would end the dive.
    this.bannerEl = el('div', 'obj-banner');
    this.bannerEl.setAttribute('role', 'status');
    this.bannerEl.hidden = true;
    this.bannerTitle = el('strong', 'obj-banner-title');
    this.bannerStars = el('span', 'obj-banner-stars');
    this.bannerDetail = el('span', 'obj-banner-detail');
    const text = el('div', 'obj-banner-text');
    // Stars share the summary line so the banner does not grow taller on phones.
    const summary = el('div', 'obj-banner-summary');
    summary.append(this.bannerStars, this.bannerDetail);
    text.append(this.bannerTitle, summary);
    const actions = el('div', 'obj-banner-actions');
    const keep = el('button', 'obj-banner-btn is-keep', 'Keep exploring');
    const surface = el('button', 'obj-banner-btn is-surface', 'Surface and debrief');
    for (const b of [keep, surface]) {
      b.type = 'button';
      // Pointer activation keeps flight focus; deliberate Tab navigation
      // still reaches both choices through their native button behavior.
      b.addEventListener('mousedown', (e) => e.preventDefault());
    }
    keep.addEventListener('click', () => this.banner?.onKeepExploring());
    surface.addEventListener('click', () => this.banner?.onSurface());
    actions.append(keep, surface);
    this.bannerEl.append(text, actions);

    this.root.append(head, this.listEl, this.navEl, this.hintEl, this.progressEl, this.bannerEl);
    parent.appendChild(this.root);
  }

  setVisible(visible: boolean): void {
    this.wanted = visible;
    this.sync();
  }

  /** True when the nav line on screen names `name` (its bearing and range then cover the waypoint label). */
  showsTarget(name: string): boolean {
    return (
      !this.root.hidden &&
      (this.navText.get('target')?.textContent ?? '').toLowerCase().includes(name.toLowerCase())
    );
  }

  /** Hide the hint line while the guidance card carries an instruction; it returns when the card empties. */
  setGuided(guided: boolean): void {
    if (this.guided === guided) return;
    this.guided = guided;
    this.hintEl.hidden = guided || !this.hintEl.textContent;
  }

  /** Phones show only the completion banner; the guidance slot names the objective. */
  private sync(): void {
    const touch = document.documentElement.classList.contains('is-touch');
    this.root.hidden = !this.wanted || (touch && this.bannerEl.hidden);
  }

  setTitle(title: string): void {
    this.titleEl.textContent = `MISSION · ${title.toUpperCase()}`;
    // Long titles are truncated by CSS; the full text stays on hover.
    this.titleEl.title = this.titleEl.textContent;
  }

  /** Refresh the "n of m" progress line. Cheap; called when an objective changes. */
  setObjectives(objectives: readonly ObjectiveStatus[]): void {
    this.objectives = objectives;
    this.currentId = currentObjectiveId(objectives, this.currentId);
    this.write(this.progressEl, 'progress', formatProgress(objectives));
    this.renderList();
  }

  /** Show the completion banner (replacing any open one). */
  showBanner(banner: CompletionBanner): void {
    this.banner = banner;
    this.bannerTitle.textContent = banner.title;
    this.bannerDetail.textContent = banner.detail;
    const stars = banner.stars ?? 0;
    this.bannerStars.hidden = banner.stars === undefined;
    this.bannerStars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.bannerStars.setAttribute('aria-label', `${stars} of 3 stars`);
    this.bannerEl.hidden = false;
    this.sync();
  }

  hideBanner(): void {
    this.banner = null;
    this.bannerEl.hidden = true;
    this.sync();
  }

  get bannerOpen(): boolean {
    return !this.bannerEl.hidden;
  }

  /** The nav line; `allPrimaryDone` marks the target as optional, or shows a notice when none is left. */
  setNav(nav: NavReadout | null, allPrimaryDone: boolean): void {
    this.sync();
    const currentId = currentObjectiveId(this.objectives, nav?.id ?? this.currentId);
    if (this.currentId !== currentId) {
      this.currentId = currentId;
      this.renderList();
    }
    const t = (f: string, text: string): void => {
      const span = this.navText.get(f);
      if (span) this.write(span, `nav-${f}`, text);
    };
    this.navEl.classList.toggle('is-done', allPrimaryDone);
    if (!nav) {
      const allDone = allPrimaryDone && !this.objectives.some((o) => o.resolved && !o.complete);
      t('target', allDone ? 'ALL OBJECTIVES COMPLETE' : 'NO TARGET POSITION');
      for (const f of ['bearing', 'depth', 'turn']) t(f, '');
      return;
    }
    const prefix = nav.primary ? '→ ' : 'OPTIONAL → ';
    t('target', `${prefix}${nav.name.toUpperCase()}`);
    t('bearing', `BRG ${String(Math.round(nav.bearingDeg) % 360).padStart(3, '0')}°`);
    t('depth', `DEPTH ${Math.round(nav.depthM).toLocaleString('en-US')} m`);
    t('turn', formatTurn(nav.relativeDeg));
  }

  private renderList(): void {
    // Finished rows collapse into the progress line while something is outstanding,
    // so the list and the nav line below it both point at what is next.
    const open = this.objectives.filter((o) => !o.complete);
    const sorted = [...(open.length ? open : this.objectives)].sort(
      (a, b) => Number(b.primary) - Number(a.primary),
    );
    const current = sorted.find((o) => o.id === this.currentId);
    // For a long mission, continue from the active objective and wrap to the
    // next entries if it is near the end of the ordered list.
    const start = Math.max(0, sorted.indexOf(current ?? sorted[0]!));
    const shown =
      sorted.length < 6 ? sorted : [...sorted.slice(start), ...sorted.slice(0, start)].slice(0, 4);
    this.listEl.replaceChildren(
      ...shown.map((objective) => {
        const row = el('div', 'obj-item');
        row.dataset.objective = objective.id;
        if (objective.id === this.currentId) row.setAttribute('aria-current', 'step');
        row.classList.toggle('is-current', objective.id === this.currentId);
        row.classList.toggle('is-optional', !objective.primary);
        row.classList.toggle('is-complete', objective.complete);
        const check = el('span', 'obj-check', objective.complete ? '✓' : '○');
        const title = el('span', 'obj-item-title', objective.title);
        row.append(check, title);
        if (!objective.primary) row.append(el('span', 'obj-optional', 'OPTIONAL'));
        return row;
      }),
    );
    const more = sorted.length - shown.length;
    if (more > 0) this.listEl.append(el('div', 'obj-more', `+${more} more · Esc for all`));
    this.hintEl.textContent = current?.hint ?? '';
    this.hintEl.hidden = this.guided || !current?.hint;
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
