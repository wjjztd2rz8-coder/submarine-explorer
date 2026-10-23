/** The sonar follows tile aspect to prevent letterboxing and preserve map coordinates. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Sonar,
  canSonarWheelStep,
  easeSonarRange,
  sonarCanvasSize,
  sonarContourInterval,
  sonarFlatProfile,
  sonarLocalContourInterval,
  sonarPoiIcon,
  sonarPoiVisible,
  sonarProject,
  sonarProjectZoomed,
  sonarReliefRange,
} from '../../src/ui/Sonar.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { Terrain } from '../../src/world/Terrain.js';
import type { GameContext } from '../../src/app/context.js';
import { sonarControlsSystem } from '../../src/app/systems/sonar.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

describe('sonar canvas sizing', () => {
  it('portrait tile (Titanic, ~25 x 33 km): 220 px tall, narrower wide', () => {
    const s = sonarCanvasSize(25_000, 33_400, 220);
    expect(s.height).toBe(220);
    expect(s.width).toBe(Math.round((220 * 25_000) / 33_400));
  });

  it('landscape tile: 220 px wide', () => {
    expect(sonarCanvasSize(40_000, 39_000 / 1.25, 220)).toEqual({ width: 220, height: 172 });
  });

  it('square and degenerate tiles', () => {
    expect(sonarCanvasSize(10, 10, 220)).toEqual({ width: 220, height: 220 });
    expect(sonarCanvasSize(0, 0, 220)).toEqual({ width: 220, height: 220 });
  });

  it('projection maps the tile corners to the canvas corners (north up)', () => {
    const W = 25_000;
    const D = 33_400;
    const { width, height } = sonarCanvasSize(W, D, 220);
    expect(sonarProject(-W / 2, -D / 2, W, D, width, height)).toEqual({ px: 0, py: 0 }); // NW
    expect(sonarProject(W / 2, D / 2, W, D, width, height)).toEqual({ px: width, py: height }); // SE
    const c = sonarProject(0, 0, W, D, width, height);
    expect(c.px).toBeCloseTo(width / 2, 9);
    expect(c.py).toBeCloseTo(height / 2, 9);
  });
});

describe('D-SONAR sub-centred map', () => {
  it('eases zoom through intermediate ranges in both directions', () => {
    expect(easeSonarRange(1000, 500, 0)).toBe(1000);
    expect(easeSonarRange(1000, 500, 0.5)).toBeCloseTo(Math.sqrt(500_000));
    expect(easeSonarRange(1000, 500, 1)).toBe(500);
    expect(easeSonarRange(500, 1000, 0.5)).toBeCloseTo(Math.sqrt(500_000));
  });

  it('allows one wheel zoom step per 150 ms', () => {
    expect(canSonarWheelStep(1000, -Infinity)).toBe(true);
    expect(canSonarWheelStep(1149, 1000)).toBe(false);
    expect(canSonarWheelStep(1150, 1000)).toBe(true);
  });
  it('starts at a 1 km span and offers every contracted range plus the tile', () => {
    expect(DEFAULT_CONFIG.sonarZoom.initial).toBe(1000);
    expect(DEFAULT_CONFIG.sonarZoom.levels).toEqual([250, 500, 1000, 2000, 'tile']);
  });

  it('centres the sub and keeps north above east at each metric zoom', () => {
    for (const span of [250, 500, 1000, 2000]) {
      expect(sonarProjectZoomed(400, -200, 400, -200, span, 165, 220)).toEqual({
        px: 82.5,
        py: 110,
      });
      const north = sonarProjectZoomed(400, -200 - span / 4, 400, -200, span, 165, 220);
      const east = sonarProjectZoomed(400 + span / 4, -200, 400, -200, span, 165, 220);
      expect(north.py).toBe(55);
      expect(east.px).toBe(137.5);
    }
  });

  it('limits contacts to sensor range and visible map area', () => {
    expect(sonarPoiVisible(499, 500, 100, 100, 220, 220)).toBe(true);
    expect(sonarPoiVisible(501, 500, 100, 100, 220, 220)).toBe(false);
    expect(sonarPoiVisible(100, 500, -1, 100, 220, 220)).toBe(false);
  });

  it('gives scanned state priority over current objective', () => {
    expect(sonarPoiIcon(false, false)).toBe('·');
    expect(sonarPoiIcon(false, true)).toBe('◇');
    expect(sonarPoiIcon(true, true)).toBe('✓');
  });

  it('normalises local metres with a noise floor rather than the tile range', () => {
    expect(sonarReliefRange(-3810, -3790, 20)).toEqual({ low: -3810, span: 20 });
    expect(sonarReliefRange(-3802, -3798, 20)).toEqual({ low: -3810, span: 20 });
    expect(sonarReliefRange(-4300, -3700, 20)).toEqual({ low: -4300, span: 600 });
  });

  it('adapts contour intervals to actual relief without sub-metre noise', () => {
    expect(sonarContourInterval(25, 10, 20)).toBe(2);
    expect(sonarContourInterval(25, 100, 20)).toBe(20);
    expect(sonarContourInterval(100, 2000, 20)).toBe(100);
    expect(sonarContourInterval(5, 1, 20)).toBe(Infinity);
  });
});

describe('flat-site sonar relief', () => {
  it('leaves relief-rich views (Blue Hole, ~0.12 m/m) untouched', () => {
    const p = sonarFlatProfile(122, 1000);
    expect(p).toEqual({ flatness: 0, gainBoost: 1, tint: 0 });
    expect(sonarLocalContourInterval(10, 122, 20, p.flatness)).toBe(
      sonarContourInterval(10, 122, 20),
    );
  });

  it('boosts shading and tint on near-flat plains', () => {
    const titanic = sonarFlatProfile(9, 1000);
    expect(titanic.flatness).toBe(1);
    expect(titanic.gainBoost).toBeGreaterThan(5);
    expect(titanic.gainBoost).toBeLessThanOrEqual(16);
    expect(titanic.tint).toBeGreaterThan(0);
    expect(sonarFlatProfile(0, 1000).gainBoost).toBe(16);
    expect(sonarFlatProfile(6, 1000).gainBoost).toBeCloseTo(0.08 / 0.006);
  });

  it('chooses about six contours across the local relief, never below 1 m', () => {
    expect(sonarLocalContourInterval(25, 9, 20, 1)).toBe(2);
    expect(sonarLocalContourInterval(25, 6, 20, 1)).toBe(1);
    expect(sonarLocalContourInterval(100, 596, 20, 1)).toBe(100);
    expect(sonarLocalContourInterval(5, 1, 20, 1)).toBe(Infinity);
  });

  it('preserves the existing interval as the relief reaches the flatness boundary', () => {
    for (const relief of [60, 122, 300, 596]) {
      const { flatness } = sonarFlatProfile(relief, 1000);
      expect(flatness).toBe(0);
      expect(sonarLocalContourInterval(25, relief, 20, flatness)).toBe(
        sonarContourInterval(25, relief, 20),
      );
    }
    const almostSteep = sonarFlatProfile(59.99, 1000);
    expect(sonarLocalContourInterval(25, 59.99, 20, almostSteep.flatness)).toBe(
      sonarContourInterval(25, 59.99, 20),
    );
  });

  it('honours the line budget and noise floor on flat views at every range', () => {
    for (const view of [250, 500, 1000, 2000, 33000]) {
      const relief = view * 0.01;
      const { flatness } = sonarFlatProfile(relief, view);
      for (const budget of [1, 3, 6, 20]) {
        const interval = sonarLocalContourInterval(25, relief, budget, flatness);
        expect(interval).toBeGreaterThanOrEqual(1);
        expect(Math.ceil(relief / interval)).toBeLessThanOrEqual(budget);
      }
    }
    for (const relief of [0, 0.5, 1.99])
      expect(sonarLocalContourInterval(25, relief, 20, 1)).toBe(Infinity);
    expect(sonarLocalContourInterval(25, 2, 20, 1)).toBe(1);
  });

  it('fades gain and tint with local slope independently of zoom or absolute depth', () => {
    const mid = sonarFlatProfile(40, 1000);
    expect(mid.flatness).toBeCloseTo(0.5);
    expect(mid.tint).toBeCloseTo(0.12);
    expect(mid.gainBoost).toBeCloseTo(1.5);
    expect(sonarFlatProfile(20, 500)).toEqual(mid);
    expect(sonarFlatProfile(60, 1000)).toEqual({ flatness: 0, gainBoost: 1, tint: 0 });
  });
});

/** Only the attached DOM and event paths used by Sonar; no drawing or browser defaults. */
class SonarElement extends EventTarget {
  children: SonarElement[] = [];
  parentElement: SonarElement | null = null;
  className = '';
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  style = { setProperty() {} };
  textContent = '';
  type = '';
  tabIndex = -1;
  private listeners: Array<{
    type: string;
    fn: EventListenerOrEventListenerObject;
    capture: boolean;
  }> = [];
  classList = {
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
      return on;
    },
  };
  constructor(readonly tagName = 'DIV') {
    super();
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) this.tabIndex = 0;
  }
  append(...children: SonarElement[]) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }
  appendChild(child: SonarElement) {
    this.append(child);
    return child;
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  closest(selector: string): SonarElement | null {
    const matches = selector
      .split(',')
      .some((part) =>
        part.trim() === '[contenteditable="true"]'
          ? this.getAttribute('contenteditable') === 'true'
          : part.trim().toUpperCase() === this.tagName,
      );
    return matches ? this : (this.parentElement?.closest(selector) ?? null);
  }
  // The settings-note insertion is irrelevant to keyboard routing.
  querySelector() {
    return null;
  }
  focus() {
    if (this.tabIndex < 0) throw new Error('Fixture target is not focusable');
    (document as unknown as { activeElement: SonarElement }).activeElement = this;
  }
  blur() {
    (document as unknown as { activeElement: SonarElement }).activeElement =
      document.body as unknown as SonarElement;
  }
  click() {
    this.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
  }
  override addEventListener(
    type: string,
    fn: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (fn)
      this.listeners.push({
        type,
        fn,
        capture: typeof options === 'boolean' ? options : !!options?.capture,
      });
  }
  override removeEventListener(
    type: string,
    fn: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    this.listeners = this.listeners.filter(
      (l) => l.type !== type || l.fn !== fn || l.capture !== capture,
    );
  }
  override dispatchEvent(event: Event): boolean {
    const path: SonarElement[] = [];
    for (let node: SonarElement | null = this; node; node = node.parentElement) path.push(node);
    Object.defineProperty(event, 'target', { configurable: true, value: this });
    let immediate = false;
    const stopImmediate = event.stopImmediatePropagation.bind(event);
    event.stopImmediatePropagation = () => {
      immediate = true;
      stopImmediate();
    };
    const invoke = (node: SonarElement, capture: boolean) => {
      Object.defineProperty(event, 'currentTarget', { configurable: true, value: node });
      Object.defineProperty(event, 'eventPhase', {
        configurable: true,
        value:
          node === this ? Event.AT_TARGET : capture ? Event.CAPTURING_PHASE : Event.BUBBLING_PHASE,
      });
      for (const listener of [...node.listeners]) {
        if (listener.type !== event.type || listener.capture !== capture) continue;
        if (typeof listener.fn === 'function') listener.fn.call(node, event);
        else listener.fn.handleEvent(event);
        if (immediate) break;
      }
    };
    for (const node of path.slice(1).reverse()) {
      invoke(node, true);
      if (event.cancelBubble) return !event.defaultPrevented;
    }
    invoke(this, true);
    if (!immediate) invoke(this, false);
    if (event.bubbles && !event.cancelBubble) {
      for (const node of path.slice(1)) {
        invoke(node, false);
        if (event.cancelBubble) break;
      }
    }
    return !event.defaultPrevented;
  }
}

function sonarInputFixture() {
  const recorder = recordSonarCanvas();
  const context = recorder.document.createElement('canvas').getContext('2d');
  const win = new SonarElement('WINDOW');
  const body = new SonarElement('BODY');
  win.append(body);
  const createElement = (tag: string) =>
    Object.assign(new SonarElement(tag.toUpperCase()), { getContext: () => context });
  vi.stubGlobal('window', win);
  vi.stubGlobal('Element', SonarElement);
  vi.stubGlobal('HTMLElement', SonarElement);
  vi.stubGlobal('document', {
    body,
    documentElement: new SonarElement('HTML'),
    activeElement: body,
    createElement,
  });
  const sonar = new Sonar(
    { widthM: 2000, depthM: 3000, meta: { id: 'input-fixture', cols: 2, rows: 2 } } as Terrain,
    [],
    { parent: body as unknown as HTMLElement },
  );
  const ctx = {
    app: { state: 'dive' },
    sonar,
    settingsScreen: { root: body, isOpen: false },
    controlsCard: { isOpen: false },
    globe: { isOpen: false },
    discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
    photoMode: { active: false },
    missionRouter: { frozen: false },
  } as unknown as GameContext;
  sonarControlsSystem.init!(ctx);
  const root = sonar.root as unknown as SonarElement;
  const [out, label, into] = root.children[0].children[0].children;
  const zoomBy = vi.spyOn(sonar, 'zoomBy');
  const key = (target: SonarElement, code: string, extra: Partial<KeyboardEvent> = {}) => {
    if (target === body) (document.activeElement as unknown as SonarElement).blur();
    else target.focus();
    expect(document.activeElement).toBe(target);
    const event = Object.assign(new Event('keydown', { bubbles: true, cancelable: true }), {
      code,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...extra,
    });
    const prevent = vi.spyOn(event, 'preventDefault');
    const stop = vi.spyOn(event, 'stopPropagation');
    target.dispatchEvent(event);
    return { event, prevent, stop };
  };
  return { sonar, root, out, into, label, body, win, key, zoomBy, recorder, createElement };
}

describe('sonar keyboard and button routing', () => {
  afterEach(() => {
    sonarControlsSystem.dispose?.();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const keys = [
    { code: 'Equal', direction: -1, expected: 500 },
    { code: 'NumpadAdd', direction: -1, expected: 500 },
    { code: 'Minus', direction: 1, expected: 2000 },
    { code: 'NumpadSubtract', direction: 1, expected: 2000 },
  ];
  it.each(keys)(
    'consumes one $code step locally, then globally when focus leaves the map',
    ({ code, direction, expected }) => {
      const f = sonarInputFixture();
      const capture = vi.fn((event: Event) => event.eventPhase);
      const owner = vi.fn();
      f.win.addEventListener('keydown', capture, true);
      f.win.addEventListener('keydown', owner);
      const local = f.key(f.root, code);
      expect(capture).toHaveBeenCalledOnce();
      expect(capture.mock.results[0].value).toBe(Event.CAPTURING_PHASE);
      expect(capture.mock.calls[0][0].target).toBe(f.root);
      expect(owner).not.toHaveBeenCalled();
      expect(f.zoomBy).toHaveBeenCalledExactlyOnceWith(direction);
      expect(local.prevent).toHaveBeenCalledOnce();
      expect(local.stop).toHaveBeenCalledOnce();
      expect(local.event.defaultPrevented).toBe(true);
      expect(f.sonar.targetZoom).toBe(expected);
      expect(f.root.dataset.zoom).toBe(String(expected));
      expect(f.label.textContent).toBe(`${expected} m`);
      // Input changes the target immediately; the existing easing guard owns animation.
      expect(f.sonar.zoom).toBe(1000);
      f.sonar.setZoom(1000);
      f.zoomBy.mockClear();
      const global = f.key(f.body, code);
      expect(f.zoomBy).toHaveBeenCalledExactlyOnceWith(direction);
      expect(global.prevent).toHaveBeenCalledOnce();
      expect(global.stop).not.toHaveBeenCalled();
      expect(owner).toHaveBeenCalledOnce();
      expect(f.sonar.targetZoom).toBe(expected);
    },
  );

  it('leaves unrelated keys to their owner and accepts Shift plus', () => {
    const f = sonarInputFixture();
    const owner = vi.fn();
    f.win.addEventListener('keydown', owner);
    const unrelated = f.key(f.root, 'KeyM');
    expect(owner).toHaveBeenCalledOnce();
    expect(unrelated.prevent).not.toHaveBeenCalled();
    expect(unrelated.stop).not.toHaveBeenCalled();
    expect(f.zoomBy).not.toHaveBeenCalled();
    expect(f.sonar.expanded).toBe(false);
    f.key(f.root, 'Equal', { shiftKey: true });
    expect(f.sonar.targetZoom).toBe(500);
    expect(f.zoomBy).toHaveBeenCalledExactlyOnceWith(-1);
  });

  it.each(
    keys.flatMap((key) =>
      ['altKey', 'ctrlKey', 'metaKey'].map((modifier) => ({ ...key, modifier })),
    ),
  )('leaves $modifier + $code available on map, buttons and global paths', ({ code, modifier }) => {
    const f = sonarInputFixture();
    const owner = vi.fn();
    f.win.addEventListener('keydown', owner);
    for (const target of [f.root, f.into, f.out, f.body]) {
      const result = f.key(target, code, { [modifier]: true });
      expect({ prevented: result.event.defaultPrevented, zoom: f.sonar.targetZoom }).toEqual({
        prevented: false,
        zoom: 1000,
      });
      expect(result.prevent).not.toHaveBeenCalled();
      expect(result.stop).not.toHaveBeenCalled();
      expect(f.sonar.targetZoom).toBe(1000);
    }
    expect(f.zoomBy).not.toHaveBeenCalled();
    expect(owner).toHaveBeenCalledTimes(4);
  });

  it.each(keys)('leaves $code on native zoom buttons to the focused control', ({ code }) => {
    const f = sonarInputFixture();
    const owner = vi.fn();
    f.win.addEventListener('keydown', owner);
    for (const button of [f.into, f.out]) {
      const result = f.key(button, code);
      expect({ prevented: result.event.defaultPrevented, zoom: f.sonar.targetZoom }).toEqual({
        prevented: false,
        zoom: 1000,
      });
      expect(result.stop).not.toHaveBeenCalled();
    }
    expect(f.zoomBy).not.toHaveBeenCalled();
    expect(f.sonar.targetZoom).toBe(1000);
    expect(owner).toHaveBeenCalledTimes(2);
  });

  it.each(['input', 'select', 'textarea', 'button', 'contenteditable'])(
    'retains the global editable-target exclusion for %s',
    (tag) => {
      const f = sonarInputFixture();
      const field = f.createElement(tag === 'contenteditable' ? 'div' : tag);
      if (tag === 'contenteditable') {
        field.setAttribute('contenteditable', 'true');
        field.tabIndex = 0;
      }
      f.body.append(field);
      for (const { code } of keys) {
        const result = f.key(field, code);
        expect(result.event.defaultPrevented).toBe(false);
        expect(result.stop).not.toHaveBeenCalled();
      }
      expect(f.zoomBy).not.toHaveBeenCalled();
      expect(f.sonar.targetZoom).toBe(1000);
    },
  );

  it.each([false, true])(
    'routes native button clicks once without expanding the map (touch=%s)',
    (touch) => {
      const f = sonarInputFixture();
      document.documentElement.classList.toggle('is-touch', touch);
      expect(f.root.tabIndex).toBe(0);
      expect(f.root.getAttribute('aria-label')).toContain('Plus and minus change range');
      expect(f.into.tagName).toBe('BUTTON');
      expect(f.into.type).toBe('button');
      expect(f.out.type).toBe('button');
      expect(f.into.tabIndex).toBe(0);
      expect(f.out.tabIndex).toBe(0);
      expect(f.into.getAttribute('aria-label')).toBe('Sonar zoom in');
      expect(f.out.getAttribute('aria-label')).toBe('Sonar zoom out');
      for (const expanded of [false, true]) {
        if (f.sonar.expanded !== expanded) f.sonar.toggle();
        f.sonar.setZoom(1000);
        f.zoomBy.mockClear();
        for (const button of [f.into, f.out]) {
          for (const code of ['Enter', 'Space']) {
            const activation = f.key(button, code);
            expect(activation.event.defaultPrevented).toBe(false);
            expect(activation.stop).not.toHaveBeenCalled();
          }
        }
        expect(f.zoomBy).not.toHaveBeenCalled();
        // Deliver the click a native activation produces; the fixture does not synthesize defaults.
        f.into.focus();
        f.into.click();
        expect(f.zoomBy).toHaveBeenCalledExactlyOnceWith(-1);
        expect(f.sonar.targetZoom).toBe(500);
        expect(f.sonar.expanded).toBe(expanded);
        f.zoomBy.mockClear();
        f.out.focus();
        f.out.click();
        expect(f.zoomBy).toHaveBeenCalledExactlyOnceWith(1);
        expect(f.sonar.targetZoom).toBe(1000);
        expect(f.sonar.expanded).toBe(expanded);
      }
      f.sonar.canvas.dispatchEvent(new Event('click', { bubbles: true }));
      expect(f.sonar.expanded).toBe(!touch);
      expect(f.sonar.backdrop.hidden).toBe(touch);
      expect(f.recorder.rasters).toHaveLength(0);
      expect(f.recorder.draws).toHaveLength(0);
    },
  );

  it('clamps keyboard and native button steps at both public endpoints', () => {
    const f = sonarInputFixture();
    for (const { level, codes, button, label } of [
      { level: 250 as const, codes: ['Equal', 'NumpadAdd'], button: f.into, label: '250 m' },
      {
        level: 'tile' as const,
        codes: ['Minus', 'NumpadSubtract'],
        button: f.out,
        label: 'Whole tile',
      },
    ]) {
      f.sonar.setZoom(level);
      for (const code of codes) {
        const result = f.key(f.root, code);
        expect(result.prevent).toHaveBeenCalledOnce();
        expect(result.stop).toHaveBeenCalledOnce();
        expect(f.sonar.targetZoom).toBe(level);
      }
      button.click();
      expect(f.sonar.targetZoom).toBe(level);
      expect(f.root.dataset.zoom).toBe(String(level));
      expect(f.label.textContent).toBe(label);
    }
  });
});
