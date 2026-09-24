/**
 * DOM overlay HUD. Plain DOM on purpose -- no framework, and it never touches
 * the WebGL canvas, so it costs nothing per frame beyond a few textContent
 * writes (which we skip when the value has not changed).
 */

import type { TileMeta } from '../util/types.js';
import type { SubmarineState } from '../sub/Submarine.js';
import type { PowerState } from '../game/Power.js';
import type { GameplayOptions } from '../core/Config.js';
import type { CurrentStatus } from '../world/Currents.js';
import type { HullWarningStyle } from '../core/Save.js';
import { HullGauge } from './HullGauge.js';

const FIELDS = ['depth', 'heading', 'speed', 'status', 'tile'] as const;
type Field = (typeof FIELDS)[number];

/** Numeric scale factors; CSS clamps individual text sizes for legibility. */
export function uiScaleFactors(width: number, percent: number): { auto: number; user: number } {
  return {
    auto: Math.max(0.8, Math.min(1.25, width / 1920)),
    user: Math.max(80, Math.min(150, Math.round(percent))) / 100,
  };
}

/** Warning thresholds (Config.submarine); see {@link seabedWarning}. */
export interface HudWarnConfig {
  hullRadius: number;
  seabedWarnAltitudeM: number;
  seabedWarnTimeToContactS: number;
  seabedApproachAltitudeM: number;
  /** Altitude of first contact (hullRadius + seabedClearance). */
  contactAltitudeM: number;
}

const DEFAULT_WARN: HudWarnConfig = {
  hullRadius: 8,
  seabedWarnAltitudeM: 15,
  seabedWarnTimeToContactS: 4,
  seabedApproachAltitudeM: 60,
  contactAltitudeM: 12,
};

/** Per-frame context the physics snapshot does not carry. */
export interface HudContext {
  /** A scan target is within its scan radius: suppress the static proximity banner. */
  nearScanTarget?: boolean;
  objective?: string | null;
  scanPrompt?: string | null;
  simSpeed?: number;
  controlTips?: string | null;
}

/**
 * QA-B #3c: the depth readout. Engine depth is negative below sea level; a
 * boat at the surface ceiling (-hullRadius) or above it reads SURFACED, and
 * never as a positive depth. Keeps a leading number so "N m" parsers work.
 */
export function formatDepth(depthY: number, hullRadius: number): string {
  const m = Math.max(0, -depthY);
  if (depthY >= -(hullRadius + 0.5)) return `${m.toFixed(0)} m · SURFACED`;
  return `${m.toFixed(0)} m`;
}

/**
 * QA-B #14: SEABED PROXIMITY. Two triggers:
 *  - static: altitude below `seabedWarnAltitudeM` (3 m above contact by
 *    default). Suppressed while a scan target is in range, because wreck
 *    inspection happens at 12-25 m altitude on purpose;
 *  - approach: below `seabedApproachAltitudeM` and closing on the seabed
 *    fast enough to touch within `seabedWarnTimeToContactS`. Never suppressed.
 */
export function seabedWarning(
  altitude: number,
  verticalSpeed: number,
  warn: HudWarnConfig,
  nearScanTarget = false,
): boolean {
  if (altitude < warn.seabedWarnAltitudeM && !nearScanTarget) return true;
  if (altitude < warn.seabedApproachAltitudeM && verticalSpeed < 0) {
    const gap = Math.max(0, altitude - warn.contactAltitudeM);
    if (gap / -verticalSpeed < warn.seabedWarnTimeToContactS) return true;
  }
  return false;
}

/** The tile line: tile id + fitted hull class and rating (QA-B #2). */
export function formatTileLine(
  meta: Pick<TileMeta, 'id' | 'cols' | 'rows'>,
  hullClass: string,
  ratedDepth: number,
  note = '',
): string {
  const rating = Math.round(Math.abs(ratedDepth)).toLocaleString('en-US');
  return `${meta.id} · hull ${hullClass} ${rating} m${note ? ` · ${note}` : ''}`;
}

export class HUD {
  readonly root: HTMLDivElement;
  private readonly values = new Map<Field, HTMLSpanElement>();
  private readonly cache = new Map<Field, string>();
  private readonly warningEl: HTMLDivElement;
  private readonly hullGauge: HullGauge;
  private readonly noticeEl: HTMLDivElement;
  private readonly objectiveEl: HTMLDivElement;
  private readonly promptEl: HTMLDivElement;
  private readonly speedEl: HTMLDivElement;
  private readonly tipsEl: HTMLDivElement;
  private readonly powerEl: HTMLDivElement;
  private readonly currentEl: HTMLDivElement;
  private currentMode: GameplayOptions['currents'] = 'off';
  private currentStatus: CurrentStatus = 'loading';
  private current = { dirDeg: 0, speedMps: 0 };
  private powerState: PowerState | undefined;
  private hullNote = '';

  constructor(
    private readonly meta: TileMeta,
    parent: HTMLElement = document.body,
    private readonly warn: HudWarnConfig = DEFAULT_WARN,
    private readonly currentMinMps = 0.01,
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
        <div class="hud-power" hidden aria-label="Dive supplies">
          <div class="hud-power-line" data-supply="battery"><span>BATTERY</span><meter min="0" max="1" value="1"></meter><strong>100%</strong></div>
          <div class="hud-power-line" data-supply="oxygen"><span>OXYGEN</span><meter min="0" max="1" value="1"></meter><strong>100%</strong></div>
        </div>
        <div class="hud-current" hidden aria-label="Current direction and speed"><span class="hud-current-arrow">↑</span><span class="hud-current-text"></span></div>
        <div class="hud-sim-speed" hidden></div>
      </div>
      <div class="hud-warning" hidden></div>
      <div class="hud-notice" hidden></div>
      <div class="hud-objective" hidden></div>
      <div class="hud-prompt" hidden></div>
      <div class="hud-control-tips" hidden></div>
      <div class="hud-attribution"></div>
    `;
    for (const el of this.root.querySelectorAll<HTMLSpanElement>('[data-field]')) {
      this.values.set(el.dataset.field as Field, el);
    }
    this.warningEl = this.root.querySelector('.hud-warning') as HTMLDivElement;
    this.noticeEl = this.root.querySelector('.hud-notice') as HTMLDivElement;
    this.hullGauge = new HullGauge(this.root);
    this.objectiveEl = this.root.querySelector('.hud-objective') as HTMLDivElement;
    this.promptEl = this.root.querySelector('.hud-prompt') as HTMLDivElement;
    this.speedEl = this.root.querySelector('.hud-sim-speed') as HTMLDivElement;
    this.tipsEl = this.root.querySelector('.hud-control-tips') as HTMLDivElement;
    this.powerEl = this.root.querySelector('.hud-power') as HTMLDivElement;
    this.currentEl = this.root.querySelector('.hud-current') as HTMLDivElement;
    const attr = this.root.querySelector('.hud-attribution') as HTMLDivElement;
    attr.textContent = meta.attribution;

    parent.appendChild(this.root);
    this.set('tile', `${meta.id} (${meta.cols}×${meta.rows})`);
  }

  private showContext(el: HTMLDivElement, text: string | null | undefined): void {
    const value = text ?? '';
    if (el.textContent !== value) el.textContent = value;
    el.hidden = value.length === 0;
  }

  /** A short note after the hull rating on the tile line, e.g. "thin margin". */
  setHullNote(note: string): void {
    this.hullNote = note;
  }

  setHullWarningStyle(style: HullWarningStyle): void {
    this.hullGauge.setStyle(style);
  }

  notice(message: string): void {
    this.noticeEl.textContent = message;
    this.noticeEl.hidden = false;
    window.setTimeout(() => {
      if (this.noticeEl.textContent === message) this.noticeEl.hidden = true;
    }, 6000);
  }

  setPowerState(state: PowerState): void {
    this.powerState = state;
  }

  /** `env:current` is the single source of the indicator's direction/speed. */
  setCurrent(current: { dirDeg: number; speedMps: number }): void {
    this.current = current;
    this.updateCurrent();
  }

  setCurrentMode(mode: GameplayOptions['currents']): void {
    this.currentMode = mode;
    this.updateCurrent();
  }

  setCurrentStatus(status: CurrentStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    this.updateCurrent();
  }

  private updateCurrent(): void {
    const missing = this.currentMode !== 'off' && this.currentStatus === 'missing';
    const speed = this.current.speedMps;
    const show =
      missing ||
      (this.currentMode !== 'off' &&
        this.currentStatus === 'ready' &&
        Number.isFinite(speed) &&
        speed >= this.currentMinMps);
    this.currentEl.hidden = !show;
    if (!show) return;
    const arrow = this.currentEl.querySelector<HTMLElement>('.hud-current-arrow')!;
    const label = this.currentEl.querySelector<HTMLElement>('.hud-current-text')!;
    arrow.hidden = missing;
    if (missing) {
      label.textContent = 'CURRENT · offline data unavailable';
    } else {
      arrow.style.transform = `rotate(${Number.isFinite(this.current.dirDeg) ? this.current.dirDeg : 0}deg)`;
      label.textContent = `CURRENT · ${(speed * 1.94384).toFixed(2)} kn · ${speed.toFixed(2)} m/s · ${Math.round(this.current.dirDeg)}°`;
    }
  }

  private set(field: Field, text: string): void {
    if (this.cache.get(field) === text) return;
    this.cache.set(field, text);
    const el = this.values.get(field);
    if (el) el.textContent = text;
  }

  /** Update from a physics snapshot. Safe to call every rendered frame. */
  update(s: SubmarineState, ctx: HudContext = {}): void {
    this.set('depth', formatDepth(s.depth, this.warn.hullRadius));
    this.hullGauge.update(s);
    this.set('tile', formatTileLine(this.meta, s.hullClass, s.ratedDepth, this.hullNote));
    this.set('heading', `${s.headingDeg.toFixed(0)}° ${compass(s.headingDeg)}`);
    // Knots are the natural unit for a boat; 1 m/s = 1.94384 kn.
    this.set('speed', `${(s.speed * 1.94384).toFixed(1)} kn  (${s.speed.toFixed(1)} m/s)`);
    this.showContext(this.objectiveEl, ctx.objective ? `OBJECTIVE · ${ctx.objective}` : null);
    this.showContext(this.promptEl, ctx.scanPrompt);
    this.showContext(
      this.tipsEl,
      ctx.controlTips && this.powerState?.enabled && this.powerState.low.length
        ? `${ctx.controlTips} · supplies low`
        : ctx.controlTips,
    );
    this.updatePower(this.powerState);
    this.showContext(
      this.speedEl,
      ctx.simSpeed && ctx.simSpeed !== 1 ? `${ctx.simSpeed}× SIM SPEED` : null,
    );

    if (s.hullBreached) {
      this.set('status', 'HULL BREACH');
      this.showWarning('HULL BREACH — CRUSH DEPTH EXCEEDED');
    } else if (s.crushWarning) {
      this.set('status', 'pressure high');
      this.showWarning(`HULL RATING EXCEEDED — ASCEND`);
    } else if (this.powerState?.enabled && s.emergencyCause === 'power' && s.emergencyBlow) {
      this.set('status', 'emergency ascent');
      this.showWarning('SUPPLIES EXHAUSTED — EMERGENCY ASCENT');
    } else if (this.powerState?.enabled && this.powerState.critical.length) {
      this.set('status', 'supplies critical');
      this.showWarning(`${this.powerState.critical.join(' & ').toUpperCase()} CRITICAL — ASCEND`);
    } else if (this.powerState?.enabled && this.powerState.low.length) {
      this.set('status', 'supplies low');
      this.showWarning(`${this.powerState.low.join(' & ').toUpperCase()} LOW — PLAN ASCENT`);
    } else if (seabedWarning(s.altitude, s.velocity.y, this.warn, ctx.nearScanTarget)) {
      this.set('status', 'seabed proximity');
      this.showWarning('SEABED PROXIMITY');
    } else {
      this.set('status', 'nominal');
      this.hideWarning();
    }
  }

  private updatePower(power: PowerState | undefined): void {
    this.powerEl.hidden = !power?.enabled;
    if (!power?.enabled) return;
    for (const key of ['battery', 'oxygen'] as const) {
      const line = this.powerEl.querySelector<HTMLElement>(`[data-supply="${key}"]`);
      if (!line) continue;
      const value = power[key];
      const label = `${Math.round(value * 100)}%`;
      const strong = line.querySelector('strong');
      if (strong && strong.textContent !== label) strong.textContent = label;
      const meter = line.querySelector('meter');
      if (meter) meter.value = value;
      line.classList.toggle('is-low', power.low.includes(key));
      line.classList.toggle('is-critical', power.critical.includes(key));
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
  return f.toUpperCase();
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function compass(deg: number): string {
  return POINTS[Math.round(deg / 45) % 8] as string;
}
