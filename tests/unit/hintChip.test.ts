import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HintChip } from '../../src/ui/TutorialCard.js';

// A DOM surface for the chip's timer lifecycle; placement is covered by Playwright.
class Element {
  hidden = false;
  className = '';
  textContent = '';
  style = { setProperty: vi.fn() };
  private classes = new Set<string>();
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
  };
  setAttribute = vi.fn();
  addEventListener = vi.fn();
  append = vi.fn();
  remove = vi.fn();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('document', { createElement: () => new Element() });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const make = () => new HintChip(new Element() as unknown as HTMLElement);

describe('hint fade lifecycle', () => {
  it('fades during the last quarter second and is hidden at twelve seconds', () => {
    const chip = make();
    chip.show('Animal nearby.', 12);
    vi.advanceTimersByTime(11_749);
    expect(chip.visible).toBe(true);
    expect(chip.root.classList.contains('is-guidance-fading')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(chip.root.classList.contains('is-guidance-fading')).toBe(true);
    expect(chip.visible).toBe(true);
    vi.advanceTimersByTime(250);
    expect(chip.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains the nine-second default for pressure and supply hints', () => {
    const chip = make();
    chip.show('Near hull rating. Ascend to ease pressure.');
    vi.advanceTimersByTime(8_000);
    expect(chip.visible).toBe(true);
    vi.advanceTimersByTime(1_001);
    expect(chip.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('expiry does not depend on when a delayed fade callback runs', () => {
    const callbacks: (() => void)[] = [];
    vi.stubGlobal('window', {
      setTimeout: (callback: () => void) => callbacks.push(callback),
      clearTimeout: vi.fn(),
    });
    const chip = make();
    chip.show('Near hull rating.');
    // A browser clock jump or background tab delivers both timers late.
    // Running the due fade must not schedule a new hide timer in the future.
    const due = [...callbacks];
    for (const callback of due) callback();
    expect(chip.visible).toBe(false);
    expect(callbacks).toHaveLength(2);
  });

  it('an early fade is idempotent and does not keep moving the hide deadline', () => {
    const chip = make();
    chip.show('Animal nearby.');
    chip.fade();
    vi.advanceTimersByTime(150);
    chip.fade();
    vi.advanceTimersByTime(100);
    expect(chip.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a replacement message clears a pending fade, and dismissal/disposal cancel timers', () => {
    const chip = make();
    chip.show('Animal nearby.');
    chip.fade();
    vi.advanceTimersByTime(100);
    chip.show('Battery low. Ascend.');
    vi.advanceTimersByTime(250);
    expect(chip.visible).toBe(true);
    expect(chip.root.classList.contains('is-guidance-fading')).toBe(false);
    chip.hide();
    expect(chip.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    chip.show('Another hint.');
    chip.dispose();
    expect(chip.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
