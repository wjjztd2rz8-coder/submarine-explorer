import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/Input.js';
import { TouchControls } from '../../src/ui/TouchControls.js';
import { Home } from '../../src/ui/Home.js';
import { FocusTrap } from '../../src/ui/FocusTrap.js';
import { Globe } from '../../src/ui/Globe.js';
import { ScanOverlay } from '../../src/ui/ScanOverlay.js';
import type { ScanView } from '../../src/game/Scanner.js';
import { Scanner } from '../../src/game/Scanner.js';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Vector3 } from 'three';

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
  constructor(readonly tagName = 'DIV') {
    super();
  }
  parentElement: TouchElement | null = null;
  private captures = new Set<number>();
  classList = {
    add: (name: string) => this.classList.toggle(name, true),
    remove: (name: string) => this.classList.toggle(name, false),
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
      return on;
    },
  };
  append(...children: TouchElement[]): void {
    for (const child of children) child.parentElement = this;
    this.children.push(...children);
  }
  appendChild(child: TouchElement): TouchElement {
    this.append(child);
    return child;
  }
  replaceChildren(...children: TouchElement[]): void {
    this.children = [];
    this.append(...children);
  }
  setAttribute(): void {}
  removeAttribute(): void {}
  closest(selector: string): TouchElement | null {
    if (
      selector
        .split(', ')
        .some((part) =>
          part.startsWith('.')
            ? this.classList.contains(part.slice(1))
            : this.tagName === part.toUpperCase(),
        )
    )
      return this;
    return this.parentElement?.closest(selector) ?? null;
  }
  querySelector(selector: string): TouchElement | null {
    return (
      this.querySelectorAll().find((child) =>
        selector.startsWith('.')
          ? child.classList.contains(selector.slice(1))
          : child.tagName === selector.toUpperCase(),
      ) ?? null
    );
  }
  contains(child: TouchElement): boolean {
    return child === this || this.children.some((entry) => entry.contains(child));
  }
  focus(): void {}
  setPointerCapture(id: number): void {
    this.captures.add(id);
  }
  hasPointerCapture(id: number): boolean {
    return this.captures.has(id);
  }
  releasePointerCapture(id: number): void {
    this.captures.delete(id);
  }
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
  Object.assign(event, { pointerId, pointerType: 'touch', button: 0, clientX: x, clientY: y });
  if (type === 'lostpointercapture') target.releasePointerCapture(pointerId);
  target.dispatchEvent(event);
  // Native pointerup/cancel implicitly release capture after dispatch.
  if (type === 'pointerup' || type === 'pointercancel') target.releasePointerCapture(pointerId);
}

function fixture(canvasTouchAction = '', realInput?: Input) {
  const body = new TouchElement();
  const doc = Object.assign(new EventTarget(), {
    body,
    hidden: false,
    documentElement: new TouchElement(),
    querySelector: () => null,
    createElement: (tag: string) => new TouchElement(tag.toUpperCase()),
    createElementNS: () => new TouchElement(),
  });
  const win = Object.assign(new EventTarget(), {
    innerWidth: 844,
    innerHeight: 390,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    matchMedia: () => ({ matches: true }),
  });
  vi.stubGlobal('HTMLElement', TouchElement);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('screen', { width: 844, height: 390 });
  vi.stubGlobal('navigator', { maxTouchPoints: 1 });
  const input = realInput ?? {
    touchActive: false,
    touchAxes: { throttle: 0, yaw: 0, pitch: 0, ballast: 0 },
    touchHeld: new Set<string>(),
    touchEdge: vi.fn(),
    touchLook: vi.fn(),
    touchZoom: vi.fn(),
    clear: vi.fn(),
  };
  const canvas = new TouchElement();
  canvas.style.touchAction = canvasTouchAction;
  const sonar = { expanded: false, zoomWheel: vi.fn() };
  const controls = new TouchControls({
    input: input as unknown as Input,
    canvas: canvas as unknown as HTMLElement,
    sonar,
    onPause: vi.fn(),
  });
  controls.update(true, false);
  const root = controls.root as unknown as TouchElement;
  const [stick, slider, buttons] = root.children;
  return { controls, input, doc, win, stick, slider, scan: buttons.children[0], canvas, sonar };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(['keyboard', 'touch', 'gamepad'] as const)(
  '%s holds, releases and completes the same selected scan through real input',
  (device) => {
    const input = new Input({ storage: null });
    const f = fixture('', input);
    const buttons = Array.from({ length: 6 }, () => ({ value: 0, pressed: false }));
    vi.stubGlobal('navigator', {
      getGamepads: () =>
        device === 'gamepad' ? [{ connected: true, index: 0, axes: [0, 0, 0, 0], buttons }] : [],
    });
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on('scan:complete', complete);
    const scanner = new Scanner(makeConfig().scan, bus);
    scanner.setTargets([
      {
        id: 'side',
        name: 'Side',
        landmarkId: 'site',
        position: new Vector3(40, -100, 0),
        radius: 150,
        scanSeconds: 2,
      },
      {
        id: 'objective',
        name: 'Objective',
        landmarkId: 'site',
        position: new Vector3(0, -100, -100),
        radius: 150,
        scanSeconds: 2,
      },
    ]);
    scanner.setObjective('objective');
    const overlay = new ScanOverlay(makeConfig().scan);
    const card = (overlay.slot.root as unknown as TouchElement).children[1];
    const keys = { scan: 'G', guide: 'J' };
    const held = (down: boolean) => {
      if (device === 'touch') pointer(f.scan, down ? 'pointerdown' : 'pointerup', 1);
      else if (device === 'keyboard') input.injectKey('KeyG', down);
      else buttons[5] = { value: down ? 1 : 0, pressed: down };
    };
    const tick = (dt: number) => {
      const state = input.sample();
      scanner.update(dt, new Vector3(0, -100, 0), new Vector3(0, 0, -1), state.scan);
      overlay.update(scanner.view, keys, null, dt);
      input.endFrame();
    };
    try {
      f.controls.setTouchMode(device === 'touch');
      tick(0);
      expect(card.children[1].textContent).toBe('Objective');
      expect(card.children[2].textContent).toBe(
        `HOLD ${device === 'touch' ? 'SCAN' : 'G'} TO SCAN`,
      );
      expect(overlay.slot.kind).toBe('scan');
      held(true);
      tick(0.5);
      tick(0.5);
      expect(scanner.view.activeId).toBe('objective');
      expect(scanner.view.progress).toBe(0.5);
      expect(complete).not.toHaveBeenCalled();
      held(false);
      tick(0.1);
      expect(scanner.view.phase).toBe('interrupted');
      expect(scanner.view.lastAbort).toBe('released');
      expect(complete).not.toHaveBeenCalled();
      held(true);
      tick(2);
      expect(complete).toHaveBeenCalledExactlyOnceWith({
        poiId: 'objective',
        landmarkId: 'site',
        firstTime: true,
      });
      tick(2);
      expect(complete).toHaveBeenCalledTimes(1);
      held(false);
      tick(0);
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.view.objectiveId).toBeNull();
      // No objective is left to name; only the logged-contact card may remain.
      expect(card.children[0].textContent).not.toBe('OBJECTIVE');
    } finally {
      overlay.dispose();
      f.controls.dispose();
      input.dispose();
    }
  },
);

it.each(['keyboard', 'touch', 'gamepad'] as const)(
  '%s scans the farther objective before nearer samples and wildlife while held',
  (device) => {
    const input = new Input({ storage: null });
    const f = fixture('', input);
    const buttons = Array.from({ length: 6 }, () => ({ value: 0, pressed: false }));
    vi.stubGlobal('navigator', {
      getGamepads: () =>
        device === 'gamepad' ? [{ connected: true, index: 0, axes: [0, 0, 0, 0], buttons }] : [],
    });
    const bus = new EventBus();
    const complete = vi.fn();
    bus.on('scan:complete', complete);
    const scanner = new Scanner(makeConfig().scan, bus);
    const contact = (id: string, distance: number) => ({
      id,
      name: id,
      landmarkId: 'site',
      position: new Vector3(0, -100, -distance),
      radius: 150,
      scanSeconds: 2,
    });
    scanner.setTargets([contact('objective', 100)]);
    scanner.setSupplementalTargets([contact('sample:rock', 40)]);
    scanner.setExtraTargets([contact('life:fish', 20)]);
    scanner.setObjective('objective');
    const overlay = new ScanOverlay(makeConfig().scan);
    const card = (overlay.slot.root as unknown as TouchElement).children[1];
    const tick = (dt: number) => {
      scanner.update(dt, new Vector3(0, -100, 0), new Vector3(0, 0, -1), input.sample().scan);
      overlay.update(scanner.view, { scan: 'G', guide: 'J' }, null, dt);
      input.endFrame();
    };
    try {
      f.controls.setTouchMode(device === 'touch');
      if (device === 'touch') pointer(f.scan, 'pointerdown', 1);
      else if (device === 'keyboard') input.injectKey('KeyG', true);
      else buttons[5] = { value: 1, pressed: true };
      for (const id of ['objective', 'sample:rock', 'life:fish']) {
        tick(0.5);
        expect(scanner.view.activeId).toBe(id);
        expect(scanner.view.candidateId).toBe(id);
        expect(scanner.view.nearestId).toBe(id);
        expect(card.children[1].textContent).toBe(id);
        expect(scanner.view.progress).toBe(0.25);
        expect(overlay.slot.kind).toBe('scan');
        if (id !== 'objective') expect(scanner.view.objectiveId).toBeNull();
        tick(1.5);
        expect(scanner.isScanned('site', id)).toBe(true);
      }
      tick(2);
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.view.objectiveId).toBeNull();
      expect(card.children[0].textContent).not.toBe('OBJECTIVE');
      expect(complete.mock.calls).toEqual(
        ['objective', 'sample:rock', 'life:fish'].map((poiId) => [
          { poiId, landmarkId: 'site', firstTime: true },
        ]),
      );
    } finally {
      overlay.dispose();
      f.controls.dispose();
      input.dispose();
    }
  },
);

describe('touch control interruptions', () => {
  it.each(['pointercancel', 'lostpointercapture'])(
    'releases each held control on %s without accepting stale moves',
    (event) => {
      const f = fixture();
      try {
        pointer(f.stick, 'pointerdown', 1);
        pointer(f.slider, 'pointerdown', 2, 60, 160);
        pointer(f.scan, 'pointerdown', 3);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchAxes.ballast).toBe(-1);
        expect(f.input.touchHeld.has('scan')).toBe(true);
        for (const control of [f.stick, f.slider, f.scan]) pointer(control, event, 99);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchAxes.ballast).toBe(-1);
        expect(f.input.touchHeld.has('scan')).toBe(true);
        pointer(f.stick, event, 1);
        pointer(f.slider, event, 2);
        pointer(f.scan, event, 3);
        pointer(f.stick, 'pointermove', 1);
        pointer(f.slider, 'pointermove', 2);
        expect(f.input.touchAxes).toEqual({ throttle: 0, yaw: 0, pitch: 0, ballast: 0 });
        expect(f.input.touchHeld.size).toBe(0);
        pointer(f.stick, 'pointerdown', 4);
        pointer(f.slider, 'pointerdown', 5);
        pointer(f.scan, 'pointerdown', 6);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchAxes.ballast).toBe(1);
        expect(f.input.touchHeld.has('scan')).toBe(true);
      } finally {
        f.controls.dispose();
      }
    },
  );

  it('routes drag and pinch to the photo camera while an expanded sonar map is hidden', () => {
    const f = fixture();
    const send = (type: string, id: number, x: number) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
      Object.defineProperty(event, 'target', { value: f.canvas });
      f.win.dispatchEvent(event);
    };
    try {
      f.sonar.expanded = true;
      f.controls.update(false, true);
      send('pointerdown', 1, 60);
      send('pointermove', 1, 70);
      expect(f.input.touchLook).toHaveBeenCalledExactlyOnceWith(10, 0);
      send('pointerdown', 2, 100);
      send('pointermove', 2, 110);
      expect(f.input.touchZoom).toHaveBeenCalledExactlyOnceWith(-40);
      expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    } finally {
      f.controls.dispose();
    }
  });

  it.each(['resize', 'orientationchange'])(
    'discards an unsampled touch shortcut when %s interrupts its press',
    (event) => {
      const input = new Input({ storage: null });
      const f = fixture('', input);
      const lights = (f.controls.root as unknown as TouchElement).children[2].children[1];
      try {
        pointer(lights, 'pointerdown', 7);
        f.win.dispatchEvent(new Event(event));
        expect(input.sample().toggleLights).toBe(false);
        pointer(lights, 'pointerdown', 8);
        expect(input.sample().toggleLights).toBe(true);
      } finally {
        f.controls.dispose();
        input.dispose();
      }
    },
  );

  it.each(['resize', 'orientationchange'])(
    'discards unsampled drag and pinch deltas when %s changes the phone layout',
    (event) => {
      const input = new Input({ storage: null });
      const f = fixture('', input);
      const send = (type: string, id: number, x: number) => {
        const e = new Event(type);
        Object.assign(e, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
        Object.defineProperty(e, 'target', { value: f.canvas });
        f.win.dispatchEvent(e);
      };
      try {
        send('pointerdown', 1, 60);
        send('pointermove', 1, 70);
        send('pointerdown', 2, 100);
        send('pointermove', 2, 120);
        expect(input.state.lookDx).toBe(10);
        expect(input.wheelDelta).toBeLessThan(0);
        f.win.dispatchEvent(new Event(event));
        expect(input.sample()).toMatchObject({ lookDx: 0, lookDy: 0 });
        expect(input.wheelDelta).toBe(0);
        send('pointermove', 1, 40);
        expect(input.state.lookDx).toBe(0);
        send('pointerdown', 3, 60);
        send('pointermove', 3, 75);
        expect(input.state.lookDx).toBe(15);
      } finally {
        f.controls.dispose();
        input.dispose();
      }
    },
  );

  it('drops a photo drag when pause opens while the flight controls are already hidden', () => {
    const f = fixture();
    const send = (type: string, x: number) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: 9, pointerType: 'touch', clientX: x, clientY: 60 });
      Object.defineProperty(event, 'target', { value: f.canvas });
      f.win.dispatchEvent(event);
    };
    try {
      f.controls.update(false, true);
      send('pointerdown', 60);
      f.controls.update(false, true);
      send('pointermove', 70);
      expect(f.input.touchLook).toHaveBeenCalledWith(10, 0);
      vi.mocked(f.input.touchLook).mockClear();
      f.controls.update(false, false);
      f.controls.update(true, false);
      send('pointermove', 100);
      expect(f.input.touchLook).not.toHaveBeenCalled();
      send('pointerup', 100);
      send('pointerdown', 100);
      send('pointermove', 110);
      expect(f.input.touchLook).toHaveBeenCalledExactlyOnceWith(10, 0);
    } finally {
      f.controls.dispose();
    }
  });

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

  it.each(['blur', 'visibilitychange', 'resize', 'orientationchange', 'desktop', 'pause', 'photo'])(
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

  for (const interruption of ['blur', 'resize', 'orientationchange', 'visibilitychange']) {
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
        // Returning from phone chrome must not revive captured fingers.
        f.win.dispatchEvent(new Event('focus'));
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
  const hint = (overlay.slot.root as unknown as TouchElement).children[1].children[2];
  try {
    f.controls.setTouchMode(false);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('HOLD G TO SCAN');
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('HOLD SCAN TO SCAN');
    // The scanned contact is no longer a target, so the result takes the slot.
    Object.assign(view, { candidateId: null, nearestScanned: true });
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    overlay.showComplete('Bow', true, { scan: 'G', guide: 'J' });
    expect(hint.textContent).toBe('OPEN JOURNAL');
    f.controls.setTouchMode(false);
    overlay.showComplete('Bow', true, { scan: 'G', guide: 'J' });
    expect(hint.textContent).toBe('PRESS J · JOURNAL');
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('scan card guidance points at the mission objective, not the nearest contact', () => {
  const f = fixture();
  const overlay = new ScanOverlay({
    ringSizePx: 64,
    ringStrokePx: 2,
    reticleSizePx: 44,
    completeBannerSeconds: 3,
  });
  const view = {
    phase: 'idle',
    nearestId: 'debris',
    nearestName: 'Debris field',
    nearestInRange: true,
    nearestRadius: 300,
    nearestScanned: false,
    nearestDistance: 275,
    nearestTurnDeg: -108,
    candidateId: null,
    objectiveId: 'stern',
    objectiveName: 'Stern section',
    objectiveDistance: 692,
    objectiveRadius: 120,
    objectiveInRange: false,
    objectiveTurnDeg: 40,
    objectiveVertDeg: -20,
  } as ScanView;
  const card = (overlay.slot.root as unknown as TouchElement).children[1];
  const [kicker, name, hint] = [card.children[0], card.children[1], card.children[2]];
  try {
    // Range guidance occupies the shared slot on every device.
    f.controls.setTouchMode(false);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(kicker.textContent).toBe('OBJECTIVE');
    expect(name.textContent).toBe('Stern section');
    expect(hint.textContent).toBe('Get closer to scan · 692 m');
    // In scan range the card changes to an aim cue for the same target.
    view.objectiveInRange = true;
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(kicker.textContent).toBe('OBJECTIVE');
    expect(name.textContent).toBe('Stern section');
    view.objectiveInRange = false;
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(kicker.textContent).toBe('OBJECTIVE');
    expect(name.textContent).toBe('Stern section');
    expect(hint.textContent).toBe('Get closer to scan · 692 m · TURN 40° STARBOARD');
    view.objectiveTurnDeg = 3;
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('Get closer to scan · 692 m');
    view.objectiveInRange = true;
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('SINK TOWARD TARGET');
    // A scannable side contact must not replace the primary's name or direction.
    view.candidateId = 'debris';
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(kicker.textContent).toBe('OBJECTIVE');
    expect(name.textContent).toBe('Stern section');
    expect(hint.textContent).toBe('SINK TOWARD TARGET');
    // No objective: nearest-contact guidance as before.
    view.candidateId = null;
    view.objectiveId = null;
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(name.textContent).toBe('Debris field');
    expect(hint.textContent).toBe('TURN 108° PORT');
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('the standing objective yields to its ready scan and a completion card, then returns', () => {
  const f = fixture();
  const overlay = new ScanOverlay(makeConfig().scan);
  const scanner = new Scanner(makeConfig().scan, new EventBus(), {
    record: () => ({ firstTime: true }),
  });
  const view = scanner.view;
  const name = (overlay.slot.root as unknown as TouchElement).children[1].children[1];
  const keys = { scan: 'G', guide: 'J' };
  Object.assign(view, {
    objectiveId: 'stern',
    objectiveName: 'Stern section',
    objectiveDistance: 692,
  });
  try {
    f.controls.setTouchMode(true);
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('objective');
    expect(name.textContent).toBe('Stern section');
    Object.assign(view, {
      nearestId: 'stern',
      nearestName: 'Stern section',
      nearestInRange: true,
      nearestDistance: 5,
      candidateId: 'stern',
    });
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('scan');
    view.nearestInRange = false;
    view.candidateId = null;
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('objective');
    overlay.showComplete('Stern section', true, keys);
    expect(overlay.slot.kind).toBe('discovery');
    overlay.update(view, keys, null, makeConfig().scan.completeBannerSeconds + 1);
    expect(overlay.slot.kind).toBe('objective');
    view.objectiveId = null;
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('objective');
    expect(name.textContent).toBe('Stern section');
    view.nearestId = null;
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBeNull();
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('suppresses a visible objective immediately and restores it on the next unblocked update', () => {
  const f = fixture();
  const overlay = new ScanOverlay(makeConfig().scan);
  const scanner = new Scanner(makeConfig().scan, new EventBus(), {
    record: () => ({ firstTime: true }),
  });
  const view = scanner.view;
  const keys = { scan: 'G', guide: 'J' };
  Object.assign(view, { objectiveId: 'stern', objectiveName: 'Stern section' });
  try {
    f.controls.setTouchMode(true);
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('objective');
    overlay.setSuppressed(true);
    expect(overlay.slot.kind).toBeNull();
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBeNull();
    overlay.setSuppressed(false);
    overlay.update(view, keys, null, 0);
    expect(overlay.slot.kind).toBe('objective');
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it.each(['keyboard', 'touch'] as const)(
  '%s keeps simultaneous result/objective/hazard guidance in one slot and drops stale offers when blocked',
  (device) => {
    const f = fixture();
    const overlay = new ScanOverlay(makeConfig().scan);
    const view = new Scanner(makeConfig().scan, new EventBus()).view;
    const keys = { scan: 'G', guide: 'J' };
    Object.assign(view, {
      nearestId: 'bow',
      nearestName: 'Bow',
      nearestInRange: true,
      nearestDistance: 5,
      candidateId: 'bow',
      objectiveId: 'stern',
      objectiveName: 'Stern section',
      objectiveDistance: 692,
    });
    const name = (overlay.slot.root as unknown as TouchElement).children[1].children[1];
    try {
      f.controls.setTouchMode(device === 'touch');
      overlay.update(view, keys, null, 0);
      overlay.showComplete('Bow result', true, keys);
      overlay.slot.offer('warning', 'urgent', { kicker: 'WARNING', text: 'Hazard', tone: 'alert' });
      overlay.slot.notice('A hint');
      overlay.update(view, keys, null, 0);
      expect(overlay.slot.kind).toBe('urgent');
      expect(name.textContent).toBe('Hazard');
      expect(
        Array.from(document.body.querySelectorAll('*')).filter(
          (c) => c.className === 'guidance-slot',
        ),
      ).toHaveLength(1);
      overlay.slot.offer('warning', 'urgent', null);
      expect(overlay.slot.kind).toBe('discovery');
      expect(name.textContent).toBe('Bow result');
      overlay.slot.offer('warning', 'urgent', { kicker: 'WARNING', text: 'Hazard', tone: 'alert' });
      overlay.setSuppressed(true);
      expect(overlay.slot.visible).toBe(false);
      overlay.slot.notice('While paused');
      overlay.slot.offer('warning', 'urgent', {
        kicker: 'WARNING',
        text: 'Old hazard',
        tone: 'alert',
      });
      overlay.update(view, keys, null, 0);
      expect(overlay.slot.visible).toBe(false);
      overlay.setSuppressed(false);
      expect(overlay.slot.visible).toBe(false);
      overlay.update(view, keys, null, 0);
      expect(overlay.slot.kind).toBe('objective');
      expect(name.textContent).toBe('Stern section');
      view.nearestInRange = false;
      view.candidateId = null;
      overlay.update(view, keys, null, 0);
      expect(overlay.slot.kind).toBe('objective');
      expect(name.textContent).toBe('Stern section');
      expect(overlay.slot.showsName('Bow result')).toBe(false);
    } finally {
      overlay.dispose();
      f.controls.dispose();
    }
  },
);

it('hides an anchored reticle behind visible touch controls and restores it after they move or hide', () => {
  const f = fixture();
  const overlay = new ScanOverlay({
    ringSizePx: 64,
    ringStrokePx: 2,
    reticleSizePx: 44,
    completeBannerSeconds: 3,
  });
  let visible = true;
  let left = 210;
  Object.assign(f.doc, {
    querySelectorAll: (selector: string) => {
      expect(selector).toContain('.tc-buttons');
      return [
        {
          checkVisibility: () => visible,
          getBoundingClientRect: () => ({ left, right: left + 101, top: 786, bottom: 832 }),
        },
      ];
    },
  });
  const reticle = (overlay.root as unknown as TouchElement).children[0];
  const view = {
    phase: 'idle',
    nearestId: 'channel',
    nearestName: 'Channel',
    nearestInRange: true,
    candidateId: 'channel',
    nearestDistance: 57,
  } as ScanView;
  try {
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, { x: 217, y: 794 }, 0);
    expect(reticle.hidden).toBe(true);
    expect(overlay.slot.visible).toBe(true);
    left = 300;
    overlay.update(view, { scan: 'G', guide: 'J' }, { x: 217, y: 794 }, 0);
    expect(reticle.hidden).toBe(false);
    expect(reticle.style.transform).toBe('translate(217.0px, 794.0px)');
    left = 210;
    visible = false;
    overlay.update(view, { scan: 'G', guide: 'J' }, { x: 217, y: 794 }, 0);
    expect(reticle.hidden).toBe(false);
    visible = true;
    f.controls.setTouchMode(false);
    overlay.update(view, { scan: 'G', guide: 'J' }, { x: 217, y: 794 }, 0);
    expect(reticle.hidden).toBe(false);
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('replaces the completion banner with the logged contact card even when a remote unscanned hint exists', () => {
  const f = fixture();
  const config = makeConfig();
  const bus = new EventBus();
  const scanner = new Scanner(config.scan, bus);
  const overlay = new ScanOverlay(config.scan);
  scanner.setTargets([
    {
      id: 'bow',
      name: 'Bow',
      landmarkId: 'fixture',
      position: new Vector3(0, -100, -80),
      radius: 150,
      scanSeconds: 1,
    },
    {
      id: 'remote',
      name: 'Remote contact',
      landmarkId: 'fixture',
      position: new Vector3(0, -100, -300),
      radius: 150,
      scanSeconds: 1,
    },
  ]);
  const keys = { scan: 'G', guide: 'J' };
  const hint = (overlay.slot.root as unknown as TouchElement).children[1].children[2];
  bus.on('scan:complete', () => overlay.showComplete('Bow', true, keys));
  try {
    f.controls.setTouchMode(false);
    scanner.update(1, new Vector3(0, -100, 0), new Vector3(0, 0, -1), true);
    expect(hint.textContent).toBe('PRESS J · JOURNAL');
    expect(overlay.slot.kind).toBe('discovery');
    scanner.update(0, new Vector3(0, -100, 0), new Vector3(0, 0, -1), false);
    overlay.update(scanner.view, keys, null, config.scan.completeBannerSeconds);
    expect(overlay.slot.kind).toBe('objective');
    expect(hint.textContent).toBe('Logged · Journal');
    expect(scanner.view.completed).toBe(1);
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('zooms the sonar with a gradual pinch and resets its threshold between gestures', () => {
  const f = fixture();
  f.sonar.expanded = true;
  const send = (type: string, id: number, x: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
    Object.defineProperty(event, 'target', { value: f.canvas });
    f.win.dispatchEvent(event);
  };
  try {
    send('pointerdown', 1, 60);
    send('pointerdown', 2, 100);
    for (const x of [101, 102, 103]) send('pointermove', 2, x);
    expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    send('pointermove', 2, 104);
    expect(f.sonar.zoomWheel).toHaveBeenCalledExactlyOnceWith(-1);
    for (const x of [103, 102, 101, 100]) send('pointermove', 2, x);
    expect(f.sonar.zoomWheel.mock.calls).toEqual([[-1], [1]]);
    expect(f.input.touchZoom).not.toHaveBeenCalled();
    expect(f.input.touchLook).not.toHaveBeenCalled();
    send('pointerup', 2, 100);
    send('pointerdown', 3, 200);
    send('pointermove', 3, 201);
    expect(f.sonar.zoomWheel).toHaveBeenCalledTimes(2);
    send('pointermove', 3, 204);
    expect(f.sonar.zoomWheel.mock.calls).toEqual([[-1], [1], [-1]]);
  } finally {
    f.controls.dispose();
  }
});

it('does not carry unfinished sonar pinch motion into camera zoom', () => {
  const f = fixture();
  const send = (type: string, id: number, x: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
    Object.defineProperty(event, 'target', { value: f.canvas });
    f.win.dispatchEvent(event);
  };
  try {
    f.sonar.expanded = true;
    send('pointerdown', 1, 60);
    send('pointerdown', 2, 100);
    send('pointermove', 2, 103);
    expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    f.sonar.expanded = false;
    send('pointermove', 2, 104);
    expect(f.input.touchZoom).toHaveBeenCalledExactlyOnceWith(-4);
    f.sonar.expanded = true;
    send('pointermove', 2, 107);
    expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    send('pointermove', 2, 108);
    expect(f.sonar.zoomWheel).toHaveBeenCalledExactlyOnceWith(-1);
    expect(f.input.touchLook).not.toHaveBeenCalled();
  } finally {
    f.controls.dispose();
  }
});

it('keeps diagonal sonar pinch motion through the wheel threshold and reversal', () => {
  // The threshold is in wheel units; below-threshold events must not discard distance.
  const f = fixture();
  f.sonar.expanded = true;
  const send = (type: string, id: number, distance: number) => {
    const event = new Event(type);
    Object.assign(event, {
      pointerId: id,
      pointerType: 'touch',
      clientX: 60 + distance * 0.6,
      clientY: 60 + distance * 0.8,
    });
    Object.defineProperty(event, 'target', { value: f.canvas });
    f.win.dispatchEvent(event);
  };
  try {
    send('pointerdown', 1, 0);
    send('pointerdown', 2, 40);
    for (const distance of [41, 42, 43, 43.25]) send('pointermove', 2, distance);
    expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    send('pointermove', 2, 44);
    expect(f.sonar.zoomWheel.mock.calls).toEqual([[-1]]);
    for (const distance of [43, 42, 41, 40.75]) send('pointermove', 2, distance);
    expect(f.sonar.zoomWheel.mock.calls).toEqual([[-1]]);
    send('pointermove', 2, 40);
    expect(f.sonar.zoomWheel.mock.calls).toEqual([[-1], [1]]);
    expect(f.input.touchZoom).not.toHaveBeenCalled();
    expect(f.input.touchLook).not.toHaveBeenCalled();
  } finally {
    f.controls.dispose();
  }
});

it.each(
  ['start together', 'meet during pinch'].flatMap((gesture) =>
    [false, true].map((sonar) => ({ gesture, sonar })),
  ),
)('recovers finite zoom when fingers $gesture with sonar=$sonar', ({ gesture, sonar }) => {
  // Both zoom destinations must recover without issuing a reversed or nonfinite delta.
  const f = fixture();
  const send = (type: string, id: number, x: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
    Object.defineProperty(event, 'target', { value: f.canvas });
    f.win.dispatchEvent(event);
  };
  try {
    f.sonar.expanded = sonar;
    send('pointerdown', 1, 60);
    send('pointerdown', 2, gesture === 'start together' ? 60 : 100);
    if (gesture === 'meet during pinch') {
      send('pointermove', 2, 60);
      expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
      expect(f.input.touchZoom).not.toHaveBeenCalled();
    }
    f.sonar.zoomWheel.mockClear();
    send('pointermove', 2, 61);
    for (const x of [62, 63, 64]) send('pointermove', 2, x);
    expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
    send('pointermove', 2, 65);
    if (sonar) {
      expect(f.sonar.zoomWheel).toHaveBeenCalledExactlyOnceWith(-1);
      expect(f.input.touchZoom).not.toHaveBeenCalled();
    } else {
      expect(f.sonar.zoomWheel).not.toHaveBeenCalled();
      expect(vi.mocked(f.input.touchZoom).mock.calls).toEqual([[-4], [-4], [-4], [-4]]);
    }
    expect(f.input.touchLook).not.toHaveBeenCalled();
  } finally {
    f.controls.dispose();
  }
});

describe('phone home gestures', () => {
  function homeFixture() {
    const f = fixture();
    const home = new Home({
      dive: vi.fn(),
      journal: vi.fn(),
      subScreen: vi.fn(),
      settings: vi.fn(),
      controls: vi.fn(),
    });
    home.show();
    home.showSites(false);
    const sites = (home.root as unknown as TouchElement).children[3];
    return { ...f, home, sites, grab: sites.children[0], header: sites.children[1] };
  }

  it.each(['same handle', 'other handle'])(
    'keeps the first swipe owner when another finger touches the %s',
    (handle) => {
      const f = homeFixture();
      try {
        pointer(f.grab, 'pointerdown', 1, 60, 100);
        const second = handle === 'same handle' ? f.grab : f.header;
        pointer(second, 'pointerdown', 2, 60, 200);
        pointer(second, 'pointerup', 2, 60, 150);
        pointer(f.grab, 'pointercancel', 99);
        pointer(f.grab, 'lostpointercapture', 99);
        expect(f.sites.classList.contains('is-collapsed')).toBe(true);
        pointer(f.grab, 'pointerup', 1, 60, 60);
        expect(f.sites.classList.contains('is-collapsed')).toBe(false);
      } finally {
        f.home.dispose();
        f.controls.dispose();
      }
    },
  );

  it.each([
    'pointercancel',
    'lostpointercapture',
    'blur',
    'visibilitychange',
    'close sites',
    'hide home',
    'modal',
  ])('drops the old sheet swipe after %s and accepts a fresh swipe', (interruption) => {
    const f = homeFixture();
    try {
      pointer(f.grab, 'pointerdown', 1, 60, 100);
      if (interruption === 'modal') {
        const modal = new FocusTrap(f.canvas as unknown as HTMLElement);
        modal.show();
        modal.dispose();
      } else if (interruption === 'close sites') {
        f.home.closeSites();
        f.home.showSites(false);
      } else if (interruption === 'hide home') {
        f.home.hide();
        f.home.show();
      } else if (interruption === 'visibilitychange') {
        f.doc.hidden = true;
        f.doc.dispatchEvent(new Event(interruption));
        f.doc.hidden = false;
      } else if (interruption === 'blur') f.win.dispatchEvent(new Event(interruption));
      else pointer(f.grab, interruption, 1);
      pointer(f.grab, 'pointerup', 1, 60, 50);
      expect(f.sites.classList.contains('is-collapsed')).toBe(true);
      expect(f.grab.hasPointerCapture(1)).toBe(false);
      pointer(f.grab, 'pointerdown', 2, 60, 100);
      pointer(f.grab, 'pointerup', 2, 60, 50);
      expect(f.sites.classList.contains('is-collapsed')).toBe(false);
    } finally {
      f.home.dispose();
      f.controls.dispose();
    }
  });

  function globeFixture() {
    const f = fixture();
    // Exercise the real DOM input listeners without creating a WebGL context.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const globe = new Globe({
      config: makeConfig().globe,
      tileIds: [],
      catalog: Promise.resolve({ sites: [], missions: [], pending: [] }),
      embedded: true,
    });
    globe.open();
    return { ...f, globe, root: globe.root as unknown as TouchElement };
  }

  it('does not hand a globe drag to a second finger', () => {
    const f = globeFixture();
    try {
      const lon = f.globe.orbit.lon;
      pointer(f.root, 'pointerdown', 1);
      pointer(f.root, 'pointerdown', 2);
      pointer(f.root, 'pointermove', 2, 80);
      expect(f.globe.orbit.lon).toBe(lon);
      pointer(f.root, 'pointerup', 2);
      pointer(f.root, 'pointercancel', 2);
      pointer(f.root, 'lostpointercapture', 2);
      pointer(f.root, 'pointermove', 1, 80);
      expect(f.globe.orbit.lon).toBeLessThan(lon);
    } finally {
      f.globe.dispose();
      f.controls.dispose();
    }
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'visibilitychange', 'close', 'modal'])(
    'ends globe drag without a fling after %s and ignores stale motion',
    (interruption) => {
      const f = globeFixture();
      try {
        pointer(f.root, 'pointerdown', 1);
        pointer(f.root, 'pointermove', 1, 80);
        const lon = f.globe.orbit.lon;
        if (interruption === 'modal') {
          const modal = new FocusTrap(f.canvas as unknown as HTMLElement);
          modal.show();
          modal.dispose();
        } else if (interruption === 'close') {
          f.globe.close();
          f.globe.open();
        } else if (interruption === 'visibilitychange') {
          f.doc.hidden = true;
          f.doc.dispatchEvent(new Event(interruption));
          f.doc.hidden = false;
        } else if (interruption === 'blur') f.win.dispatchEvent(new Event(interruption));
        else pointer(f.root, interruption, 1);
        expect(f.root.classList.contains('is-dragging')).toBe(false);
        expect(f.root.hasPointerCapture(1)).toBe(false);
        pointer(f.root, 'pointermove', 1, 100);
        f.globe.orbit.update(0.01);
        expect(f.globe.orbit.lon).toBe(lon);
        pointer(f.root, 'pointerdown', 2);
        pointer(f.root, 'pointermove', 2, 80);
        expect(f.globe.orbit.lon).toBeLessThan(lon);
      } finally {
        f.globe.dispose();
        f.controls.dispose();
      }
    },
  );
});

it.each(['paused canvas', 'lostpointercapture', 'photo closes'])(
  'requires a fresh camera gesture after %s',
  (interruption) => {
    const f = fixture();
    const send = (type: string, id: number, x = 60) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
      Object.defineProperty(event, 'target', { value: f.canvas });
      f.win.dispatchEvent(event);
    };
    try {
      if (interruption === 'paused canvas') f.controls.update(false, false);
      if (interruption === 'photo closes') f.controls.update(false, true);
      send('pointerdown', 1);
      if (interruption === 'lostpointercapture') send(interruption, 1);
      f.controls.update(true, false);
      send('pointermove', 1, 80);
      expect(f.input.touchLook).not.toHaveBeenCalled();
      send('pointerdown', 2);
      send('pointermove', 2, 70);
      expect(f.input.touchLook).toHaveBeenCalledExactlyOnceWith(10, 0);
    } finally {
      f.controls.dispose();
    }
  },
);

it('releases flight, scan and camera ownership when a modal opens and closes between frames', () => {
  const f = fixture();
  const modal = new FocusTrap(new TouchElement() as unknown as HTMLElement);
  const send = (type: string, x: number) => {
    const event = new Event(type);
    Object.assign(event, { pointerId: 4, pointerType: 'touch', clientX: x, clientY: 60 });
    Object.defineProperty(event, 'target', { value: f.canvas });
    f.win.dispatchEvent(event);
  };
  try {
    pointer(f.stick, 'pointerdown', 1);
    pointer(f.slider, 'pointerdown', 2);
    pointer(f.scan, 'pointerdown', 3);
    send('pointerdown', 60);
    modal.show();
    modal.hide();
    pointer(f.stick, 'pointermove', 1);
    pointer(f.slider, 'pointermove', 2);
    send('pointermove', 80);
    expect(f.input.touchAxes).toEqual({ throttle: 0, yaw: 0, pitch: 0, ballast: 0 });
    expect(f.input.touchHeld.size).toBe(0);
    expect(f.input.touchLook).not.toHaveBeenCalled();
    expect(f.stick.hasPointerCapture(1)).toBe(false);
    expect(f.slider.hasPointerCapture(2)).toBe(false);
    expect(f.scan.hasPointerCapture(3)).toBe(false);
    pointer(f.scan, 'pointerdown', 5);
    pointer(f.scan, 'pointerup', 3);
    expect(f.input.touchHeld.has('scan')).toBe(true);
  } finally {
    modal.dispose();
    f.controls.dispose();
  }
});

it('discards queued touch edges and camera deltas when a modal opens between frames', () => {
  const input = new Input({ storage: null });
  const f = fixture('', input);
  const modal = new FocusTrap(new TouchElement() as unknown as HTMLElement);
  try {
    const lights = (f.controls.root as unknown as TouchElement).children[2].children[1];
    pointer(lights, 'pointerdown', 1);
    const send = (type: string, id: number, x: number) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: 60 });
      Object.defineProperty(event, 'target', { value: f.canvas });
      f.win.dispatchEvent(event);
    };
    send('pointerdown', 2, 60);
    send('pointermove', 2, 70);
    send('pointerdown', 3, 100);
    send('pointermove', 3, 120);
    expect(input.state.lookDx).toBe(10);
    expect(input.wheelDelta).toBeLessThan(0);
    modal.show();
    modal.hide();
    expect(input.sample()).toMatchObject({ lookDx: 0, lookDy: 0, toggleLights: false });
    expect(input.wheelDelta).toBe(0);
    pointer(lights, 'pointerdown', 4);
    expect(input.sample().toggleLights).toBe(true);
  } finally {
    modal.dispose();
    f.controls.dispose();
    input.dispose();
  }
});
