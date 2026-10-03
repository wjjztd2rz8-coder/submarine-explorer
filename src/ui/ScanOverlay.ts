/**
 * Scan HUD (DOM + inline SVG only, never the WebGL canvas).
 *
 * - A thin corner-bracket reticle over the nearest POI's screen position.
 * - A small panel: target name, range/facing hint or "HOLD F TO SCAN", and a
 *   cyan progress ring while the beam is on. Amber marks states that need the
 *   pilot's attention (interrupted, out of range, turn to face).
 * - After a completion, a "NEW ENTRY" confirmation with the field-guide key.
 *
 * Colours follow docs/art-direction.md §5: cyan #2ED9D9 for the beam and nav
 * readouts, amber #FFB020 for attention, neutral #CDE0E5 for labels.
 */

import type { ScanConfig } from '../core/Config.js';
import type { ScanView } from '../game/Scanner.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScanOverlayKeys {
  scan: string;
  guide: string;
}

type Tone = 'cyan' | 'amber' | 'dim';

export class ScanOverlay {
  readonly root: HTMLDivElement;
  private readonly reticle: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly kicker: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly ringArc: SVGCircleElement;
  private readonly ringText: SVGTextElement;
  private readonly circumference: number;
  private readonly cache = new Map<string, string>();
  private bannerLeft = 0;
  private suppressed = false;

  constructor(
    private readonly config: Pick<
      ScanConfig,
      'ringSizePx' | 'ringStrokePx' | 'reticleSizePx' | 'completeBannerSeconds'
    >,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'scan-overlay';
    this.root.style.setProperty('--scan-ring-size', `${config.ringSizePx}px`);
    this.root.style.setProperty('--scan-reticle-size', `${config.reticleSizePx}px`);

    this.reticle = document.createElement('div');
    this.reticle.className = 'scan-reticle';
    this.reticle.hidden = true;
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      const c = document.createElement('span');
      c.className = `scan-reticle-corner ${corner}`;
      this.reticle.appendChild(c);
    }

    this.panel = document.createElement('div');
    this.panel.className = 'scan-panel';
    this.panel.hidden = true;

    // Progress ring: a hairline track plus an arc drawn with stroke-dashoffset.
    const size = config.ringSizePx;
    const r = size / 2 - config.ringStrokePx - 1;
    this.circumference = 2 * Math.PI * r;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'scan-ring');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('class', 'scan-ring-track');
    this.ringArc = document.createElementNS(SVG_NS, 'circle');
    this.ringArc.setAttribute('class', 'scan-ring-arc');
    for (const c of [track, this.ringArc]) {
      c.setAttribute('cx', String(size / 2));
      c.setAttribute('cy', String(size / 2));
      c.setAttribute('r', String(r));
      c.setAttribute('stroke-width', String(config.ringStrokePx));
      c.setAttribute('fill', 'none');
      svg.appendChild(c);
    }
    // Start the arc at 12 o'clock and fill clockwise.
    this.ringArc.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
    this.ringArc.setAttribute('stroke-dasharray', String(this.circumference));
    this.ringArc.setAttribute('stroke-dashoffset', String(this.circumference));
    this.ringText = document.createElementNS(SVG_NS, 'text');
    this.ringText.setAttribute('class', 'scan-ring-text');
    this.ringText.setAttribute('x', String(size / 2));
    this.ringText.setAttribute('y', String(size / 2));
    this.ringText.setAttribute('text-anchor', 'middle');
    this.ringText.setAttribute('dominant-baseline', 'central');
    svg.appendChild(this.ringText);

    const text = document.createElement('div');
    text.className = 'scan-text';
    this.kicker = document.createElement('div');
    this.kicker.className = 'scan-kicker';
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'scan-name';
    this.hint = document.createElement('div');
    this.hint.className = 'scan-hint';
    text.append(this.kicker, this.nameEl, this.hint);

    this.panel.append(svg, text);
    this.root.append(this.reticle, this.panel);
    parent.appendChild(this.root);
  }

  /** Hide everything (e.g. while the field guide is open). */
  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
    if (suppressed) {
      this.panel.hidden = true;
      this.reticle.hidden = true;
    }
  }

  /** Show the completion confirmation for `completeBannerSeconds`. */
  showComplete(
    title: string,
    firstTime: boolean,
    keys: ScanOverlayKeys,
    kind: 'scan' | 'sample' = 'scan',
  ): void {
    this.bannerLeft = this.config.completeBannerSeconds;
    this.setTone(firstTime || kind === 'sample' ? 'cyan' : 'dim');
    this.setText(this.kicker, 'kicker', firstTime ? 'NEW ENTRY' : 'SCAN COMPLETE');
    this.setText(this.nameEl, 'name', title);
    this.setText(
      this.hint,
      'hint',
      kind === 'sample'
        ? 'STOWED FOR THIS DIVE'
        : firstTime
          ? document.documentElement.classList.contains('is-touch')
            ? 'PAUSE → JOURNAL'
            : `PRESS ${keys.guide} · JOURNAL`
          : `ALREADY LOGGED · SEE JOURNAL`,
    );
    this.setRing(1, 'OK');
    this.panel.classList.add('is-complete');
    if (!this.suppressed) this.panel.hidden = false;
  }

  /** True while the completion confirmation is up. */
  get bannerActive(): boolean {
    return this.bannerLeft > 0;
  }

  /**
   * @param screen CSS-pixel position of the nearest POI, or null if it is
   *   off-screen / behind the camera.
   */
  update(view: ScanView, keys: ScanOverlayKeys, screen: ScreenPoint | null, dt: number): void {
    const scan = document.documentElement.classList.contains('is-touch') ? 'SCAN' : keys.scan;
    if (this.bannerLeft > 0) {
      this.bannerLeft -= dt;
      if (this.bannerLeft <= 0) this.panel.classList.remove('is-complete');
    }
    if (this.suppressed) return;

    const hasTarget = view.nearestId !== null || view.activeId !== null;
    // Reticle over the nearest contact.
    if (screen && view.nearestId !== null && view.nearestInRange) {
      this.reticle.hidden = false;
      this.reticle.style.transform = `translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px)`;
      this.reticle.classList.toggle('is-locked', view.phase === 'scanning');
      this.reticle.classList.toggle('is-ready', view.candidateId !== null);
      this.reticle.classList.toggle('is-scanned', view.nearestScanned);
    } else {
      this.reticle.hidden = true;
    }

    if (this.bannerLeft > 0) return;
    if (!hasTarget || (view.phase === 'idle' && !view.nearestInRange)) {
      this.panel.hidden = true;
      return;
    }
    this.panel.hidden = false;

    const dist = Number.isFinite(view.nearestDistance)
      ? `${view.nearestDistance.toFixed(0)} m`
      : '';
    if (view.phase === 'scanning') {
      this.setTone('cyan');
      this.setText(
        this.kicker,
        'kicker',
        view.activeId?.startsWith('sample:') ? 'COLLECTING SAMPLE' : 'SCANNING',
      );
      this.setText(this.nameEl, 'name', view.activeName);
      this.setText(this.hint, 'hint', `HOLD ${scan} · KEEP ON TARGET`);
      this.setRing(view.progress, `${Math.floor(view.progress * 100)}%`);
      return;
    }

    if (view.nearestScanned && view.nearestInRange) {
      this.setTone('dim');
      this.setText(this.kicker, 'kicker', '✓ SCANNED THIS DIVE');
      this.setText(this.nameEl, 'name', view.nearestName);
      this.setText(this.hint, 'hint', 'Already logged — see Journal');
      this.setRing(1, '✓');
      return;
    }
    if (view.phase === 'interrupted') {
      this.setTone('amber');
      this.setText(this.kicker, 'kicker', 'SCAN INTERRUPTED');
      this.setText(this.nameEl, 'name', view.activeName);
      const why =
        view.lastAbort === 'range'
          ? 'OUT OF RANGE'
          : view.lastAbort === 'facing'
            ? 'BEAM OFF TARGET'
            : `HOLD ${scan} TO RESUME`;
      this.setText(this.hint, 'hint', why);
      this.setRing(view.progress, `${Math.floor(view.progress * 100)}%`);
      return;
    }

    // Idle: guide the pilot towards a scannable pose.
    this.setText(this.nameEl, 'name', view.nearestName);
    this.setRing(0, dist);
    if (view.candidateId !== null) {
      this.setTone('cyan');
      this.setText(this.kicker, 'kicker', 'SCAN TARGET');
      this.setText(
        this.hint,
        'hint',
        view.nearestId?.startsWith('sample:') ? `HOLD ${scan} TO COLLECT` : `HOLD ${scan} TO SCAN`,
      );
    } else if (!view.nearestInRange) {
      this.setTone('dim');
      this.setText(this.kicker, 'kicker', 'CONTACT');
      this.setText(this.hint, 'hint', `CLOSE TO ${view.nearestRadius.toFixed(0)} M`);
    } else {
      this.setTone('amber');
      this.setText(this.kicker, 'kicker', 'SCAN TARGET');
      const turn = view.nearestTurnDeg;
      const side = turn >= 0 ? 'STARBOARD' : 'PORT';
      // Mostly vertical misalignment when the horizontal turn is small.
      const msg =
        Math.abs(turn) < 10 ? 'PITCH TOWARD TARGET' : `TURN ${Math.abs(turn).toFixed(0)}° ${side}`;
      this.setText(this.hint, 'hint', msg);
    }
  }

  private setTone(tone: Tone): void {
    if (this.cache.get('tone') === tone) return;
    this.cache.set('tone', tone);
    this.panel.dataset.tone = tone;
  }

  private setRing(progress: number, label: string): void {
    const offset = (this.circumference * (1 - Math.max(0, Math.min(1, progress)))).toFixed(2);
    if (this.cache.get('ring') !== offset) {
      this.cache.set('ring', offset);
      this.ringArc.setAttribute('stroke-dashoffset', offset);
    }
    if (this.cache.get('ringText') !== label) {
      this.cache.set('ringText', label);
      this.ringText.textContent = label;
    }
  }

  private setText(el: HTMLElement, key: string, text: string): void {
    if (this.cache.get(key) === text) return;
    this.cache.set(key, text);
    el.textContent = text;
  }

  dispose(): void {
    this.root.remove();
  }
}
