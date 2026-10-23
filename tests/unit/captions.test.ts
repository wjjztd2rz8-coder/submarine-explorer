/** Caption queue and bus-driven DOM consumer lifecycle (src/ui/Captions.ts). */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptionBus } from '../../src/audio/events.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CaptionQueue, Captions } from '../../src/ui/Captions.js';

describe('CaptionQueue', () => {
  it('refreshes a repeated cue instead of stacking it', () => {
    const q = new CaptionQueue(2, 1.5);
    q.push({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 }, 0);
    q.push({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 }, 1);
    expect(q.lines()).toHaveLength(1);
    expect(q.lines()[0]?.expiresAt).toBeCloseTo(2.5); // min duration from the refresh
  });

  it('drops the oldest past the line limit and expires lines', () => {
    const q = new CaptionQueue(2, 1);
    q.push({ id: 'a', text: 'A', durationS: 5 }, 0);
    q.push({ id: 'b', text: 'B', durationS: 1 }, 0);
    q.push({ id: 'c', text: 'C', durationS: 2 }, 0);
    expect(q.lines().map((l) => l.text)).toEqual(['B', 'C']);
    expect(q.nextExpiry()).toBe(1);
    expect(q.prune(1.5)).toBe(true);
    expect(q.lines().map((l) => l.text)).toEqual(['C']);
    expect(q.prune(1.6)).toBe(false);
    q.clear();
    expect(q.nextExpiry()).toBeNull();
  });

  it('treats a non-finite duration as the minimum', () => {
    const q = new CaptionQueue(2, 1.5);
    q.push({ id: 'x', text: 'X', durationS: Number.NaN }, 10);
    expect(q.lines()[0]?.expiresAt).toBe(11.5);
  });
});

// Follow the headless overlay fixtures: appendChild moves an existing node,
// and remove updates its parent, so identity/order assertions reflect DOM semantics.
class Element {
  children: Element[] = [];
  parentElement: Element | null = null;
  textContent = '';
  className = '';
  hidden = false;
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};

  appendChild(child: Element): Element {
    child.remove();
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove(): void {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }
}

describe('Captions consumer', () => {
  let body: Element;
  const consumers: Captions[] = [];
  const config = DEFAULT_CONFIG.settings;
  const make = (bus: CaptionBus, enabled = true, parent?: HTMLElement): Captions => {
    const captions = new Captions(bus, {
      enabled,
      maxLines: config.captionMaxLines,
      minDurationS: config.captionMinDurationS,
      parent,
    });
    consumers.push(captions);
    return captions;
  };
  const domTexts = (captions: Captions) =>
    Array.from(captions.root.children, (line) => line.textContent);

  beforeEach(() => {
    // Expiry reads performance.now; it must advance with the timeout clock.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    body = new Element();
    vi.stubGlobal('document', { body, createElement: () => new Element() });
  });
  afterEach(() => {
    for (const captions of consumers.splice(0)) captions.dispose();
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('refreshes the same DOM line and expires unequal lifetimes without another cue', () => {
    const bus = new CaptionBus();
    const captions = make(bus);
    expect(body.children).toEqual([captions.root]);
    expect(captions.root.hidden).toBe(false);
    expect(captions.root.getAttribute('role')).toBe('status');
    expect(captions.root.getAttribute('aria-live')).toBe('polite');
    expect(captions.root.getAttribute('aria-label')).toBe('Captions');

    bus.emit({ id: 'ballast', text: 'Flooding ballast', durationS: 1 });
    expect(domTexts(captions)).toEqual(['Flooding ballast']);
    const ballastLine = captions.root.children[0];
    vi.advanceTimersByTime(500);
    bus.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });
    vi.advanceTimersByTime(500);
    bus.emit({ id: 'ballast', text: 'Blowing ballast', durationS: 1 });
    expect(domTexts(captions)).toEqual(['Blowing ballast', 'Sonar ping']);
    expect(captions.root.children[0]).toBe(ballastLine);

    // The original expiry must not remove the refreshed line.
    vi.advanceTimersByTime(500);
    expect(domTexts(captions)).toEqual(['Blowing ballast', 'Sonar ping']);
    vi.advanceTimersByTime(499);
    expect(domTexts(captions)).toEqual(['Blowing ballast', 'Sonar ping']);
    vi.advanceTimersByTime(1);
    expect(domTexts(captions)).toEqual(['Blowing ballast']);
    vi.advanceTimersByTime(500);
    expect(domTexts(captions)).toEqual([]);
    expect(captions.texts).toEqual([]);

    // An empty queue must restart its expiry scheduling on the next cue.
    vi.advanceTimersByTime(100);
    bus.emit({ id: 'shutter', text: 'Camera shutter', durationS: 1 });
    vi.advanceTimersByTime(config.captionMinDurationS * 1000 - 1);
    expect(domTexts(captions)).toEqual(['Camera shutter']);
    // Fractional-millisecond timeout rounding can defer pruning to the
    // consumer's existing 16 ms scheduling floor, never before the minimum.
    vi.advanceTimersByTime(17);
    expect(domTexts(captions)).toEqual([]);
  });

  it('evicts the oldest DOM line at the configured limit and retains the longer cue', () => {
    const bus = new CaptionBus();
    const parent = new Element();
    body.appendChild(parent);
    const captions = make(bus, true, parent as unknown as HTMLElement);
    expect(parent.children).toEqual([captions.root]);
    bus.emit({ id: 'ballast', text: 'Flooding ballast', durationS: 1 });
    const evicted = captions.root.children[0];
    bus.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });
    const retained = captions.root.children[1];
    bus.emit({ id: 'servo', text: 'Manipulator servo', durationS: 2 });
    expect(captions.root.children).toHaveLength(config.captionMaxLines);
    expect(domTexts(captions)).toEqual(['Sonar ping', 'Manipulator servo']);
    expect(captions.root.children[0]).toBe(retained);
    expect(evicted?.parentElement).toBeNull();
    vi.advanceTimersByTime(config.captionMinDurationS * 1000);
    expect(domTexts(captions)).toEqual(['Manipulator servo']);
    vi.advanceTimersByTime(500);
    expect(domTexts(captions)).toEqual([]);
  });

  it.each([1000, 2500])(
    'drops disabled cues and re-enables at %i ms without reviving lines or expiring fresh ones early',
    (reenableAt) => {
      const bus = new CaptionBus();
      const captions = make(bus, false);
      expect(captions.enabled).toBe(false);
      expect(captions.root.hidden).toBe(true);
      bus.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });
      expect(domTexts(captions)).toEqual([]);
      captions.setEnabled(true);
      expect(domTexts(captions)).toEqual([]);
      bus.emit({ id: 'servo', text: 'Manipulator servo', durationS: 2 });
      vi.advanceTimersByTime(500);
      captions.setEnabled(false);
      expect(captions.enabled).toBe(false);
      expect(captions.root.hidden).toBe(true);
      expect(domTexts(captions)).toEqual([]);
      bus.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });
      vi.advanceTimersByTime(reenableAt - 500);
      expect(domTexts(captions)).toEqual([]);
      captions.setEnabled(true);
      expect(captions.enabled).toBe(true);
      expect(captions.root.hidden).toBe(false);
      expect(domTexts(captions)).toEqual([]);
      expect(captions.texts).toEqual([]);
      // Reusing the cleared ID must create a fresh lifetime.
      bus.emit({ id: 'servo', text: 'Manipulator servo', durationS: 1.5 });
      if (reenableAt < 2000) {
        vi.advanceTimersByTime(2000 - reenableAt);
        expect(domTexts(captions)).toEqual(['Manipulator servo']);
      }
      const remaining = reenableAt + config.captionMinDurationS * 1000 - performance.now();
      vi.advanceTimersByTime(remaining - 1);
      expect(domTexts(captions)).toEqual(['Manipulator servo']);
      vi.advanceTimersByTime(1);
      expect(domTexts(captions)).toEqual([]);
      expect(captions.texts).toEqual([]);
    },
  );

  it('cancels pending expiry and unsubscribes a detached consumer while its replacement works', () => {
    const bus = new CaptionBus();
    const retired = make(bus);
    bus.emit({ id: 'ballast', text: 'Flooding ballast', durationS: 1 });
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(1);
    retired.dispose();
    expect(retired.root.parentElement).toBeNull();
    expect(body.children).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    const show = vi.spyOn(retired, 'show');
    const retiredTexts = domTexts(retired);
    bus.emit({ id: 'shutter', text: 'Camera shutter', durationS: 1 });
    expect(show).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    const replacement = make(bus);
    bus.emit({ id: 'ballast', text: 'Blowing ballast', durationS: 2 });
    expect(body.children).toEqual([replacement.root]);
    vi.advanceTimersByTime(1000);
    expect(domTexts(replacement)).toEqual(['Blowing ballast']);
    vi.advanceTimersByTime(999);
    expect(domTexts(replacement)).toEqual(['Blowing ballast']);
    vi.advanceTimersByTime(1);
    expect(domTexts(replacement)).toEqual([]);
    expect(domTexts(retired)).toEqual(retiredTexts);
    expect(retired.root.parentElement).toBeNull();
    expect(show).not.toHaveBeenCalled();
    bus.emit({ id: 'shutter', text: 'Camera shutter', durationS: 1 });
    expect(domTexts(replacement)).toEqual(['Camera shutter']);
    replacement.dispose();
    vi.advanceTimersByTime(10000);
    bus.emit({ id: 'sonar-ping', text: 'Sonar ping', durationS: 0.6 });
    expect(show).not.toHaveBeenCalled();
    expect(body.children).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
