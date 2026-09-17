/**
 * Mission (tile) selector: a plain DOM list built from `/data/tiles/index.json`,
 * which the Python pipeline rewrites every time a tile is written.
 *
 * Selecting a tile reloads the page with `?tile=<id>`; a full reload is the
 * simplest correct way to swap tiles while the engine has no teardown path yet,
 * and it keeps the URL shareable. (Extension point: emit `ui:selectTile` on the
 * bus and hot-swap instead.)
 */

import type { TileIndexEntry } from '../util/types.js';

export interface MissionSelectOptions {
  parent?: HTMLElement;
  currentTileId?: string;
  onSelect?: (id: string) => void;
}

export class MissionSelect {
  readonly root: HTMLDivElement;

  constructor(tiles: TileIndexEntry[], options: MissionSelectOptions = {}) {
    const { parent = document.body, currentTileId, onSelect } = options;
    this.root = document.createElement('div');
    this.root.className = 'mission-select';

    const title = document.createElement('div');
    title.className = 'mission-title';
    title.textContent = 'DIVE SITES';
    this.root.appendChild(title);

    if (tiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'mission-empty';
      empty.textContent = 'No tiles found. Run tools/fetch_tile.py.';
      this.root.appendChild(empty);
    }

    for (const tile of tiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mission-item';
      if (tile.id === currentTileId) btn.classList.add('is-current');

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
        const url = new URL(window.location.href);
        url.searchParams.set('tile', tile.id);
        window.location.href = url.toString();
      });
      this.root.appendChild(btn);
    }

    parent.appendChild(this.root);
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
