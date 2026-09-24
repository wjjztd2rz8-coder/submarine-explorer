import type { Rov } from '../rov/Rov.js';

export class RovHUD {
  readonly root: HTMLDivElement;
  private readonly telemetry: HTMLSpanElement;
  private readonly status: HTMLSpanElement;

  constructor(parent: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.className = 'hud-rov';
    this.root.setAttribute('aria-label', 'ROV telemetry');
    this.root.hidden = true;
    const badge = document.createElement('strong');
    badge.className = 'hud-rov-badge';
    badge.textContent = 'ROV';
    this.telemetry = document.createElement('span');
    this.status = document.createElement('span');
    this.status.className = 'hud-rov-status';
    this.root.append(badge, this.telemetry, this.status);
    parent.appendChild(this.root);
  }

  update(rov: Rov): void {
    this.root.hidden = !rov.deployed;
    if (!rov.deployed) return;
    this.telemetry.textContent = `${Math.abs(rov.position.y).toFixed(0)} m depth · tether ${rov.tetherUsedM.toFixed(0)}/${rov.config.tetherLengthM} m`;
    this.status.textContent = rov.tetherLimit
      ? ' · TETHER LIMIT'
      : rov.mode === 'returning'
        ? ' · RETURNING'
        : '';
    this.root.classList.toggle('is-limit', rov.tetherLimit);
  }
}
