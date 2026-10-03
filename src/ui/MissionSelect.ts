/**
 * Mission / dive-site selector: plain DOM.
 *
 * - MISSIONS (B3): built from `/data/landmarks/index.json` + each listed
 *   `mission.json` (see `loadMissionSummaries` in game/Mission.ts), filled in
 *   asynchronously with {@link MissionSelect.setMissions}. Click -> `?mission=<id>`.
 * - DIVE SITES: free dives, from `/data/tiles/index.json`, which the Python
 *   pipeline rewrites every time a tile is written. Click -> `?tile=<id>`.
 *
 * Selecting reloads the page; a full reload is the simplest correct way to
 * swap tiles while the engine has no teardown path yet, and it keeps the URL
 * shareable. During a mission the panel starts collapsed behind a small
 * toggle so it is not in the way.
 *
 * C1: landmarks listed in index.json whose mission.json has not loaded (the
 * content packs are still being written) are shown as "content coming" rows
 * via {@link MissionSelect.setPending}; a GLOBE button opens the globe
 * mission select ({@link MissionSelect.setGlobeHandler}).
 */

import { requiredHull, type Progress } from '../game/Progress.js';
import type { GameplayMode } from '../core/Save.js';
import type { MissionSummary } from '../game/Mission.js';
import { contentUrl, fetchContentJson } from '../game/ContentPath.js';
import type { TileIndexEntry } from '../util/types.js';

/** C1: a landmark listed in index.json whose mission.json has not loaded yet. */
export interface PendingMission {
  id: string;
  name: string;
  tileAvailable: boolean;
}

export interface MissionSelectOptions {
  parent?: HTMLElement;
  currentTileId?: string;
  /** The running mission, highlighted in the MISSIONS list. */
  currentMissionId?: string;
  /** Start collapsed behind a toggle button (used while a mission runs). */
  collapsed?: boolean;
  onSelect?: (id: string) => void;
  onSelectMission?: (id: string) => void;
  presentation?: 'legacy' | 'shell';
  /** Journal progress for this site, for example "3/5 logged". */
  completion?: (id: string, objectivePois: string[]) => string;
  onSiteFocus?: (id: string) => void;
}

/** URL for a mission: only `?mission=` plus device preferences (`tier`, `touch`). */
export function missionUrl(href: string, missionId: string): string {
  const url = new URL(href);
  const tier = url.searchParams.get('tier');
  const touch = url.searchParams.get('touch');
  url.search = '';
  url.searchParams.set('mission', missionId);
  if (tier) url.searchParams.set('tier', tier);
  if (touch) url.searchParams.set('touch', touch);
  return url.toString();
}

/** URL for a free dive on a tile: drops `?mission=`, which would otherwise win. */
export function tileUrl(href: string, tileId: string): string {
  const url = new URL(href);
  url.searchParams.delete('mission');
  url.searchParams.delete('skipBriefing');
  url.searchParams.delete('globe'); // C1: do not reopen the globe after choosing from it
  url.searchParams.set('tile', tileId);
  return url.toString();
}

export class MissionSelect {
  readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly missionsEl: HTMLDivElement;
  private readonly toggleEl: HTMLButtonElement;
  private readonly tileIds: Set<string>;
  // C1
  private readonly globeBtn: HTMLButtonElement;
  private missions: MissionSummary[] = [];
  private pending: PendingMission[] = [];
  private progress: Progress | null = null;
  private mode: GameplayMode = 'arcade';
  setProgress(progress: Progress, mode: GameplayMode = 'arcade'): void {
    this.progress = progress;
    this.mode = mode;
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-tile]')) {
      let limit = button.querySelector<HTMLElement>('.mission-hull-limit');
      if (mode !== 'realistic') {
        limit?.remove();
        continue;
      }
      if (!limit) {
        limit = document.createElement('span');
        limit.className = 'mission-hull-limit mission-item-meta';
        button.append(limit);
      }
      limit.textContent = `Free dive · hull rated to ${progress.hull.depthM.toLocaleString('en-US')} m`;
    }
    this.renderMissions();
  }

  constructor(
    tiles: TileIndexEntry[],
    private readonly options: MissionSelectOptions = {},
  ) {
    const { parent = document.body, currentTileId, onSelect } = options;
    this.tileIds = new Set(tiles.map((t) => t.id));
    this.root = document.createElement('div');
    this.root.className = 'mission-select';
    if (options.presentation === 'shell') this.root.classList.add('is-shell');

    this.toggleEl = document.createElement('button');
    this.toggleEl.type = 'button';
    this.toggleEl.className = 'mission-select-toggle';
    this.toggleEl.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    this.root.appendChild(this.toggleEl);

    this.body = document.createElement('div');
    this.body.className = 'mission-select-body';
    this.root.appendChild(this.body);

    // C1: GLOBE button, shown once a handler is set.
    this.globeBtn = document.createElement('button');
    this.globeBtn.type = 'button';
    this.globeBtn.className = 'mission-globe-btn';
    this.globeBtn.textContent = 'GLOBE';
    this.globeBtn.title = 'Choose a dive site on the globe';
    this.globeBtn.hidden = true;
    this.body.appendChild(this.globeBtn);

    this.missionsEl = document.createElement('div');
    this.missionsEl.className = 'mission-missions';
    this.missionsEl.hidden = true;
    this.body.appendChild(this.missionsEl);

    const title = document.createElement('div');
    title.className = 'mission-title';
    title.textContent = 'DIVE SITES';
    this.body.appendChild(title);

    if (tiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mission-empty';
      empty.textContent = 'No tiles found. Run tools/fetch_tile.py.';
      this.body.appendChild(empty);
    }

    for (const tile of tiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mission-item';
      btn.dataset.tile = tile.id;
      if (tile.id === currentTileId && !options.currentMissionId) btn.classList.add('is-current');

      const depth =
        typeof tile.min_m === 'number' ? `${Math.abs(Math.round(tile.min_m))} m max depth` : '';
      const size = tile.cols && tile.rows ? `${tile.cols}×${tile.rows}` : '';
      btn.innerHTML =
        `<span class="mission-item-name">${escapeHtml(tile.id)}</span>` +
        `<span class="mission-item-meta">${escapeHtml([depth, size].filter(Boolean).join(' · '))}</span>`;

      btn.addEventListener('click', () => {
        if (onSelect) {
          onSelect(tile.id);
          return;
        }
        window.location.href = tileUrl(window.location.href, tile.id);
      });
      if (options.presentation === 'shell') {
        btn.addEventListener('focus', () => options.onSiteFocus?.(tile.id));
        btn.addEventListener('pointerenter', () => options.onSiteFocus?.(tile.id));
      }
      this.body.appendChild(btn);
    }

    this.setCollapsed(options.collapsed ?? false);
    parent.appendChild(this.root);
  }

  get collapsed(): boolean {
    return this.root.classList.contains('is-collapsed');
  }

  setCollapsed(collapsed: boolean): void {
    if (this.options.presentation === 'shell') collapsed = false;
    this.root.classList.toggle('is-collapsed', collapsed);
    this.body.hidden = collapsed;
    this.toggleEl.textContent = collapsed ? 'DIVE SITES ▸' : 'HIDE ◂';
    this.toggleEl.setAttribute('aria-expanded', String(!collapsed));
    // Outside a mission there is nothing to collapse for; keep the old look.
    this.toggleEl.hidden = !collapsed && !this.options.currentMissionId;
    if (this.options.presentation === 'shell') this.toggleEl.hidden = true;
  }

  showFreeDive(show: boolean): void {
    this.root.classList.toggle('is-free-dive', show);
  }

  highlightSite(id: string): void {
    for (const item of this.root.querySelectorAll<HTMLElement>('[data-mission], [data-pending]')) {
      item.classList.toggle(
        'is-highlighted',
        item.dataset.mission === id || item.dataset.pending === id,
      );
    }
  }

  /** C1: show the GLOBE button; clicking it calls `open`. */
  setGlobeHandler(open: () => void, keyHint = ''): void {
    this.globeBtn.hidden = false;
    this.globeBtn.textContent = keyHint ? `GLOBE  ${keyHint}` : 'GLOBE';
    this.globeBtn.onclick = () => open();
  }

  /** Fill the MISSIONS section. An empty list (and nothing pending) hides it. */
  setMissions(missions: MissionSummary[]): void {
    this.missions = missions;
    this.renderMissions();
  }

  /**
   * C1: index.json ids whose mission.json did not load, shown as "content
   * coming" rows (a free dive on the tile when one exists).
   */
  setPending(pending: PendingMission[]): void {
    const loaded = new Set(this.missions.map((m) => m.id));
    this.pending = pending.filter((p) => !loaded.has(p.id));
    this.renderMissions();
  }

  private renderMissions(): void {
    const missions = this.missions;
    const loaded = new Set(missions.map((m) => m.id));
    const pending = this.pending.filter((p) => !loaded.has(p.id));
    const box = this.missionsEl;
    box.replaceChildren();
    box.hidden = missions.length === 0 && pending.length === 0;
    if (box.hidden) return;

    const title = document.createElement('div');
    title.className = 'mission-title';
    title.textContent = 'MISSIONS';
    box.appendChild(title);

    for (const m of missions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mission-item is-mission';
      btn.dataset.mission = m.id;
      const available = this.tileIds.has(m.tile);
      const locked =
        this.progress !== null && m.depthM !== null && !this.progress.canDive(m.depthM, this.mode);
      if (locked) {
        btn.classList.add('is-locked');
        btn.disabled = true;
      }
      if (!available) btn.classList.add('is-unavailable');
      if (m.id === this.options.currentMissionId) btn.classList.add('is-current');

      const name = document.createElement('span');
      name.className = 'mission-item-name';
      name.textContent = m.title;
      const row = document.createElement('span');
      row.className = 'mission-item-row';
      row.append(name);
      if (!available) {
        const badge = document.createElement('span');
        badge.className = 'mission-badge';
        badge.textContent = 'TILE MISSING';
        row.append(badge);
      }

      const meta = document.createElement('span');
      meta.className = 'mission-item-meta';
      meta.textContent = [
        m.depthM !== null ? `${Math.round(m.depthM).toLocaleString('en-US')} m` : '',
        m.tile,
      ]
        .filter(Boolean)
        .join(' · ');
      const summary = document.createElement('span');
      summary.className = 'mission-item-summary';
      summary.textContent = m.summary;
      btn.append(row, meta, summary);
      if (this.progress) {
        const stars = document.createElement('span');
        stars.className = 'mission-stars';
        const best = this.progress.rating(m.id);
        stars.textContent = '★'.repeat(best) + '☆'.repeat(3 - best);
        stars.setAttribute('aria-label', `Best dive: ${best} of 3 stars`);
        btn.append(stars);
        if (locked) {
          const hull = requiredHull(m.depthM!);
          const lock = document.createElement('span');
          lock.className = 'mission-lock';
          lock.textContent = `🔒 Class ${hull.id} · ${hull.threshold} lifetime RP required (${this.progress.lifetime} earned)`;
          btn.append(lock);
        }
      }
      if (this.options.presentation === 'shell') {
        const progress = document.createElement('span');
        progress.className = 'mission-item-progress';
        progress.textContent = 'Journal · 0 logged';
        btn.append(progress);
        void fetchContentJson(contentUrl(m.id, 'mission.json')).then((raw) => {
          if (!btn.isConnected || typeof raw !== 'object' || raw === null) return;
          const doc = raw as { hull_class?: unknown; objectives?: unknown };
          const hull =
            this.progress && m.depthM !== null
              ? `Class ${requiredHull(m.depthM).id} hull`
              : typeof doc.hull_class === 'string'
                ? `Class ${doc.hull_class} hull`
                : 'Hull class unknown';
          meta.textContent = [
            m.depthM !== null ? `${Math.round(m.depthM).toLocaleString('en-US')} m` : '',
            hull,
          ]
            .filter(Boolean)
            .join(' · ');
          const pois = Array.isArray(doc.objectives)
            ? doc.objectives.flatMap((o: unknown) => {
                const poi = (o as { poi?: unknown } | null)?.poi;
                return typeof poi === 'string' ? [poi] : [];
              })
            : [];
          progress.textContent = this.options.completion?.(m.id, pois) ?? `0/${pois.length} logged`;
        });
        btn.addEventListener('focus', () => this.highlightSite(m.id));
        btn.addEventListener('pointerenter', () => this.highlightSite(m.id));
        btn.addEventListener('focus', () => this.options.onSiteFocus?.(m.id));
        btn.addEventListener('pointerenter', () => this.options.onSiteFocus?.(m.id));
      }
      btn.title = m.summary;

      btn.addEventListener('click', () => {
        if (this.options.onSelectMission) {
          this.options.onSelectMission(m.id);
          return;
        }
        window.location.href = missionUrl(window.location.href, m.id);
      });
      box.appendChild(btn);
    }

    for (const p of pending) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mission-item is-pending';
      btn.dataset.pending = p.id;
      const name = document.createElement('span');
      name.className = 'mission-item-name';
      name.textContent = p.name;
      const badge = document.createElement('span');
      badge.className = 'mission-badge is-coming';
      badge.textContent = 'CONTENT COMING';
      const row = document.createElement('span');
      row.className = 'mission-item-row';
      row.append(name, badge);
      const meta = document.createElement('span');
      meta.className = 'mission-item-meta';
      meta.textContent = p.tileAvailable ? 'free dive on the survey tile' : 'no tile yet';
      btn.append(row, meta);
      if (p.tileAvailable) {
        if (this.options.presentation === 'shell') {
          btn.addEventListener('focus', () => this.options.onSiteFocus?.(p.id));
          btn.addEventListener('pointerenter', () => this.options.onSiteFocus?.(p.id));
        }
        btn.addEventListener('click', () => {
          if (this.options.onSelect) this.options.onSelect(p.id);
          else window.location.href = tileUrl(window.location.href, p.id);
        });
      } else {
        btn.disabled = true;
      }
      box.appendChild(btn);
    }
  }

  dispose(): void {
    this.root.remove();
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      (
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }) as Record<
          string,
          string
        >
      )[ch] as string,
  );
}
