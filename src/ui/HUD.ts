/**
 * DOM overlay HUD. Plain DOM on purpose -- no framework, and it never touches
 * the WebGL canvas, so it costs nothing per frame beyond a few textContent
 * writes (which we skip when the value has not changed).
 */

import { defaultActions, keyLabel } from '../core/Input.js';
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

/** One help item: the action ids whose primary keys are shown (joined by `/`), and a verb. */
export interface HelpItem {
  actions: string[];
  text: string;
}

/**
 * C5: the three help lines, by action id rather than by key, so remapping a
 * key in the settings screen updates the help. Items whose actions do not
 * exist in the action map are skipped (e.g. an action another lane removed).
 */
export const HELP_LINES: HelpItem[][] = [
  [
    { actions: ['thrustForward', 'thrustReverse'], text: 'thrust' },
    { actions: ['yawPort', 'yawStarboard'], text: 'yaw' },
    { actions: ['pitchUp', 'pitchDown'], text: 'pitch' },
    { actions: ['boost'], text: 'boost' },
    { actions: ['toggleSettings'], text: 'settings' },
  ],
  [
    { actions: ['ballastBlow'], text: 'blow (up)' },
    { actions: ['ballastFlood'], text: 'flood (down)' },
    { actions: ['toggleLights'], text: 'lights' },
    { actions: ['cycleSimSpeed'], text: 'sim speed' },
    { actions: ['toggleGlobe'], text: 'globe' },
  ],
  [
    { actions: ['scan'], text: 'scan (hold)' },
    { actions: ['toggleGuide'], text: 'guide' },
    { actions: ['ping'], text: 'ping' },
    { actions: ['toggleSonar'], text: 'sonar' },
    { actions: ['toggleCamera'], text: 'camera' },
    { actions: ['togglePhotoMode'], text: 'photo' },
  ],
];

/** The action map shape the help needs (`Input.actions` satisfies it). */
export type HelpActionMap = ReadonlyArray<{ id: string; keys: readonly string[] }>;

/**
 * Resolve the help lines against an action map: `[[keys, text], ...]` per
 * line, e.g. `['W/S', 'thrust']`. An unbound action shows `--`.
 */
export function helpLines(
  actions: HelpActionMap,
  lines = HELP_LINES,
): Array<Array<[string, string]>> {
  const byId = new Map(actions.map((a) => [a.id, a]));
  return lines.map((line) =>
    line
      .filter((item) => item.actions.every((id) => byId.has(id)))
      .map((item): [string, string] => [
        item.actions
          .map((id) => {
            const k = byId.get(id)?.keys[0];
            return k ? keyLabel(k) : '--';
          })
          .join('/'),
        item.text,
      ]),
  );
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
  crushDepth: number,
  note = '',
): string {
  const rating = Math.round(Math.abs(crushDepth)).toLocaleString('en-US');
  return `${meta.id} · hull ${hullClass} ${rating} m${note ? ` · ${note}` : ''}`;
}

export class HUD {
  readonly root: HTMLDivElement;
  private readonly values = new Map<Field, HTMLSpanElement>();
  private readonly cache = new Map<Field, string>();
  private readonly warningEl: HTMLDivElement;
  private readonly helpEl: HTMLDivElement;
  private helpActions: HelpActionMap = defaultActions();
  private hullNote = '';

  constructor(
    private readonly meta: TileMeta,
    parent: HTMLElement = document.body,
    private readonly warn: HudWarnConfig = DEFAULT_WARN,
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
      <div class="hud-panel hud-help" aria-label="Controls"></div>
      <div class="hud-attribution"></div>
    `;
    for (const el of this.root.querySelectorAll<HTMLSpanElement>('[data-field]')) {
      this.values.set(el.dataset.field as Field, el);
    }
    this.warningEl = this.root.querySelector('.hud-warning') as HTMLDivElement;
    this.helpEl = this.root.querySelector('.hud-help') as HTMLDivElement;
    this.renderHelp();
    const attr = this.root.querySelector('.hud-attribution') as HTMLDivElement;
    attr.textContent = meta.attribution;

    parent.appendChild(this.root);
    this.set('tile', `${meta.id} (${meta.cols}×${meta.rows})`);
  }

  /**
   * C5: render the help from a live action map (`Input.actions`). Call
   * {@link refreshHelp} after a rebind; the array is mutated in place.
   */
  bindHelp(actions: HelpActionMap): void {
    this.helpActions = actions;
    this.renderHelp();
  }

  /** Re-render the help lines (after a key was remapped). */
  refreshHelp(): void {
    this.renderHelp();
  }

  private renderHelp(): void {
    const frag = document.createDocumentFragment();
    helpLines(this.helpActions).forEach((line, li) => {
      if (li > 0) frag.append(document.createElement('br'));
      line.forEach(([keys, text], i) => {
        if (i > 0) frag.append(' \u00a0 ');
        const b = document.createElement('b');
        b.textContent = keys;
        frag.append(b, ` ${text}`);
      });
    });
    this.helpEl.replaceChildren(frag);
  }

  /** A short note after the hull rating on the tile line, e.g. "thin margin". */
  setHullNote(note: string): void {
    this.hullNote = note;
  }

  private set(field: Field, text: string): void {
    if (this.cache.get(field) === text) return;
    this.cache.set(field, text);
    const el = this.values.get(field);
    if (el) el.textContent = text;
  }

  /** Update from a physics snapshot. Safe to call every rendered frame. */
  update(s: SubmarineState, ctx: HudContext = {}): void {
    const ll = worldToLatLon(this.meta, s.position.x, s.position.z);
    this.set('depth', formatDepth(s.depth, this.warn.hullRadius));
    this.set('tile', formatTileLine(this.meta, s.hullClass, s.crushDepth, this.hullNote));
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
    } else if (seabedWarning(s.altitude, s.velocity.y, this.warn, ctx.nearScanTarget)) {
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
