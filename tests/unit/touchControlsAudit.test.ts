import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Input } from '../../src/core/Input.js';
import { TouchControls } from '../../src/ui/TouchControls.js';
import { ScanOverlay } from '../../src/ui/ScanOverlay.js';
import type { ScanView } from '../../src/game/Scanner.js';

// A small DOM fixture dispatches events through the real control listeners.
class TouchElement extends EventTarget {
  children: TouchElement[] = [];
  className = '';
  hidden = false;
  textContent = '';
  dataset: Record<string, string> = {};
  style = { touchAction: '', transform: '', top: '', setProperty: vi.fn() };
  offsetWidth = 40;
  offsetHeight = 40;
  private classes = new Set<string>();
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) =>
      on ? this.classes.add(name) : this.classes.delete(name),
  };
  append(...children: TouchElement[]): void {
    this.children.push(...children);
  }
  appendChild(child: TouchElement): TouchElement {
    this.append(child);
    return child;
  }
  setAttribute(): void {}
  setPointerCapture(): void {}
  remove(): void {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 120, height: 160 };
  }
  querySelectorAll(): TouchElement[] {
    return this.children.flatMap((child) => [child, ...child.querySelectorAll()]);
  }
}

function pointer(target: TouchElement, type: string, pointerId: number, x = 60, y = 0): void {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId, pointerType: 'touch', clientX: x, clientY: y });
  target.dispatchEvent(event);
}

function fixture(canvasTouchAction = '') {
  const body = new TouchElement();
  const doc = Object.assign(new EventTarget(), {
    body,
    hidden: false,
    documentElement: new TouchElement(),
    createElement: () => new TouchElement(),
    createElementNS: () => new TouchElement(),
  });
  const win = Object.assign(new EventTarget(), {
    innerWidth: 844,
    innerHeight: 390,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    matchMedia: () => ({ matches: true }),
  });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('screen', { width: 844, height: 390 });
  vi.stubGlobal('navigator', { maxTouchPoints: 1 });
  const input = {
    touchActive: false,
    touchAxes: { throttle: 0, yaw: 0, pitch: 0, ballast: 0 },
    touchHeld: new Set<string>(),
    touchEdge: vi.fn(),
    touchLook: vi.fn(),
    touchZoom: vi.fn(),
  };
  const canvas = new TouchElement();
  canvas.style.touchAction = canvasTouchAction;
  const controls = new TouchControls({
    input: input as unknown as Input,
    canvas: canvas as unknown as HTMLElement,
    sonar: { expanded: false, zoomWheel: vi.fn() },
    onPause: vi.fn(),
  });
  controls.update(true, false);
  const root = controls.root as unknown as TouchElement;
  const [stick, slider, buttons] = root.children;
  return { controls, input, doc, win, stick, slider, scan: buttons.children[0], canvas };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('touch control interruptions', () => {
  it.each(['cancel', 'drag', 'pinch'])(
    'does not pair taps across a %s camera gesture',
    (gesture) => {
      const f = fixture();
      let now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      const send = (type: string, id = 9, x = 60) => {
        const event = new Event(type);
        Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
        Object.defineProperty(event, 'target', { value: f.canvas });
        f.win.dispatchEvent(event);
      };
      const tap = () => {
        send('pointerdown');
        send('pointerup');
      };
      try {
        tap();
        now += 50;
        send('pointerdown');
        if (gesture === 'cancel') send('pointercancel');
        else if (gesture === 'drag') {
          send('pointermove', 9, 100);
          send('pointerup', 9, 100);
        } else {
          send('pointerdown', 10, 80);
          send('pointerup', 10, 80);
          send('pointerup');
        }
        expect(f.input.touchEdge).not.toHaveBeenCalled();
        now += 50;
        tap();
        expect(f.input.touchEdge).not.toHaveBeenCalled();
        now += 50;
        tap();
        expect(f.input.touchEdge).toHaveBeenCalledExactlyOnceWith('resetCamera');
      } finally {
        f.controls.dispose();
      }
    },
  );

  it('restores the canvas touch-action preference on teardown', () => {
    const f = fixture('pan-y');
    expect(f.canvas.style.touchAction).toBe('none');
    f.controls.dispose();
    expect(f.canvas.style.touchAction).toBe('pan-y');
  });

  it('repeated disposal cannot disable rebuilt controls', () => {
    const f = fixture();
    f.controls.dispose();
    const next = new TouchControls({
      input: f.input as unknown as Input,
      canvas: f.canvas as unknown as HTMLElement,
      sonar: { expanded: false, zoomWheel: vi.fn() },
      onPause: vi.fn(),
    });
    try {
      next.update(true, false);
      f.controls.dispose();
      expect(f.input.touchActive).toBe(true);
      expect(f.doc.documentElement.classList.contains('is-touch')).toBe(true);
    } finally {
      next.dispose();
    }
  });

  it.each(['blur', 'visibilitychange', 'resize', 'desktop', 'pause', 'photo'])(
    'starts a fresh double-tap sequence after %s',
    (interruption) => {
      const f = fixture();
      let now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      const tap = () => {
        for (const type of ['pointerdown', 'pointerup']) {
          const event = new Event(type);
          Object.assign(event, { pointerId: 9, pointerType: 'touch', clientX: 60, clientY: 60 });
          Object.defineProperty(event, 'target', { value: f.canvas });
          f.win.dispatchEvent(event);
        }
      };
      try {
        tap();
        expect(f.input.touchEdge).not.toHaveBeenCalled();
        if (interruption === 'visibilitychange') {
          f.doc.hidden = true;
          f.doc.dispatchEvent(new Event('visibilitychange'));
          f.doc.hidden = false;
          f.doc.dispatchEvent(new Event('visibilitychange'));
        } else if (interruption === 'desktop') {
          f.controls.setTouchMode(false);
          f.controls.setTouchMode(true);
        } else if (interruption === 'pause' || interruption === 'photo') {
          f.controls.update(interruption !== 'pause', interruption === 'photo');
          f.controls.update(true, false);
        } else f.win.dispatchEvent(new Event(interruption));
        now += 100;
        tap();
        expect(f.input.touchEdge).not.toHaveBeenCalled();
        now += 100;
        tap();
        expect(f.input.touchEdge).toHaveBeenCalledExactlyOnceWith('resetCamera');
      } finally {
        f.controls.dispose();
      }
    },
  );

  it('removes global listeners and clears touch input on disposal before a reboot', () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener');
    const f = fixture();
    const globalListeners = add.mock.calls.flatMap((args, i) =>
      add.mock.contexts[i] === f.win || add.mock.contexts[i] === f.doc
        ? [{ target: add.mock.contexts[i], args }]
        : [],
    );
    f.controls.dispose();
    expect(f.input.touchActive).toBe(false);
    for (const { target, args } of globalListeners) {
      expect(
        remove.mock.calls.some(
          (off, i) =>
            remove.mock.contexts[i] === target &&
            off[0] === args[0] &&
            off[1] === args[1] &&
            off[2] === args[2],
        ),
      ).toBe(true);
    }
    const next = new TouchControls({
      input: f.input as unknown as Input,
      canvas: f.canvas as unknown as HTMLElement,
      sonar: { expanded: false, zoomWheel: vi.fn() },
      onPause: vi.fn(),
    });
    try {
      next.update(true, false);
      const stick = (next.root as unknown as TouchElement).children[0];
      pointer(stick, 'pointerdown', 4);
      f.doc.dispatchEvent(new Event('visibilitychange'));
      expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
      f.doc.hidden = true;
      f.doc.dispatchEvent(new Event('visibilitychange'));
      expect(f.input.touchAxes.throttle).toBe(0);
      pointer(stick, 'pointermove', 4);
      expect(f.input.touchAxes.throttle).toBe(0);
      pointer(stick, 'pointerdown', 5);
      expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
    } finally {
      next.dispose();
    }
  });

  for (const interruption of ['blur', 'resize', 'visibilitychange']) {
    it(`releases axes and holds on ${interruption}, and accepts a new gesture`, () => {
      const f = fixture();
      try {
        pointer(f.stick, 'pointerdown', 1);
        pointer(f.slider, 'pointerdown', 2, 60, 160);
        pointer(f.scan, 'pointerdown', 3);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchAxes.ballast).toBe(-1);
        expect(f.input.touchHeld.has('scan')).toBe(true);
        if (interruption === 'visibilitychange') {
          f.doc.hidden = true;
          f.doc.dispatchEvent(new Event(interruption));
        } else f.win.dispatchEvent(new Event(interruption));
        expect(f.input.touchAxes).toEqual({ throttle: 0, yaw: 0, pitch: 0, ballast: 0 });
        expect(f.input.touchHeld.size).toBe(0);
        pointer(f.stick, 'pointermove', 1);
        expect(f.input.touchAxes.throttle).toBe(0);
        pointer(f.stick, 'pointerdown', 4);
        pointer(f.scan, 'pointerdown', 5);
        // The old captured finger can finish after the new scan starts.
        pointer(f.scan, 'pointerup', 3);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchHeld.has('scan')).toBe(true);
      } finally {
        f.controls.dispose();
      }
    });
  }

  it('keeps scanning until both fingers on Scan have released', () => {
    const f = fixture();
    try {
      pointer(f.scan, 'pointerdown', 1);
      pointer(f.scan, 'pointerdown', 2);
      pointer(f.scan, 'pointercancel', 2);
      pointer(f.scan, 'lostpointercapture', 2);
      expect(f.input.touchHeld.has('scan')).toBe(true);
      pointer(f.scan, 'pointerup', 1);
      expect(f.input.touchHeld.has('scan')).toBe(false);
    } finally {
      f.controls.dispose();
    }
  });
});

it('scan instructions use on-screen controls on touch and key bindings on keyboard', () => {
  const f = fixture();
  const overlay = new ScanOverlay({
    ringSizePx: 64,
    ringStrokePx: 2,
    reticleSizePx: 44,
    completeBannerSeconds: 3,
  });
  const view = {
    phase: 'idle',
    nearestId: 'bow',
    nearestName: 'Bow',
    nearestInRange: true,
    nearestScanned: false,
    nearestDistance: 5,
    candidateId: 'bow',
  } as ScanView;
  const root = overlay.root as unknown as TouchElement;
  const hint = root.children[1].children[1].children[2];
  try {
    f.controls.setTouchMode(false);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('HOLD G TO SCAN');
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('HOLD SCAN TO SCAN');
    overlay.showComplete('Bow', true, { scan: 'G', guide: 'J' });
    expect(hint.textContent).toBe('PAUSE → JOURNAL');
    f.controls.setTouchMode(false);
    overlay.showComplete('Bow', true, { scan: 'G', guide: 'J' });
    expect(hint.textContent).toBe('PRESS J · JOURNAL');
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});
