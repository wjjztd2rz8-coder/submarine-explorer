/**
 * Mission objectives HUD panel. The top-right list shows all short missions;
 * long missions show the current objective and the next few. Navigation and
 * the current hint sit under the list; Esc keeps the full list available.
 * Under it: the amber alert strip and the completion banner
 * ("Primary objectives complete" with Keep exploring / Surface and debrief).
 *
 * Bearings use the HUD's compass convention (0 = north, 90 = east); the
 * router computes them with `headingFromForward` from geo.ts, the same maths
 * the HUD heading reduces to. Text writes are skipped when unchanged.
 */

import type { ObjectiveStatus } from '../game/Mission.js';

export interface NavReadout {
  id: string;
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

/** The completion banner: a title, a detail line and the two end-of-dive choices. */
export interface CompletionBanner {
  title: string;
  detail: string;
  onKeepExploring: () => void;
  onSurface: () => void;
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

/**
 * Short mission name for phone landscape: drop the subtitle after ':' or ',' and
 * the "hydrothermal field" qualifier, e.g. "Lost City hydrothermal field dive"
 * -> "Lost City dive", "Lighthouse Reef: around the Great Blue Hole" -> "Lighthouse Reef".
 */
export function phoneMissionTitle(title: string): string {
  const head = title
    .split(/[:,]/)[0]!
    .replace(/ hydrothermal field/i, '')
    .trim();
  return head || title;
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
  private readonly alertEl: HTMLDivElement;
  private readonly bannerEl: HTMLDivElement;
  private readonly bannerTitle: HTMLElement;
  private readonly bannerDetail: HTMLElement;
  private banner: CompletionBanner | null = null;
  private readonly navText = new Map<string, HTMLSpanElement>();
  private readonly cache = new Map<string, string>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(parent: HTMLElement = document.body) {
    this.root = el('div', 'objectives-panel');
    this.root.setAttribute('aria-label', 'Mission objectives');
    const head = el('div', 'obj-head');
    this.titleEl = el('span', 'obj-title', 'MISSION');
    head.append(this.titleEl);
    this.navEl = el('div', 'obj-nav');
    this.listEl = el('div', 'obj-list');
    this.hintEl = el('div', 'obj-hint');
    for (const f of ['target', 'bearing', 'range', 'depth', 'turn']) {
      const span = el('span', `obj-nav-${f}`);
      this.navText.set(f, span);
      this.navEl.append(span);
    }
    this.progressEl = el('div', 'obj-progress');
    // Amber alert strip (e.g. HULL FAILURE — EMERGENCY ASCENT); hidden when empty.
    this.alertEl = el('div', 'obj-alert');
    this.alertEl.setAttribute('role', 'alert');
    this.alertEl.hidden = true;

    // Completion banner. Never takes focus: the player's hands are on the
    // flight keys, and Space/Enter on a focused button would end the dive.
    this.bannerEl = el('div', 'obj-banner');
    this.bannerEl.setAttribute('role', 'status');
    this.bannerEl.hidden = true;
    this.bannerTitle = el('strong', 'obj-banner-title');
    this.bannerDetail = el('span', 'obj-banner-detail');
    const text = el('div', 'obj-banner-text');
    text.append(this.bannerTitle, this.bannerDetail);
    const actions = el('div', 'obj-banner-actions');
    const keep = el('button', 'obj-banner-btn is-keep', 'Keep exploring');
    const surface = el('button', 'obj-banner-btn is-surface', 'Surface and debrief');
    for (const b of [keep, surface]) {
      b.type = 'button';
      b.tabIndex = -1;
      // Keep keyboard focus on the page so flight keys keep working.
      b.addEventListener('mousedown', (e) => e.preventDefault());
    }
    keep.addEventListener('click', () => this.banner?.onKeepExploring());
    surface.addEventListener('click', () => this.banner?.onSurface());
    actions.append(keep, surface);
    this.bannerEl.append(text, actions);

    this.root.append(
      head,
      this.listEl,
      this.navEl,
      this.hintEl,
      this.progressEl,
      this.alertEl,
      this.bannerEl,
    );
    parent.appendChild(this.root);

    // Telemetry sits below this panel; track its live height.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.syncPanelBottom());
      this.resizeObserver.observe(this.root);
    }
  }

  private syncPanelBottom(): void {
    const bottom = this.root.hidden ? 0 : this.root.getBoundingClientRect().bottom;
    if (bottom > 0) {
      document.documentElement.style.setProperty('--obj-panel-bottom', `${Math.ceil(bottom)}px`);
    }
  }

  /** Show (or with null, clear) the amber alert strip. */
  setAlert(text: string | null): void {
    this.write(this.alertEl, 'alert', text ?? '');
    this.alertEl.hidden = !text;
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setTitle(title: string): void {
    const text = `MISSION · ${title.toUpperCase()}`;
    // The prefix has its own span so phone landscape can drop it and fit the name.
    // F-PHONE-CAMERA: a shorter phone label (not smaller text) so long names do not ellipsize.
    this.titleEl.replaceChildren(
      el('span', 'obj-title-prefix', 'MISSION · '),
      el('span', 'obj-title-full', title.toUpperCase()),
      el('span', 'obj-title-short', phoneMissionTitle(title).toUpperCase()),
    );
    // QA-C #2: long titles are truncated by CSS; the full text stays on hover.
    this.titleEl.title = text;
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
    this.bannerEl.hidden = false;
  }

  hideBanner(): void {
    this.banner = null;
    this.bannerEl.hidden = true;
  }

  get bannerOpen(): boolean {
    return !this.bannerEl.hidden;
  }

  /** The nav line; `allPrimaryDone` marks the target as optional, or shows a notice when none is left. */
  setNav(nav: NavReadout | null, allPrimaryDone: boolean): void {
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
      t('target', allPrimaryDone ? 'ALL OBJECTIVES COMPLETE' : 'NO TARGET POSITION');
      for (const f of ['bearing', 'range', 'depth', 'turn']) t(f, '');
      return;
    }
    const prefix = nav.primary ? '→ ' : 'OPTIONAL → ';
    t('target', `${prefix}${nav.name.toUpperCase()}`);
    t('bearing', `BRG ${String(Math.round(nav.bearingDeg) % 360).padStart(3, '0')}°`);
    t('range', `RNG ${formatRange(nav.rangeM)}`);
    t('depth', `DEPTH ${Math.round(nav.depthM).toLocaleString('en-US')} m`);
    t('turn', formatTurn(nav.relativeDeg));
  }

  private renderList(): void {
    const sorted = [...this.objectives].sort((a, b) => Number(b.primary) - Number(a.primary));
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
    this.hintEl.hidden = !current?.hint;
  }

  private write(target: HTMLElement, key: string, text: string): void {
    if (this.cache.get(key) === text) return;
    this.cache.set(key, text);
    target.textContent = text;
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.root.remove();
  }
}
