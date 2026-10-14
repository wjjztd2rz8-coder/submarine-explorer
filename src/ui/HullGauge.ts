import type { HullWarningStyle } from '../core/Save.js';
import type { SubmarineState } from '../sub/Submarine.js';

/**
 * The gauge appears once the hull is this close to its rating and stays until
 * it eases back below the lower mark. Routine mission depths stay quiet: the
 * deepest non-Challenger mission sits at 58% of its hull's rating (Titanic), so
 * a 50% threshold would show the gauge for a whole dive; Challenger Deep, at
 * 99%, always shows it.
 */
export const HULL_GAUGE_SHOW_RATIO = 0.8;
export const HULL_GAUGE_HIDE_RATIO = 0.75;

/** Gauge visibility with a little hysteresis so it does not flicker at the edge. */
export function hullGaugeVisible(ratio: number, wasVisible: boolean): boolean {
  return ratio >= (wasVisible ? HULL_GAUGE_HIDE_RATIO : HULL_GAUGE_SHOW_RATIO);
}

/** Pressure presentation: a gauge near the rating and a vignette past it. */
export class HullGauge {
  readonly gauge: HTMLDivElement;
  readonly vignette: HTMLDivElement;
  private style: HullWarningStyle = 'both';
  private near = false;

  constructor(hud: HTMLElement) {
    this.gauge = document.createElement('div');
    this.gauge.className = 'hull-gauge';
    this.gauge.setAttribute('aria-label', 'Hull depth rating');
    this.gauge.hidden = true;
    this.gauge.innerHTML =
      '<div class="hull-gauge-label"></div><div class="hull-gauge-track"><i></i></div>';
    hud.querySelector('.hud-readouts')!.appendChild(this.gauge);
    this.vignette = document.createElement('div');
    this.vignette.className = 'hull-vignette';
    this.vignette.setAttribute('aria-hidden', 'true');
    hud.prepend(this.vignette);
  }

  setStyle(style: HullWarningStyle): void {
    this.style = style;
    this.gauge.hidden = style === 'vignette' || !this.near;
    this.vignette.hidden = style === 'gauge';
  }

  update(state: SubmarineState): void {
    const depth = Math.max(0, -state.depth);
    const rated = -state.ratedDepth;
    const ratio = depth / rated;
    this.gauge.querySelector('.hull-gauge-label')!.textContent =
      `HULL · ${Math.round(depth).toLocaleString('en-US')} / ${Math.round(rated).toLocaleString('en-US')} m rated`;
    const label = this.gauge.querySelector<HTMLElement>('.hull-gauge-label')!;
    const compact = `HULL ${Math.round(ratio * 100)}%`;
    if (label.dataset.compact !== compact) label.dataset.compact = compact;
    this.near = hullGaugeVisible(ratio, this.near);
    this.gauge.hidden = this.style === 'vignette' || !this.near;
    (this.gauge.querySelector('.hull-gauge-track i') as HTMLElement).style.width =
      `${Math.min(100, ratio * 100).toFixed(1)}%`;
    this.gauge.classList.toggle('is-danger', ratio > 1);
    const stress = Math.max(0, Math.min(1, (ratio - 1) / 0.1));
    this.vignette.style.opacity = String(stress * 0.65);
    this.vignette.style.setProperty(
      '--hull-vignette-color',
      `rgba(${Math.round(140 + stress * 35)}, ${Math.round(76 - stress * 51)}, ${Math.round(22 - stress * 2)}, 0.8)`,
    );
    this.vignette.hidden = this.style === 'gauge' || stress === 0;
  }
}
