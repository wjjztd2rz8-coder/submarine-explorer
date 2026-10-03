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
  classList = {
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) => {
      if (on) this.classes.add(name);
      else this.classes.delete(name);
    },
  };
  append() {}
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
  });
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { maxTouchPoints: hardwareTouch ? 5 : 0 });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const input = {
    touchActive: false,
    touchAxes: { throttle: 0, yaw: 0, ballast: 0 },
    touchHeld: new Set(),
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
