import { afterEach, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import { createTouchSystem } from '../../src/app/systems/touch.js';
import type { Input } from '../../src/core/Input.js';
import { TOUCH_SEEN_KEY } from '../../src/core/Touch.js';
import { TouchControls } from '../../src/ui/TouchControls.js';

// Minimal DOM surface; native EventTarget dispatch exercises real mode-switch listeners.
class Element extends EventTarget {
  style = { transform: '', top: '', touchAction: '' };
  private classes = new Set<string>();
  children: Element[] = [];
  hidden = false;
  className = '';
  offsetWidth = 40;
  offsetHeight = 40;
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) => {
      if (on) this.classes.add(name);
      else this.classes.delete(name);
    },
  };
  append(...children: Element[]) {
    this.children.push(...children);
  }
  setPointerCapture() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 120, height: 160 };
  }
  setAttribute() {}
  querySelectorAll() {
    return [];
  }
  remove() {}
}

const controls: TouchControls[] = [];
afterEach(() => {
  for (const touch of controls.splice(0)) touch.dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function setup(hardwareTouch = false) {
  const values = new Map<string, string>();
  const root = new Element();
  vi.stubGlobal('document', {
    body: new Element(),
    documentElement: root,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: () => new Element(),
  });
  const win = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: hardwareTouch }),
    innerWidth: 844,
    innerHeight: 390,
    clearTimeout: vi.fn((id: number) => globalThis.clearTimeout(id)),
    setTimeout: (fn: () => void, delay: number) => globalThis.setTimeout(fn, delay),
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal('screen', { width: 390, height: 844 });
  vi.stubGlobal('navigator', { maxTouchPoints: hardwareTouch ? 5 : 0 });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const input = {
    touchActive: false,
    touchAxes: { throttle: 0, yaw: 0, ballast: 0 },
    touchHeld: new Set(),
    touchLook: vi.fn(),
  } as unknown as Input;
  const opts = {
    input,
    canvas: new Element() as unknown as HTMLElement,
    sonar: { expanded: false, zoomWheel: vi.fn() },
    onPause: vi.fn(),
  };
  const create = () => {
    const touch = new TouchControls(opts);
    controls.push(touch);
    return touch;
  };
  const pointer = (type: string) =>
    win.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: type }));
  return { values, root, input, opts, win, create, pointer };
}

it.each(['hardware', 'pointer', 'forced'])(
  'restores %s touch layout immediately after a game reboot',
  (source) => {
    const { values, root, input, opts, create, pointer } = setup(source === 'hardware');
    let touch: TouchControls;
    if (source === 'forced') {
      const system = createTouchSystem();
      system.init?.({
        ...opts,
        params: new URLSearchParams('touch=1'),
        expose: (exposed: { touch: TouchControls }) => {
          touch = exposed.touch;
        },
      } as unknown as GameContext);
      controls.push(touch!);
    } else {
      touch = create();
      if (source === 'pointer') pointer('touch');
    }
    expect(touch!.active).toBe(true);
    expect(values.get(TOUCH_SEEN_KEY)).toBe('1');
    touch!.dispose();
    expect(root.classList.contains('is-touch')).toBe(false);
    // The next boot has no force param and reports desktop capabilities.
    vi.stubGlobal('navigator', { maxTouchPoints: 0 });
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
    expect(create().active).toBe(true);
    expect(input.touchActive).toBe(true);
    expect(root.classList.contains('is-touch')).toBe(true);
  },
);

it('still follows mouse and keyboard input after restoring saved touch detection', () => {
  const { values, root, input, create, pointer, win } = setup();
  values.set(TOUCH_SEEN_KEY, '1');
  const touch = create();
  pointer('mouse');
  expect(touch.active).toBe(false);
  expect(input.touchActive).toBe(false);
  expect(root.classList.contains('is-touch')).toBe(false);
  pointer('touch');
  expect(touch.active).toBe(true);
  win.dispatchEvent(Object.assign(new Event('keydown'), { code: 'ShiftLeft' }));
  expect(touch.active).toBe(true);
  win.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyW' }));
  expect(touch.active).toBe(false);
  expect(root.classList.contains('is-touch')).toBe(false);
});

it.each(['resize', 'orientationchange'])(
  'releases held axes, buttons and camera gestures on %s',
  (event) => {
    const { input, create, win, opts } = setup(true);
    const touch = create();
    touch.update(true, false);
    const stick = (touch.root as unknown as Element).children[0]!;
    const slider = (touch.root as unknown as Element).children[1]!;
    const scan = (touch.root as unknown as Element).children[2]!.children[0]!;
    const pointer = (type: string, pointerId: number, clientX = 0, clientY = 0) =>
      Object.assign(new Event(type), { pointerId, pointerType: 'touch', clientX, clientY });
    stick.dispatchEvent(pointer('pointerdown', 1, 60, 0));
    slider.dispatchEvent(pointer('pointerdown', 3, 0, 0));
    scan.dispatchEvent(pointer('pointerdown', 4));
    expect(input.touchAxes.throttle).toBeGreaterThan(0);
    expect(input.touchAxes.ballast).toBe(1);
    expect(input.touchHeld.has('scan')).toBe(true);
    // The mock DOM has no bubbling, so feed the canvas event to the window listener.
    const cameraDown = pointer('pointerdown', 2, 50, 50);
    Object.defineProperty(cameraDown, 'target', { value: opts.canvas });
    win.dispatchEvent(cameraDown);
    win.dispatchEvent(pointer('pointermove', 2, 60, 55));
    expect(input.touchLook).toHaveBeenCalledWith(10, 5);
    vi.mocked(input.touchLook).mockClear();
    win.dispatchEvent(new Event(event));
    expect(input.touchAxes).toEqual({ throttle: 0, yaw: 0, ballast: 0 });
    expect(input.touchHeld.size).toBe(0);
    stick.dispatchEvent(pointer('pointermove', 1, 60, -40));
    slider.dispatchEvent(pointer('pointermove', 3, 0, 160));
    win.dispatchEvent(pointer('pointermove', 2, 70, 70));
    expect(input.touchAxes.throttle).toBe(0);
    expect(input.touchAxes.ballast).toBe(0);
    expect(input.touchLook).not.toHaveBeenCalled();
    expect(touch.active).toBe(true);
  },
);

it.each(['rotation', 'disposal'])('cancels the portrait hint timer on %s', (transition) => {
  vi.useFakeTimers();
  const { create, win } = setup(true);
  win.innerWidth = 390;
  win.innerHeight = 844;
  const touch = create();
  touch.update(true, false);
  const hint = (touch.root as unknown as Element).children[4]!;
  expect(hint.hidden).toBe(false);
  expect(vi.getTimerCount()).toBe(1);
  if (transition === 'rotation') {
    win.innerWidth = 844;
    win.innerHeight = 390;
    win.dispatchEvent(new Event('resize'));
    expect(hint.hidden).toBe(true);
  } else touch.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
