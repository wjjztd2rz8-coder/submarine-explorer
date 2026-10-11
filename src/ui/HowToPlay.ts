/**
 * "How to play" on touch (F-TEXT-DIET): a picture-first page for the on-screen
 * controls. Each tile is a small diagram, a label and a few words, and no key
 * names appear anywhere. The diagrams are static inline SVG (no markup comes
 * from content), drawn in `currentColor` with an accent for the part to use.
 * Desktop and gamepad keep the key list in {@link ./ControlsCard.ts}.
 */

export interface HowToTile {
  id: string;
  label: string;
  words: string;
  /** Inner SVG for a 64 x 64 box. `.htp-a` marks the accent strokes and fills. */
  art: string;
}

export interface HowToGroup {
  heading: string;
  tiles: HowToTile[];
}

const ARROW = (x: number, y: number, rot: number): string =>
  `<path class="htp-f" d="M0-5 5 3H-5Z" transform="translate(${x} ${y}) rotate(${rot})"/>`;

export const HOW_TO_PLAY: readonly HowToGroup[] = [
  {
    heading: 'Fly',
    tiles: [
      {
        id: 'stick',
        label: 'Left stick',
        words: 'Move and turn',
        art:
          '<circle cx="32" cy="32" r="25"/><circle class="htp-a htp-f" cx="32" cy="32" r="9"/>' +
          ARROW(32, 11, 0) +
          ARROW(32, 53, 180) +
          ARROW(11, 32, 270) +
          ARROW(53, 32, 90),
      },
      {
        id: 'slider',
        label: 'Right slider',
        words: 'Rise and sink',
        art:
          '<rect x="22" y="12" width="20" height="40" rx="10"/>' +
          '<circle class="htp-a htp-f" cx="32" cy="32" r="7"/>' +
          ARROW(32, 5, 0) +
          ARROW(32, 59, 180),
      },
      {
        id: 'boost',
        label: 'Boost',
        words: 'Tap for a burst of speed',
        art:
          '<circle cx="32" cy="32" r="25"/>' +
          '<path class="htp-a" d="M20 21 31 32 20 43M32 21 43 32 32 43"/>',
      },
    ],
  },
  {
    heading: 'Explore',
    tiles: [
      {
        id: 'scan',
        label: 'Scan',
        words: 'Hold to scan what you face',
        art:
          '<circle cx="32" cy="32" r="25" stroke-dasharray="4 5"/>' +
          '<path class="htp-a" d="M32 7A25 25 0 0 1 57 32"/>' +
          '<circle class="htp-a htp-f" cx="32" cy="32" r="6"/>',
      },
      {
        id: 'lights',
        label: 'Lights',
        words: 'Headlights on and off',
        art:
          '<path d="M24 41V37C19 33 18 27 20 22A13 13 0 0 1 44 22C46 27 45 33 40 37V41Z"/>' +
          '<path d="M26 47H38M28 53H36"/>' +
          '<path class="htp-a" d="M32 3V7M10 11 13 14M54 11 51 14"/>',
      },
      {
        id: 'sonar',
        label: 'Sonar',
        words: 'Open the sonar map',
        art:
          '<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="13"/>' +
          '<path class="htp-a" d="M32 32 49 15"/>' +
          '<circle class="htp-a htp-f" cx="32" cy="32" r="3"/>',
      },
      {
        id: 'photo',
        label: 'Photo',
        words: 'Frame a shot',
        art:
          '<path d="M8 22H17L21 15H43L47 22H56V50H8Z"/>' +
          '<circle class="htp-a" cx="32" cy="36" r="9"/>',
      },
    ],
  },
  {
    heading: 'Look',
    tiles: [
      {
        id: 'drag',
        label: 'Drag',
        words: 'Look around',
        art:
          '<circle class="htp-a htp-f" cx="32" cy="32" r="7"/>' +
          '<path d="M14 32H50"/>' +
          ARROW(10, 32, 270) +
          ARROW(54, 32, 90),
      },
      {
        id: 'pinch',
        label: 'Pinch',
        words: 'Zoom in and out',
        art:
          '<circle class="htp-a htp-f" cx="22" cy="42" r="6"/>' +
          '<circle class="htp-a htp-f" cx="42" cy="22" r="6"/>' +
          ARROW(11, 53, 45) +
          ARROW(53, 11, 225),
      },
      {
        id: 'double-tap',
        label: 'Double-tap',
        words: 'Reset the camera',
        art:
          '<circle class="htp-a htp-f" cx="32" cy="32" r="5"/>' +
          '<circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="25"/>',
      },
    ],
  },
];

function svg(art: string): SVGSVGElement {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    '<svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" ' +
    `stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${art}</svg>`;
  return wrap.firstElementChild as SVGSVGElement;
}

/** The how-to-play body: a heading and a grid of tiles per group. */
export function buildHowToPlay(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'how-to-play';
  for (const group of HOW_TO_PLAY) {
    const section = document.createElement('section');
    section.className = 'how-to-group';
    const h = document.createElement('h3');
    h.className = 'controls-card-heading';
    h.textContent = group.heading;
    const grid = document.createElement('ul');
    grid.className = 'how-to-grid';
    for (const tile of group.tiles) {
      const li = document.createElement('li');
      li.className = 'how-to-tile';
      li.dataset.tile = tile.id;
      const label = document.createElement('strong');
      label.textContent = tile.label;
      const words = document.createElement('span');
      words.textContent = tile.words;
      li.append(svg(tile.art), label, words);
      grid.append(li);
    }
    section.append(h, grid);
    root.append(section);
  }
  return root;
}
