import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/Input.js';
import { TouchControls } from '../../src/ui/TouchControls.js';
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

function fixture(canvasTouchAction = '', realInput?: Input) {
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
  const input = realInput ?? {
    touchActive: false,
    touchAxes: { throttle: 0, yaw: 0, pitch: 0, ballast: 0 },
    touchHeld: new Set<string>(),
    touchBoost: false,
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
    const [panel, chip] = (overlay.messages as unknown as TouchElement).children;
    const card = panel.children[1];
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
      expect(chip.hidden).toBe(true);
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
      expect(chip.hidden).toBe(true);
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
    const [panel, chip] = (overlay.messages as unknown as TouchElement).children;
    const card = panel.children[1];
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
        expect(chip.hidden).toBe(true);
        if (id !== 'objective') expect(scanner.view.objectiveId).toBeNull();
        tick(1.5);
        expect(scanner.isScanned('site', id)).toBe(true);
      }
      tick(2);
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.view.objectiveId).toBeNull();
      expect(chip.hidden).toBe(true);
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
        const boost = (f.controls.root as unknown as TouchElement).children[5];
        boost.dispatchEvent(new Event('click'));
        expect(f.input.touchBoost).toBe(true);
        expect(f.input.touchAxes.throttle).toBeGreaterThan(0.8);
        expect(f.input.touchAxes.ballast).toBe(-1);
        expect(f.input.touchHeld.has('scan')).toBe(true);
        if (interruption === 'visibilitychange') {
          f.doc.hidden = true;
          f.doc.dispatchEvent(new Event(interruption));
        } else f.win.dispatchEvent(new Event(interruption));
        expect(f.input.touchAxes).toEqual({ throttle: 0, yaw: 0, pitch: 0, ballast: 0 });
        expect(f.input.touchHeld.size).toBe(0);
        expect(f.input.touchBoost).toBe(false);
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
  const messages = overlay.messages as unknown as TouchElement;
  const hint = messages.children[0].children[1].children[2];
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
  const messages = overlay.messages as unknown as TouchElement;
  const card = messages.children[0].children[1];
  const [kicker, name, hint] = [card.children[0], card.children[1], card.children[2]];
  try {
    f.controls.setTouchMode(false);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(kicker.textContent).toBe('OBJECTIVE');
    expect(name.textContent).toBe('Stern section');
    expect(hint.textContent).toBe('TURN 40° STARBOARD');
    view.objectiveTurnDeg = 3;
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('CLOSE TO 120 M');
    view.objectiveInRange = true;
    f.controls.setTouchMode(true);
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(hint.textContent).toBe('SINK TOWARD TARGET');
    // A scannable contact keeps the scan prompt.
    view.candidateId = 'debris';
    overlay.update(view, { scan: 'G', guide: 'J' }, null, 0);
    expect(name.textContent).toBe('Debris field');
    expect(hint.textContent).toBe('HOLD SCAN TO SCAN');
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

it('keeps the objective chip exclusive with in-range contacts and completion cards', () => {
  const f = fixture();
  const overlay = new ScanOverlay(makeConfig().scan);
  const scanner = new Scanner(makeConfig().scan, new EventBus(), {
    record: () => ({ firstTime: true }),
  });
  const view = scanner.view;
  const messages = overlay.messages as unknown as TouchElement;
  const [panel, chip] = messages.children;
  const keys = { scan: 'G', guide: 'J' };
  Object.assign(view, {
    objectiveId: 'stern',
    objectiveName: 'Stern section',
    objectiveDistance: 692,
  });
  try {
    f.controls.setTouchMode(true);
    overlay.update(view, keys, null, 0);
    expect(panel.hidden).toBe(true);
    expect(chip.hidden).toBe(false);
    expect(chip.textContent).toBe('▸ Stern section · 692 m');
    Object.assign(view, {
      nearestId: 'bow',
      nearestName: 'Bow',
      nearestInRange: true,
      nearestDistance: 5,
      candidateId: 'bow',
    });
    overlay.update(view, keys, null, 0);
    expect(panel.hidden).toBe(false);
    expect(chip.hidden).toBe(true);
    view.nearestInRange = false;
    view.candidateId = null;
    overlay.update(view, keys, null, 0);
    expect(panel.hidden).toBe(true);
    expect(chip.hidden).toBe(false);
    overlay.showComplete('Bow', true, keys);
    expect(panel.hidden).toBe(false);
    expect(chip.hidden).toBe(true);
    overlay.update(view, keys, null, makeConfig().scan.completeBannerSeconds + 1);
    expect(panel.hidden).toBe(true);
    expect(chip.hidden).toBe(false);
    view.objectiveId = null;
    overlay.update(view, keys, null, 0);
    expect(chip.hidden).toBe(true);
    view.objectiveId = 'stern';
    f.controls.setTouchMode(false);
    overlay.update(view, keys, null, 0);
    expect(chip.hidden).toBe(true);
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

it('suppresses a visible objective chip immediately and restores it on the next unblocked update', () => {
  const f = fixture();
  const overlay = new ScanOverlay(makeConfig().scan);
  const scanner = new Scanner(makeConfig().scan, new EventBus(), {
    record: () => ({ firstTime: true }),
  });
  const view = scanner.view;
  const chip = (overlay.messages as unknown as TouchElement).children[1];
  const keys = { scan: 'G', guide: 'J' };
  Object.assign(view, { objectiveId: 'stern', objectiveName: 'Stern section' });
  try {
    f.controls.setTouchMode(true);
    overlay.update(view, keys, null, 0);
    expect(chip.hidden).toBe(false);
    overlay.setSuppressed(true);
    expect(chip.hidden).toBe(true);
    overlay.update(view, keys, null, 0);
    expect(chip.hidden).toBe(true);
    overlay.setSuppressed(false);
    overlay.update(view, keys, null, 0);
    expect(chip.hidden).toBe(false);
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});

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
    expect(overlay.cardVisible).toBe(true);
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
  const messages = overlay.messages as unknown as TouchElement;
  const hint = messages.children[0].children[1].children[2];
  bus.on('scan:complete', () => overlay.showComplete('Bow', true, keys));
  try {
    f.controls.setTouchMode(false);
    scanner.update(1, new Vector3(0, -100, 0), new Vector3(0, 0, -1), true);
    expect(hint.textContent).toBe('PRESS J · JOURNAL');
    expect(overlay.bannerActive).toBe(true);
    scanner.update(0, new Vector3(0, -100, 0), new Vector3(0, 0, -1), false);
    overlay.update(scanner.view, keys, null, config.scan.completeBannerSeconds);
    expect(overlay.bannerActive).toBe(false);
    expect(overlay.cardVisible).toBe(true);
    expect(hint.textContent).toBe('Logged · Journal');
    expect(scanner.view.completed).toBe(1);
  } finally {
    overlay.dispose();
    f.controls.dispose();
  }
});
