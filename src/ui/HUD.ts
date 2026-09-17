/**
 * DOM overlay HUD. Plain DOM on purpose -- no framework, and it never touches
 * the WebGL canvas, so it costs nothing per frame beyond a few textContent
 * writes (which we skip when the value has not changed).
 */

import { formatLat, formatLon, worldToLatLon } from '../util/geo.js';
import type { TileMeta } from '../util/types.js';
import type { SubmarineState } from '../sub/Submarine.js';

const FIELDS = [
  'depth',
  'altitude',
  'heading',
  'speed',
  'pitch',
  'position',
  'tile',
  'status',
] as const;
type Field = (typeof FIELDS)[number];

export class HUD {
  readonly root: HTMLDivElement;
  private readonly values = new Map<Field, HTMLSpanElement>();
  private readonly cache = new Map<Field, string>();
  private readonly warningEl: HTMLDivElement;

  constructor(
    private readonly meta: TileMeta,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-panel hud-readouts">
        ${FIELDS.map(
          (f) =>
            `<div class="hud-row"><span class="hud-label">${labelOf(f)}</span>` +
            `<span class="hud-value" data-field="${f}">--</span></div>`,
        ).join('')}
      </div>
      <div class="hud-warning" hidden></div>
      <div class="hud-panel hud-help">
        <b>W/S</b> thrust &nbsp; <b>A/D</b> yaw &nbsp; <b>R/F</b> pitch<br />
        <b>Space</b> blow ballast (up) &nbsp; <b>Shift</b> flood (down)<br />
        <b>X</b> boost &nbsp; <b>C</b> camera &nbsp; <b>M</b> sonar
      </div>
      <div class="hud-attribution"></div>
    `;
    for (const el of this.root.querySelectorAll<HTMLSpanElement>('[data-field]')) {
      this.values.set(el.dataset.field as Field, el);
    }
    this.warningEl = this.root.querySelector('.hud-warning') as HTMLDivElement;
    const attr = this.root.querySelector('.hud-attribution') as HTMLDivElement;
    attr.textContent = meta.attribution;

    parent.appendChild(this.root);
    this.set('tile', `${meta.id} (${meta.cols}×${meta.rows})`);
  }

  private set(field: Field, text: string): void {
    if (this.cache.get(field) === text) return;
    this.cache.set(field, text);
    const el = this.values.get(field);
    if (el) el.textContent = text;
  }

  /** Update from a physics snapshot. Safe to call every rendered frame. */
  update(s: SubmarineState): void {
    const ll = worldToLatLon(this.meta, s.position.x, s.position.z);
    this.set('depth', `${Math.abs(s.depth).toFixed(0)} m`);
    this.set('altitude', `${s.altitude.toFixed(0)} m`);
    this.set('heading', `${s.headingDeg.toFixed(0)}° ${compass(s.headingDeg)}`);
    // Knots are the natural unit for a boat; 1 m/s = 1.94384 kn.
    this.set('speed', `${(s.speed * 1.94384).toFixed(1)} kn  (${s.speed.toFixed(1)} m/s)`);
    this.set('pitch', `${((s.pitch * 180) / Math.PI).toFixed(0)}°`);
    this.set('position', `${formatLat(ll.lat)}  ${formatLon(ll.lon)}`);

    if (s.hullBreached) {
      this.set('status', 'HULL BREACH');
      this.showWarning('HULL BREACH — CRUSH DEPTH EXCEEDED');
    } else if (s.crushWarning) {
      this.set('status', 'pressure high');
      this.showWarning(`HULL PRESSURE ${(s.crushRatio * 100).toFixed(0)}% — ASCEND`);
    } else if (s.altitude < 20) {
      this.set('status', 'seabed proximity');
      this.showWarning('SEABED PROXIMITY');
    } else {
      this.set('status', 'nominal');
      this.hideWarning();
    }
  }

  private showWarning(text: string): void {
    if (this.warningEl.textContent !== text) this.warningEl.textContent = text;
    this.warningEl.hidden = false;
  }

  private hideWarning(): void {
    this.warningEl.hidden = true;
  }

  dispose(): void {
    this.root.remove();
  }
}

function labelOf(f: Field): string {
  return f === 'position' ? 'POSITION' : f.toUpperCase();
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function compass(deg: number): string {
  return POINTS[Math.round(deg / 45) % 8] as string;
}
