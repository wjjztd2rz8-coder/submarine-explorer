/**
 * The terrain data credit (CC BY 4.0 attribution): the tile's citation, the
 * GMRT links and the "not for navigation" note. Shown from the pause menu's
 * "Data credits" view, not on the dive HUD.
 */

import type { TileMeta } from '../util/types.js';

const GMRT_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [
  ['GMRT Synthesis', 'https://www.gmrt.org/'],
  ['Ryan et al. (2009)', 'https://doi.org/10.1029/2008GC002332'],
  ['Data DOI', 'https://doi.org/10.1594/IEDA.100001'],
  ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
];

/** Content for the credits view. `attribution` goes in as text, never markup. */
export function buildDataCredits(meta: Pick<TileMeta, 'source' | 'attribution'>): HTMLElement {
  const root = document.createElement('div');
  root.className = 'data-credits';
  const citation = document.createElement('p');
  citation.className = 'data-credits-citation';
  citation.textContent = meta.attribution;
  root.append(citation);
  if (meta.source === 'GMRT') {
    const links = document.createElement('p');
    links.className = 'data-credits-links';
    GMRT_LINKS.forEach(([label, href], i) => {
      if (i) links.append(' · ');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      links.append(a);
    });
    const note = document.createElement('p');
    note.textContent =
      'Subsetted and converted to game terrain with visual detail added. Not for navigation. No endorsement implied.';
    root.append(links, note);
  }
  return root;
}
