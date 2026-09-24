import type { HullWarningStyle } from '../core/Save.js';
import type { SubmarineState } from '../sub/Submarine.js';

/** Static pressure presentation. The gauge remains visible at every depth. */
export class HullGauge {
  readonly gauge: HTMLDivElement;
  readonly vignette: HTMLDivElement;
  private style: HullWarningStyle = 'both';

  constructor(hud: HTMLElement) {
    this.gauge = document.createElement('div');
    this.gauge.className = 'hull-gauge';
    this.gauge.setAttribute('aria-label', 'Hull depth rating');
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
    this.gauge.hidden = style === 'vignette';
    this.vignette.hidden = style === 'gauge';
  }

  update(state: SubmarineState): void {
    const depth = Math.max(0, -state.depth);
    const rated = -state.ratedDepth;
    const ratio = depth / rated;
    this.gauge.querySelector('.hull-gauge-label')!.textContent =
      `HULL · ${Math.round(depth).toLocaleString('en-US')} / ${Math.round(rated).toLocaleString('en-US')} m rated`;
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
