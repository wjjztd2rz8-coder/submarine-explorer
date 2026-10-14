import { el } from './dom.js';

/**
 * The one container the dive HUD lays itself out in. Sonar, readouts,
 * objectives, the guidance slot and the Pause/Journal buttons are its direct
 * children; hud-layout.css assigns each to a grid area (top info, guidance,
 * controls), so no element needs its own screen offset.
 */
export function hudRegions(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('.hud-regions') ??
    document.body.appendChild(el('div', 'hud-regions'))
  );
}

/** The row of Pause, Journal and Reset camera buttons; HUD and touch controls fill it. */
export function hudBar(): HTMLElement {
  const regions = hudRegions();
  return (
    regions.querySelector<HTMLElement>(':scope > .hud-bar') ??
    regions.appendChild(el('div', 'hud-bar'))
  );
}
