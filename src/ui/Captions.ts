/**
 * Closed captions for audio cues (C5, docs/settings.md).
 *
 * `AudioSystem.captions` (a `CaptionBus`, docs/audio.md) emits a
 * `{ id, text, durationS }` for every cue it plays. This overlay shows up to
 * `Config.settings.captionMaxLines` of them at the bottom centre, each for
 * `max(durationS, captionMinDurationS)` seconds, inside an ARIA live region
 * (`role="status"`, `aria-live="polite"`) so screen readers announce them too.
 *
 * Queue rules ({@link CaptionQueue}, pure and unit tested):
 *  - a cue whose id is already on screen refreshes that line (text and expiry)
 *    instead of stacking ("Sonar ping" x5 stays one line);
 *  - a new id is appended at the bottom; past the line limit the oldest goes;
 *  - lines expire on their own clock.
 * While captions are off the overlay is hidden and cues are dropped.
 */

/** Structural copy of `CaptionEvent` (src/audio/events.ts); UI does not import audio. */
export interface CaptionCue {
  id: string;
  text: string;
  durationS: number;
}

/** Structural copy of `CaptionBus.on`. */
export interface CaptionSource {
  on(handler: (cue: CaptionCue) => void): () => void;
}

export interface CaptionLine {
  id: string;
  text: string;
  /** Clock time (seconds) the line disappears. */
  expiresAt: number;
}

export class CaptionQueue {
  private items: CaptionLine[] = [];

  constructor(
    readonly maxLines = 2,
    readonly minDurationS = 1.5,
  ) {}

  /** Add or refresh a cue at clock time `now` (seconds). */
  push(cue: CaptionCue, now: number): void {
    const dur = Math.max(Number.isFinite(cue.durationS) ? cue.durationS : 0, this.minDurationS);
    const expiresAt = now + dur;
    const existing = this.items.find((l) => l.id === cue.id);
    if (existing) {
      existing.text = cue.text;
      existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
      return;
    }
    this.items.push({ id: cue.id, text: cue.text, expiresAt });
    while (this.items.length > Math.max(1, this.maxLines)) this.items.shift();
  }

  /** Drop expired lines; returns true if anything changed. */
  prune(now: number): boolean {
    const before = this.items.length;
    this.items = this.items.filter((l) => l.expiresAt > now);
    return this.items.length !== before;
  }

  /** Visible lines, oldest first. */
  lines(): readonly CaptionLine[] {
    return this.items;
  }

  /** Clock time of the next expiry, or null when empty. */
  nextExpiry(): number | null {
    if (!this.items.length) return null;
    return Math.min(...this.items.map((l) => l.expiresAt));
  }

  clear(): void {
    this.items = [];
  }
}

export interface CaptionsOptions {
  enabled?: boolean;
  maxLines?: number;
  minDurationS?: number;
  parent?: HTMLElement;
}

export class Captions {
  readonly root: HTMLDivElement;
  private readonly queue: CaptionQueue;
  private enabled_: boolean;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly off: () => void;

  constructor(source: CaptionSource, options: CaptionsOptions = {}) {
    this.queue = new CaptionQueue(options.maxLines ?? 2, options.minDurationS ?? 1.5);
    this.enabled_ = options.enabled ?? false;
    this.root = document.createElement('div');
    this.root.className = 'captions';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Captions');
    this.root.hidden = !this.enabled_;
    (options.parent ?? document.body).appendChild(this.root);
    this.off = source.on((cue) => this.show(cue));
  }

  get enabled(): boolean {
    return this.enabled_;
  }

  setEnabled(on: boolean): void {
    this.enabled_ = on;
    this.root.hidden = !on;
    if (!on) {
      this.queue.clear();
      this.render();
    }
  }

  /** Visible caption texts (for tests / e2e). */
  get texts(): string[] {
    return this.queue.lines().map((l) => l.text);
  }

  /** Show one cue (also what the caption bus calls). Ignored while captions are off. */
  show(cue: CaptionCue): void {
    if (!this.enabled_) return;
    this.queue.push(cue, now());
    this.render();
    this.schedule();
  }

  private schedule(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    const next = this.queue.nextExpiry();
    if (next === null) return;
    const ms = Math.max(16, (next - now()) * 1000);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.queue.prune(now())) this.render();
      this.schedule();
    }, ms);
  }

  private render(): void {
    const lines = this.queue.lines();
    // Reuse line elements by id so a refreshed cue is not re-announced.
    const keep = new Map<string, HTMLDivElement>();
    for (const child of [...this.root.children] as HTMLDivElement[]) {
      const id = child.dataset.id ?? '';
      if (lines.some((l) => l.id === id)) keep.set(id, child);
      else child.remove();
    }
    for (const l of lines) {
      let div = keep.get(l.id);
      if (!div) {
        div = document.createElement('div');
        div.className = 'caption-line';
        div.dataset.id = l.id;
      }
      if (div.textContent !== l.text) div.textContent = l.text;
      this.root.appendChild(div); // keeps queue order
    }
  }

  dispose(): void {
    this.off();
    if (this.timer !== null) clearTimeout(this.timer);
    this.root.remove();
  }
}

function now(): number {
  return (globalThis.performance?.now() ?? Date.now()) / 1000;
}
