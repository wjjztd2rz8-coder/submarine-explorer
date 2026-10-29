/** Mission checklist, progress tally and completion choices. Target guidance lives in the guidance slot. */

import { hudRegions } from './hudRegions.js';
import { nextScanObjective, type ObjectiveStatus } from '../game/Mission.js';

/** The completion banner: a title, a detail line and the two end-of-dive choices. */
export interface CompletionBanner {
  /** 0 to 3; omitted when the dive is not rated. */
  stars?: number;
  title: string;
  detail: string;
  onKeepExploring: () => void;
  onSurface: () => void;
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

/** Keep a checklist step selected while mission positions are still loading. */
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
  private readonly listEl: HTMLDivElement;
  private objectives: readonly ObjectiveStatus[] = [];
  private currentId: string | null = null;
  private readonly progressEl: HTMLDivElement;
  private readonly bannerEl: HTMLDivElement;
  private readonly bannerTitle: HTMLElement;
  private readonly bannerDetail: HTMLElement;
  private readonly bannerStars: HTMLElement;
  private banner: CompletionBanner | null = null;
  private readonly cache = new Map<string, string>();

  constructor(parent: HTMLElement = hudRegions()) {
    this.root = el('div', 'objectives-panel');
    this.root.setAttribute('aria-label', 'Mission objectives');
    const head = el('div', 'obj-head');
    this.titleEl = el('span', 'obj-title', 'MISSION');
    head.append(this.titleEl);
    this.listEl = el('div', 'obj-list');
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

    this.root.append(head, this.listEl, this.progressEl, this.bannerEl);
    parent.appendChild(this.root);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setTitle(title: string): void {
    this.titleEl.textContent = `MISSION · ${title.toUpperCase()}`;
    // Long titles are truncated by CSS; the full text stays on hover.
    this.titleEl.title = this.titleEl.textContent;
  }

  /** Refresh the "n of m" progress line. Cheap; called when an objective changes. */
  setObjectives(objectives: readonly ObjectiveStatus[]): void {
    this.objectives = objectives;
    this.currentId = currentObjectiveId(objectives, nextScanObjective(objectives)?.id ?? null);
    this.write(this.progressEl, 'progress', formatProgress(objectives));
    this.renderList();
  }

  /** Show the completion banner (replacing any open one). */
  showBanner(banner: CompletionBanner): void {
    this.banner = banner;
    this.bannerTitle.textContent = banner.title;
    this.bannerDetail.textContent = banner.detail;
    this.setBannerStars(banner.stars);
    this.bannerEl.hidden = false;
  }

  /** Refresh the live rating without reopening the banner or extending its lifetime. */
  setBannerStars(stars?: number): void {
    const key = String(stars);
    if (this.cache.get('banner-stars') === key) return;
    this.cache.set('banner-stars', key);
    this.bannerStars.hidden = stars === undefined;
    const count = stars ?? 0;
    this.bannerStars.textContent = '★'.repeat(count) + '☆'.repeat(3 - count);
    this.bannerStars.setAttribute('aria-label', `${count} of 3 stars`);
  }

  hideBanner(): void {
    this.banner = null;
    this.bannerEl.hidden = true;
  }

  get bannerOpen(): boolean {
    return !this.bannerEl.hidden;
  }

  private renderList(): void {
    // Finished rows collapse into the progress line while something is outstanding,
    // so the checklist continues at the next unfinished objective.
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
