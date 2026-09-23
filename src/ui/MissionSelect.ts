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
 */

import type { MissionSummary } from '../game/Mission.js';
import type { TileIndexEntry } from '../util/types.js';

export interface MissionSelectOptions {
  parent?: HTMLElement;
  currentTileId?: string;
  /** The running mission, highlighted in the MISSIONS list. */
  currentMissionId?: string;
  /** Start collapsed behind a toggle button (used while a mission runs). */
  collapsed?: boolean;
  onSelect?: (id: string) => void;
  onSelectMission?: (id: string) => void;
}

/** URL for a mission: only `?mission=` (plus `?tier=`, a machine setting). */
export function missionUrl(href: string, missionId: string): string {
  const url = new URL(href);
  const tier = url.searchParams.get('tier');
  url.search = '';
  url.searchParams.set('mission', missionId);
  if (tier) url.searchParams.set('tier', tier);
  return url.toString();
}

/** URL for a free dive on a tile: drops `?mission=`, which would otherwise win. */
export function tileUrl(href: string, tileId: string): string {
  const url = new URL(href);
  url.searchParams.delete('mission');
  url.searchParams.delete('skipBriefing');
  url.searchParams.set('tile', tileId);
  return url.toString();
}

export class MissionSelect {
  readonly root: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly missionsEl: HTMLDivElement;
  private readonly toggleEl: HTMLButtonElement;
  private readonly tileIds: Set<string>;

  constructor(
    tiles: TileIndexEntry[],
    private readonly options: MissionSelectOptions = {},
  ) {
    const { parent = document.body, currentTileId, onSelect } = options;
    this.tileIds = new Set(tiles.map((t) => t.id));
    this.root = document.createElement('div');
    this.root.className = 'mission-select';

    this.toggleEl = document.createElement('button');
    this.toggleEl.type = 'button';
    this.toggleEl.className = 'mission-select-toggle';
    this.toggleEl.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    this.root.appendChild(this.toggleEl);

    this.body = document.createElement('div');
    this.body.className = 'mission-select-body';
    this.root.appendChild(this.body);

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
      this.body.appendChild(btn);
    }

    this.setCollapsed(options.collapsed ?? false);
    parent.appendChild(this.root);
  }

  get collapsed(): boolean {
    return this.root.classList.contains('is-collapsed');
  }

  setCollapsed(collapsed: boolean): void {
    this.root.classList.toggle('is-collapsed', collapsed);
    this.body.hidden = collapsed;
    this.toggleEl.textContent = collapsed ? 'DIVE SITES ▸' : 'HIDE ◂';
    this.toggleEl.setAttribute('aria-expanded', String(!collapsed));
    // Outside a mission there is nothing to collapse for; keep the old look.
    this.toggleEl.hidden = !collapsed && !this.options.currentMissionId;
  }

  /** Fill the MISSIONS section. An empty list hides it. */
  setMissions(missions: MissionSummary[]): void {
    const box = this.missionsEl;
    box.replaceChildren();
    box.hidden = missions.length === 0;
    if (!missions.length) return;

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
      if (!available) btn.classList.add('is-unavailable');
      if (m.id === this.options.currentMissionId) btn.classList.add('is-current');

      const name = document.createElement('span');
      name.className = 'mission-item-name';
      name.textContent = m.title;
      const badge = document.createElement('span');
      badge.className = `mission-badge${available ? ' is-available' : ''}`;
      badge.textContent = available ? 'TILE AVAILABLE' : 'TILE MISSING';
      const row = document.createElement('span');
      row.className = 'mission-item-row';
      row.append(name, badge);

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
