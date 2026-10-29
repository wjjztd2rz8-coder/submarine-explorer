/**
 * The one on-screen guidance card. Sources (warnings, the scan beam,
 * discoveries, the tutorial and hints, the standing objective) each offer a
 * message under their own name; {@link pickGuidance} chooses the single one to
 * show. Placement lives in the stylesheet. The card catches no pointer events
 * except on its Skip button, so it never blocks the view or the controls.
 */

import {
  pickGuidance,
  type GuidanceKind,
  type GuidanceMessage,
  type GuidanceOffer,
} from '../game/Guidance.js';
import { el } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Entry extends GuidanceOffer {
  /** Seconds left for a timed offer; Infinity for a standing one. */
  left: number;
  /** Age of the topic; detail updates do not restart its brief priority over ready contacts. */
  age: number;
}

export class GuidanceSlot {
  readonly root: HTMLDivElement;
  private readonly text: HTMLElement;
  private readonly kicker: HTMLElement;
  private readonly name: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly skip: HTMLButtonElement;
  private readonly ringArc: SVGCircleElement;
  private readonly ringText: SVGTextElement;
  private readonly ring: SVGSVGElement;
  private readonly circumference: number;
  private readonly entries = new Map<string, Entry>();
  private readonly cache = new Map<string, string>();
  private serial = 0;
  private suppressed = false;
  private skipHandler: (() => void) | null = null;
  private shown: { kind: GuidanceKind; message: GuidanceMessage } | null = null;

  constructor(ringSizePx = 44, ringStrokePx = 2) {
    this.root = el('div', 'guidance-slot');
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');

    const size = ringSizePx;
    const r = size / 2 - ringStrokePx - 1;
    this.circumference = 2 * Math.PI * r;
    this.ring = document.createElementNS(SVG_NS, 'svg');
    this.ring.setAttribute('class', 'guidance-ring');
    this.ring.setAttribute('width', String(size));
    this.ring.setAttribute('height', String(size));
    this.ring.setAttribute('viewBox', `0 0 ${size} ${size}`);
    const track = document.createElementNS(SVG_NS, 'circle');
    track.setAttribute('class', 'guidance-ring-track');
    this.ringArc = document.createElementNS(SVG_NS, 'circle');
    this.ringArc.setAttribute('class', 'guidance-ring-arc');
    for (const c of [track, this.ringArc]) {
      c.setAttribute('cx', String(size / 2));
      c.setAttribute('cy', String(size / 2));
      c.setAttribute('r', String(r));
      c.setAttribute('stroke-width', String(ringStrokePx));
      c.setAttribute('fill', 'none');
      this.ring.appendChild(c);
    }
    this.ringArc.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
    this.ringArc.setAttribute('stroke-dasharray', String(this.circumference));
    this.ringArc.setAttribute('stroke-dashoffset', String(this.circumference));
    this.ringText = document.createElementNS(SVG_NS, 'text');
    this.ringText.setAttribute('class', 'guidance-ring-text');
    this.ringText.setAttribute('x', String(size / 2));
    this.ringText.setAttribute('y', String(size / 2));
    this.ringText.setAttribute('text-anchor', 'middle');
    this.ringText.setAttribute('dominant-baseline', 'central');
    this.ring.appendChild(this.ringText);

    this.kicker = el('div', 'guidance-kicker');
    this.name = el('div', 'guidance-name');
    this.detail = el('div', 'guidance-hint');
    this.text = el('div', 'guidance-text');
    this.text.append(this.kicker, this.name, this.detail);

    this.skip = el('button', 'guidance-skip', 'Skip');
    this.skip.type = 'button';
    this.skip.addEventListener('click', () => {
      this.skipHandler?.();
      // Space (ballast) must not re-press a focused button.
      this.skip.blur();
    });
    this.root.append(this.ring, this.text, this.skip);
  }

  /** Called when the Skip button on a tutorial step is pressed. */
  setSkipHandler(handler: (() => void) | null): void {
    this.skipHandler = handler;
  }

  /** The kind on screen, or null when the slot is empty. */
  get kind(): GuidanceKind | null {
    return this.shown?.kind ?? null;
  }

  get visible(): boolean {
    return this.shown !== null;
  }

  /** Offer (or with null, withdraw) a standing message for `source`. */
  offer(source: string, kind: GuidanceKind, message: GuidanceMessage | null): void {
    this.set(source, kind, message, Infinity);
  }

  /** Offer a message that withdraws itself after `seconds`. */
  flash(source: string, kind: GuidanceKind, message: GuidanceMessage, seconds: number): void {
    this.entries.delete(source);
    this.set(source, kind, message, seconds);
  }

  /** Covering play discards all guidance; resumed sources must offer their current state. */
  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
    if (suppressed) this.clear();
  }

  clear(): void {
    this.entries.clear();
    this.render();
  }

  /** A short system note, e.g. what a settings change will do. */
  notice(text: string, seconds = 6): void {
    this.flash('notice', 'hint', { kicker: 'NOTE', text, tone: 'dim' }, seconds);
  }

  /** Run down timed messages by `dt` seconds. Call once per frame. */
  tick(dt: number): void {
    let changed = false;
    for (const [source, entry] of this.entries) {
      const wasFresh = entry.age < 3;
      entry.age += dt;
      entry.left -= dt;
      if (wasFresh && entry.age >= 3) changed = true;
      if (entry.left <= 0) {
        this.entries.delete(source);
        changed = true;
      }
    }
    if (changed) this.render();
  }

  private set(
    source: string,
    kind: GuidanceKind,
    message: GuidanceMessage | null,
    left: number,
  ): void {
    if (this.suppressed) return;
    const old = this.entries.get(source);
    if (!message) {
      if (old) {
        this.entries.delete(source);
        this.render();
      }
      return;
    }
    // A message that only updates its detail or ring keeps its place in line.
    const sameTopic =
      old &&
      old.kind === kind &&
      old.message.kicker === message.kicker &&
      old.message.text === message.text;
    if (sameTopic && JSON.stringify(old.message) === JSON.stringify(message)) {
      old.left = left;
      return;
    }
    this.entries.set(source, {
      kind,
      message,
      since: sameTopic ? old.since : (this.serial += 1),
      left,
      age: sameTopic ? old.age : 0,
    });
    this.render();
  }

  private render(): void {
    const offers = [...this.entries.values()];
    const freshResult = offers.some((entry) => entry.kind === 'discovery' && entry.age < 3);
    this.shown = pickGuidance(
      offers.map((entry) =>
        freshResult && entry.kind === 'scan' && entry.message.ready
          ? { ...entry, message: { ...entry.message, soft: true } }
          : entry,
      ),
    );
    const shown = this.shown;
    this.root.hidden = !shown;
    if (!shown) return;
    const { kind, message: m } = shown;
    this.root.dataset.kind = kind;
    this.root.dataset.tone = m.tone;
    if (m.step) this.root.dataset.step = m.step;
    else delete this.root.dataset.step;
    this.write(this.kicker, 'kicker', m.kicker);
    this.write(this.name, 'name', m.text);
    this.write(this.detail, 'detail', m.detail ?? '');
    this.detail.hidden = !m.detail;
    this.ring.style.display = m.ring ? '' : 'none';
    if (m.ring) {
      const p = Math.max(0, Math.min(1, m.ring.progress));
      const offset = (this.circumference * (1 - p)).toFixed(2);
      if (this.cache.get('ring') !== offset) {
        this.cache.set('ring', offset);
        this.ringArc.setAttribute('stroke-dashoffset', offset);
      }
      if (this.cache.get('ringText') !== m.ring.label) {
        this.cache.set('ringText', m.ring.label);
        this.ringText.textContent = m.ring.label;
      }
    }
    this.skip.hidden = !m.step;
  }

  private write(target: HTMLElement, key: string, value: string): void {
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    target.textContent = value;
  }

  dispose(): void {
    this.root.remove();
  }
}
