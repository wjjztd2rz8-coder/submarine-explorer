/**
 * Input action-map tests. No DOM: keys go in through `injectKey`, which is the
 * same set the real listeners write to, and storage is a stub so the tests never
 * touch `localStorage`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import {
  BINDINGS_STORAGE_KEY,
  LEGACY_BINDINGS_STORAGE_KEY,
  PREVIOUS_BINDINGS_STORAGE_KEY,
  POINTER_LOOK_STORAGE_KEY,
  Input,
  defaultActions,
  keyLabel,
  shouldPauseAfterPointerLookLoss,
  shouldRequestPointerLook,
  type BindingStore,
  type InputState,
} from '../../src/core/Input.js';

class MemoryStore implements BindingStore {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

let store: MemoryStore;
function makeInput(): Input {
  return new Input({ storage: store });
}

beforeEach(() => {
  store = new MemoryStore();
});

describe('pointer look preference and lock decisions', () => {
  it('persists the preference independently of the current browser lock', () => {
    const input = makeInput();
    input.setPointerLookPreference(true);
    expect(store.getItem(POINTER_LOOK_STORAGE_KEY)).toBe('true');
    expect(input.pointerLookEnabled).toBe(true);
    expect(input.pointerLookActive).toBe(false);
    expect(makeInput().pointerLookEnabled).toBe(true);
  });

  it('requests only on a clear dive and pauses only for unexpected lock loss', () => {
    expect(shouldRequestPointerLook(true, true, false, false)).toBe(true);
    expect(shouldRequestPointerLook(true, true, true, false)).toBe(false);
    expect(shouldRequestPointerLook(true, false, false, false)).toBe(false);
    expect(shouldRequestPointerLook(false, true, false, false)).toBe(false);
    expect(shouldPauseAfterPointerLookLoss(true, true, true, false)).toBe(true);
    expect(shouldPauseAfterPointerLookLoss(true, true, true, true)).toBe(false);
    expect(shouldPauseAfterPointerLookLoss(true, false, true, false)).toBe(false);
  });
});

describe('Input action map', () => {
  it.each([false, true])(
    'suppresses hidden-page pad polling without blur or replayed edges (background frames: %s)',
    (poll) => {
      const win = new EventTarget();
      const doc = Object.assign(new EventTarget(), { hidden: false });
      const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
      vi.stubGlobal('window', win);
      vi.stubGlobal('document', doc);
      vi.stubGlobal('navigator', {
        getGamepads: () => [{ connected: true, index: 0, axes: [0.5, -1, 0, -0.4], buttons }],
      });
      const input = makeInput();
      input.attach();
      try {
        expect(input.sample().throttle).toBe(1);
        input.endFrame();
        doc.hidden = true;
        doc.dispatchEvent(new Event('visibilitychange'));
        buttons[0] = buttons[5] = buttons[7] = { value: 1, pressed: true };
        if (poll) {
          const neutral = () => {
            expect(input.sample()).toMatchObject({
              throttle: 0,
              yaw: 0,
              pitch: 0,
              ballast: 0,
              scan: false,
              toggleCamera: false,
              toggleGuide: false,
            });
            expect(input.gamepadActive).toBe(false);
          };
          neutral();
          // A focus event must not override the page's hidden state.
          win.dispatchEvent(new Event('focus'));
          neutral();
          buttons[3] = buttons[14] = { value: 1, pressed: true };
          neutral();
        } else buttons[3] = buttons[14] = { value: 1, pressed: true };
        doc.hidden = false;
        doc.dispatchEvent(new Event('visibilitychange'));
        expect(input.sample()).toMatchObject({
          throttle: 1,
          yaw: 0.5,
          pitch: 0.4,
          ballast: 1,
          scan: true,
          toggleCamera: false,
          toggleGuide: false,
        });
        expect(input.gamepadActive).toBe(true);
        buttons[3] = buttons[14] = { value: 0, pressed: false };
        input.sample();
        buttons[3] = buttons[14] = { value: 1, pressed: true };
        expect(input.sample()).toMatchObject({ toggleCamera: true, toggleGuide: true });
      } finally {
        input.dispose();
        vi.unstubAllGlobals();
      }
    },
  );

  it.each([false, true])(
    'suppresses pad input across blur without replaying edges (background frames: %s)',
    (poll) => {
      const win = new EventTarget();
      vi.stubGlobal('window', win);
      vi.stubGlobal('document', new EventTarget());
      const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
      vi.stubGlobal('navigator', {
        getGamepads: () => [{ connected: true, index: 0, axes: [0.5, -1, 0, 0], buttons }],
      });
      const input = makeInput();
      input.attach();
      try {
        expect(input.sample().throttle).toBe(1);
        win.dispatchEvent(new Event('blur'));
        buttons[3] = { value: 1, pressed: true };
        buttons[5] = { value: 1, pressed: true };
        if (poll) {
          expect(input.sample()).toMatchObject({
            throttle: 0,
            yaw: 0,
            scan: false,
            toggleCamera: false,
          });
          expect(input.gamepadActive).toBe(false);
        }
        // Another press can arrive after the final background RAF has run.
        buttons[14] = { value: 1, pressed: true };
        win.dispatchEvent(new Event('focus'));
        expect(input.sample()).toMatchObject({
          throttle: 1,
          scan: true,
          toggleCamera: false,
          toggleGuide: false,
        });
        buttons[3] = { value: 0, pressed: false };
        input.sample();
        buttons[3] = { value: 1, pressed: true };
        expect(input.sample().toggleCamera).toBe(true);
      } finally {
        input.dispose();
        vi.unstubAllGlobals();
      }
    },
  );

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'contenteditable'])(
    'keeps gamepad and touch input neutral while %s owns focus without deferring pad edges',
    (tag) => {
      const win = new EventTarget();
      const editor = { tagName: tag, isContentEditable: tag === 'contenteditable' };
      const doc = Object.assign(new EventTarget(), { activeElement: editor });
      const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
      vi.stubGlobal('window', win);
      vi.stubGlobal('document', doc);
      vi.stubGlobal('navigator', {
        getGamepads: () => [{ connected: true, index: 0, axes: [0.5, -1, 0, -1], buttons }],
      });
      const input = makeInput();
      input.attach();
      try {
        for (let round = 0; round < 2; round++) {
          doc.activeElement = editor;
          const focus = new Event('focusin');
          Object.defineProperty(focus, 'target', { value: editor });
          doc.dispatchEvent(focus);
          input.touchAxes.ballast = 1;
          input.touchHeld.add('scan');
          input.touchEdge('toggleLights');
          input.touchLook(20, 10);
          input.touchZoom(100);
          buttons[3] = { value: 1, pressed: true };
          buttons[5] = { value: 1, pressed: true };
          expect(input.sample()).toMatchObject({
            throttle: 0,
            yaw: 0,
            pitch: 0,
            ballast: 0,
            scan: false,
            toggleLights: false,
            toggleCamera: false,
            lookDx: 0,
            lookDy: 0,
          });
          expect(input.gamepadActive).toBe(false);
          expect(input.wheelDelta).toBe(0);
          // Returning to play may restore held axes, but never a queued toggle.
          doc.activeElement = { tagName: 'BODY', isContentEditable: false };
          expect(input.sample()).toMatchObject({
            throttle: 1,
            scan: true,
            ballast: 0,
            toggleCamera: false,
            toggleLights: false,
          });
          expect(input.gamepadActive).toBe(true);
          buttons[3] = { value: 0, pressed: false };
          input.sample();
          buttons[3] = { value: 1, pressed: true };
          expect(input.sample().toggleCamera).toBe(true);
          input.endFrame();
          buttons[3] = { value: 0, pressed: false };
          input.sample();
        }
      } finally {
        input.dispose();
        vi.unstubAllGlobals();
      }
    },
  );

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'contenteditable'])(
    'clears held and queued flight controls when focus moves into %s',
    (tag) => {
      const win = new EventTarget();
      const doc = new EventTarget();
      vi.stubGlobal('window', win);
      vi.stubGlobal('document', doc);
      const input = makeInput();
      input.attach();
      try {
        for (let round = 0; round < 2; round++) {
          input.injectKey('KeyW', true);
          input.injectKey('KeyQ', true);
          input.touchLook(20, 10);
          const event = new Event('focusin');
          Object.defineProperty(event, 'target', {
            value: {
              tagName: tag,
              isContentEditable: tag === 'contenteditable',
            },
          });
          doc.dispatchEvent(event);
          expect(input.sample()).toMatchObject({ throttle: 0, toggleCamera: false, lookDx: 0 });
          input.injectKey('KeyW', true);
          expect(input.sample().throttle).toBe(1);
          input.clear();
        }
      } finally {
        input.dispose();
        vi.unstubAllGlobals();
      }
    },
  );

  it('combines simultaneous keyboard/touch/pad input and keeps held pad edges through a pause', () => {
    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    const axes = [0.5, -0.7, 0, 0];
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes, buttons }],
    });
    try {
      const input = makeInput();
      input.injectKey('KeyS', true);
      input.injectKey('KeyA', true);
      input.injectKey('KeyQ', true);
      input.touchAxes.throttle = 0.4;
      input.touchHeld.add('scan');
      buttons[3] = { value: 1, pressed: true };
      expect(input.sample()).toMatchObject({
        throttle: 0.7,
        yaw: 0.5,
        scan: true,
        toggleCamera: true,
      });
      input.clear(); // Pause clears pending keys/touch, while the pad remains held.
      expect(input.sample()).toMatchObject({
        throttle: 0.7,
        yaw: 0.5,
        scan: false,
        toggleCamera: false,
      });
      buttons[3] = { value: 0, pressed: false };
      input.sample();
      buttons[3] = { value: 1, pressed: true };
      expect(input.sample().toggleCamera).toBe(true);
      input.endFrame();
      axes[0] = axes[1] = 0;
      input.injectKey('KeyS', true);
      expect(input.sample().throttle).toBe(-1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each(['blur', 'visibilitychange', 'dispose'])('drops held and queued input on %s', (event) => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', doc);
    const input = makeInput();
    input.attach();
    try {
      input.injectKey('KeyW', true);
      input.injectKey('KeyQ', true);
      input.touchAxes.ballast = 1;
      input.touchHeld.add('scan');
      input.touchLook(20, 10);
      input.touchZoom(100);
      if (event === 'dispose') input.dispose();
      else (event === 'blur' ? win : doc).dispatchEvent(new Event(event));
      expect(input.sample()).toMatchObject({
        throttle: 0,
        ballast: 0,
        scan: false,
        toggleCamera: false,
        lookDx: 0,
        lookDy: 0,
      });
      expect(input.wheelDelta).toBe(0);
      input.injectKey('KeyW', true);
      expect(input.sample().throttle).toBe(1);
    } finally {
      input.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('attaches once and removes every listener before re-entry', () => {
    const win = new EventTarget();
    vi.stubGlobal('window', win);
    const input = makeInput();
    const key = () => {
      const event = Object.assign(new Event('keydown'), { code: 'KeyW' });
      Object.defineProperty(event, 'target', { value: { closest: () => null } });
      win.dispatchEvent(event);
    };
    try {
      input.attach();
      input.attach();
      input.dispose();
      key();
      expect(input.sample().throttle).toBe(0);
      input.attach();
      key();
      expect(input.sample().throttle).toBe(1);
      input.dispose();
      key();
      expect(input.sample().throttle).toBe(0);
    } finally {
      input.dispose();
      vi.unstubAllGlobals();
    }
  });

  const padEdges = [
    [2, 'toggleLights'],
    [3, 'toggleCamera'],
    [4, 'capturePhoto'],
    [8, 'toggleSonar'],
    [9, 'togglePhotoMode'],
    [12, 'cycleSimSpeed'],
    [13, 'resetCamera'],
    [14, 'toggleGuide'],
  ] as const;

  it.each(padEdges)('gamepad button %s fires only %s once per press', (button, action) => {
    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes: [0, 0, 0, 0], buttons }],
    });
    try {
      const input = makeInput();
      const check = (expected: keyof InputState | null): void => {
        const state = input.sample();
        for (const [, edge] of padEdges) expect(Boolean(state[edge])).toBe(edge === expected);
        expect(state.scan).toBe(false);
        expect([state.throttle, state.yaw, state.pitch, state.ballast]).toEqual([0, 0, 0, 0]);
      };
      buttons[button] = { value: 1, pressed: true };
      check(action);
      expect(input.gamepadActive).toBe(true);
      input.endFrame();
      check(null); // holding never repeats an edge
      buttons[button] = { value: 0, pressed: false };
      check(null);
      expect(input.gamepadActive).toBe(false);
      buttons[button] = { value: 1, pressed: true };
      check(action);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps existing pad axes and scan alongside the new edges', () => {
    const buttons = Array.from({ length: 16 }, () => ({ value: 0, pressed: false }));
    for (const i of [0, 4, 5, 7, 13, 14]) buttons[i] = { value: 1, pressed: true };
    let connected = true;
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected, index: 0, axes: [0.5, -0.7, 0, -0.4], buttons }],
    });
    try {
      const input = makeInput();
      expect(input.sample()).toMatchObject({
        throttle: 0.7,
        yaw: 0.5,
        pitch: 0.4,
        ballast: 1,
        scan: true,
        capturePhoto: true,
        resetCamera: true,
        toggleGuide: true,
      });
      input.endFrame();
      expect(input.sample()).toMatchObject({
        scan: true,
        capturePhoto: false,
        resetCamera: false,
        toggleGuide: false,
      });
      connected = false;
      input.endFrame();
      expect(input.sample()).toMatchObject({ scan: false, ballast: 0 });
      connected = true;
      expect(input.sample()).toMatchObject({
        capturePhoto: true,
        resetCamera: true,
        toggleGuide: true,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('leaves retired controls inert and preserves Q camera view and X camera reset', () => {
    const input = makeInput();
    expect(input.actions.filter((a) => a.keys.includes('KeyQ')).map((a) => a.id)).toEqual([
      'toggleCamera',
    ]);
    expect(input.actions.some((a) => a.keys.includes('KeyN') || a.keys.includes('Tab'))).toBe(
      false,
    );
    input.injectKey('KeyN', true);
    input.injectKey('Tab', true);
    input.injectKey('ShiftLeft', true);
    input.injectKey('ShiftRight', true);
    // Retired keyboard/RT inputs must not activate a neighbouring control.
    const buttons = Array.from({ length: 16 }, (_, i) => ({
      value: i === 7 ? 1 : 0,
      pressed: i === 7,
    }));
    vi.stubGlobal('navigator', {
      getGamepads: () => [{ connected: true, index: 0, axes: [0, 0, 0, 0], buttons }],
    });
    try {
      input.sample();
      for (const [, edge] of padEdges) expect(Boolean(input.state[edge])).toBe(false);
      expect(input.state).toMatchObject({ throttle: 0, yaw: 0, pitch: 0, ballast: 0, scan: false });
      expect(input.actions.map((a) => a.id)).not.toContain('boost');
      expect(input.state).not.toHaveProperty('boost');
      expect(input.state).not.toHaveProperty('ping');
      expect(input.state).not.toHaveProperty('toggleGlobe');
      input.injectKey('KeyX', true);
      expect(input.sample()).toMatchObject({ resetCamera: true, toggleCamera: false });
      input.endFrame();
      input.injectKey('KeyQ', true);
      expect(input.sample()).toMatchObject({ resetCamera: false, toggleCamera: true });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it.each([
    [LEGACY_BINDINGS_STORAGE_KEY, 1],
    [PREVIOUS_BINDINGS_STORAGE_KEY, 2],
    [BINDINGS_STORAGE_KEY, 3],
  ] as const)(
    'ignores obsolete actions in %s without reserving their keys',
    (storageKey, version) => {
      store.setItem(
        storageKey,
        JSON.stringify({
          version,
          keys: {
            ping: ['KeyQ', 'Tab'],
            toggleGlobe: ['KeyN', 'KeyH'],
            boost: ['KeyX', 'ShiftLeft', 'KeyI'],
            toggleSonar: ['KeyN'],
            thrustForward: ['KeyI'],
            toggleLights: [],
            [version === 1 ? 'toggleGuide' : 'toggleJournal']: ['KeyH'],
          },
        }),
      );
      const input = makeInput();
      expect(input.actions.map((a) => a.id)).not.toContain('ping');
      expect(input.actions.map((a) => a.id)).not.toContain('toggleGlobe');
      expect(input.actions.map((a) => a.id)).not.toContain('boost');
      expect(input.getAction('resetCamera')?.keys).toEqual(['KeyX']);
      expect(input.state).not.toHaveProperty('ping');
      expect(input.state).not.toHaveProperty('toggleGlobe');
      expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
      expect(input.getAction('toggleLights')?.keys).toEqual([]);
      expect(input.getAction('toggleSonar')?.keys).toEqual(['KeyN']);
      expect(input.getAction('toggleJournal')?.keys).toEqual(['KeyH']);
      input.injectKey('KeyN', true);
      input.injectKey('KeyH', true);
      input.injectKey('KeyQ', true);
      expect(input.sample()).toMatchObject({
        toggleSonar: true,
        toggleGuide: true,
        toggleCamera: true,
      });
      input.endFrame();
      input.injectKey('Tab', true);
      expect(input.sample()).toMatchObject({
        toggleSonar: false,
        toggleGuide: false,
        toggleCamera: false,
      });
      input.rebind('thrustForward', ['KeyU']);
      const saved = JSON.parse(store.getItem(BINDINGS_STORAGE_KEY)!);
      expect(saved.keys).not.toHaveProperty('ping');
      expect(saved.keys).not.toHaveProperty('toggleGlobe');
      expect(saved.keys).not.toHaveProperty('boost');
      expect(makeInput().getAction('toggleSonar')?.keys).toEqual(['KeyN']);
    },
  );

  it('exposes every action with a label and a category for a settings screen', () => {
    const input = makeInput();
    expect(input.actions.length).toBe(defaultActions().length);
    for (const a of input.actions) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(['Piloting', 'Systems', 'View']).toContain(a.category);
      expect(a.keys.length).toBeGreaterThan(0);
    }
    expect(input.primaryKeyLabel('thrustForward')).toBe('W');
    expect(input.primaryKeyLabel('ballastFlood')).toBe('Ctrl');
  });

  it('maps keys to normalised axes', () => {
    const input = makeInput();
    input.injectKey('KeyW', true);
    input.injectKey('KeyD', true);
    input.injectKey('ControlLeft', true);
    const s = input.sample();
    expect(s.throttle).toBe(1);
    expect(s.yaw).toBe(1);
    expect(s.ballast).toBe(-1);

    input.injectKey('KeyW', false);
    input.injectKey('KeyS', true);
    expect(input.sample().throttle).toBe(-1);
  });

  it('opposing keys cancel', () => {
    const input = makeInput();
    input.injectKey('KeyA', true);
    input.injectKey('KeyD', true);
    expect(input.sample().yaw).toBe(0);
  });

  it('edge actions fire once and clear on endFrame', () => {
    const input = makeInput();
    input.injectKey('KeyQ', true);
    expect(input.sample().toggleCamera).toBe(true);
    input.endFrame();
    // Still held, but the edge has been consumed.
    expect(input.sample().toggleCamera).toBe(false);
    input.injectKey('KeyQ', false);
    input.injectKey('KeyQ', true);
    expect(input.sample().toggleCamera).toBe(true);
  });

  it('scan is level-triggered, not an edge', () => {
    const input = makeInput();
    input.injectKey('KeyG', true);
    expect(input.sample().scan).toBe(true);
    input.endFrame();
    expect(input.sample().scan).toBe(true);
    input.injectKey('KeyG', false);
    expect(input.sample().scan).toBe(false);
  });
});

describe('Input rebinding', () => {
  it('rebinds, steals the key from any other action, and persists', () => {
    const input = makeInput();
    expect(input.rebind('thrustForward', ['KeyI'])).toBe(true);
    input.injectKey('KeyI', true);
    expect(input.sample().throttle).toBe(1);
    input.injectKey('KeyI', false);
    input.injectKey('KeyW', true);
    expect(input.sample().throttle).toBe(0);

    // Stealing: give W to scan; thrustForward must not still claim it.
    input.rebind('scan', ['KeyW']);
    expect(input.getAction('thrustForward')?.keys).not.toContain('KeyW');
    expect(input.sample().scan).toBe(true);

    const saved = store.getItem(BINDINGS_STORAGE_KEY);
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved as string).version).toBe(3);
  });

  it('reloads saved bindings in a fresh session and resets cleanly', () => {
    const first = makeInput();
    first.rebind('toggleSonar', ['KeyN']);

    const second = makeInput();
    expect(second.getAction('toggleSonar')?.keys).toEqual(['KeyN']);
    second.injectKey('KeyN', true);
    expect(second.sample().toggleSonar).toBe(true);

    second.resetBindings();
    expect(second.getAction('toggleSonar')?.keys).toEqual(['KeyM']);
    expect(store.getItem(BINDINGS_STORAGE_KEY)).toBeNull();
  });

  it('refuses an empty binding and survives a corrupt save', () => {
    const input = makeInput();
    expect(input.rebind('scan', [])).toBe(false);
    expect(input.getAction('scan')?.keys).toEqual(['KeyG']);

    store.setItem(BINDINGS_STORAGE_KEY, '{not json');
    const recovered = makeInput();
    expect(recovered.getAction('scan')?.keys).toEqual(['KeyG']);

    store.setItem(BINDINGS_STORAGE_KEY, JSON.stringify({ version: 99, keys: { scan: ['KeyZ'] } }));
    const wrongVersion = makeInput();
    expect(wrongVersion.getAction('scan')?.keys).toEqual(['KeyG']);
  });
});

describe('Input bindings across reloads (C5)', () => {
  it('a binding displaced by a conflict stays unbound after reload', () => {
    const first = makeInput();
    first.rebind('thrustForward', ['KeyG']); // takes the scan key
    expect(first.getAction('scan')?.keys).toEqual([]);

    const second = makeInput();
    expect(second.getAction('scan')?.keys).toEqual([]);
    expect(second.getAction('thrustForward')?.keys).toEqual(['KeyG']);
    second.injectKey('KeyG', true);
    const s = second.sample();
    expect(s.throttle).toBe(1);
    expect(s.scan).toBe(false);
  });

  it('an action missing from the save does not reclaim a key another action saved', () => {
    const payload = { version: 3, keys: { scan: ['KeyW'] } };
    store.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(payload));
    const input = makeInput();
    expect(input.getAction('scan')?.keys).toEqual(['KeyW']);
    expect(input.getAction('thrustForward')?.keys).toEqual(['ArrowUp']);
  });

  it('resetBindings survives a storage that throws', () => {
    const hostile: BindingStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const input = new Input({ storage: hostile });
    expect(input.rebind('scan', ['KeyZ'])).toBe(true);
    expect(() => input.resetBindings()).not.toThrow();
    expect(input.getAction('scan')?.keys).toEqual(['KeyG']);
  });

  it.each(['throws', 'silently fails'])(
    'does not reimport old remaps when legacy cleanup %s during reset',
    (failure) => {
      store.setItem(
        LEGACY_BINDINGS_STORAGE_KEY,
        JSON.stringify({ version: 1, keys: { thrustForward: ['KeyI'] } }),
      );
      const input = makeInput();
      const remove = vi.spyOn(store, 'removeItem').mockImplementation((key) => {
        if (key === LEGACY_BINDINGS_STORAGE_KEY) {
          if (failure === 'throws') throw new Error('removal denied');
          return;
        }
        store.map.delete(key);
      });
      input.resetBindings();
      expect(makeInput().actions).toEqual(input.actions);
      remove.mockRestore();
    },
  );

  it('a throwing getItem keeps the defaults', () => {
    const input = new Input({
      storage: {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {},
        removeItem: () => {},
      },
    });
    expect(input.getAction('scan')?.keys).toEqual(['KeyG']);
  });
});

describe('Input camera delta', () => {
  it('leaves piloting axes alone and clears camera movement after the frame', () => {
    const input = makeInput();
    input.state.lookDx = 280;
    input.state.lookDy = -70;
    expect(input.sample().yaw).toBe(0);
    expect(input.sample().pitch).toBe(0);
    input.endFrame();
    expect(input.state.lookDx).toBe(0);
    expect(input.state.lookDy).toBe(0);
  });
});

describe('v1 binding migration', () => {
  it('keeps custom choices and explicit unbound actions, while applying new defaults', () => {
    store.setItem(
      LEGACY_BINDINGS_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        keys: {
          ...Object.fromEntries(defaultActions().map((a) => [a.id, a.keys])),
          thrustForward: ['KeyI'],
          toggleLights: [],
          toggleGuide: ['KeyH'],
          pitchDown: ['KeyF'],
          ballastFlood: ['ShiftLeft', 'ShiftRight'],
          scan: ['KeyG'],
          toggleCamera: ['KeyC'],
        },
      }),
    );
    const input = makeInput();
    expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
    expect(input.getAction('toggleLights')?.keys).toEqual([]);
    expect(input.getAction('toggleJournal')?.keys).toEqual(['KeyH']);
    expect(input.getAction('ballastFlood')?.keys).toEqual(['ControlLeft', 'ControlRight', 'KeyC']);
    expect(input.getAction('scan')?.keys).toEqual(['KeyG']);
    expect(JSON.parse(store.getItem(BINDINGS_STORAGE_KEY)!).version).toBe(3);
    expect(store.getItem(LEGACY_BINDINGS_STORAGE_KEY)).not.toBeNull();
    input.resetBindings();
    expect(store.getItem(BINDINGS_STORAGE_KEY)).toBeNull();
    expect(store.getItem(LEGACY_BINDINGS_STORAGE_KEY)).toBeNull();
    expect(makeInput().getAction('thrustForward')?.keys).toEqual(['KeyW', 'ArrowUp']);
  });
});

describe('keyLabel', () => {
  it('prints codes the way a player reads them', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('ArrowLeft')).toBe('Left');
    expect(keyLabel('ShiftRight')).toBe('Shift');
    expect(keyLabel('Space')).toBe('Space');
  });
});

describe('drag camera', () => {
  it('orbits in chase and first person, with a bounded chase zoom', () => {
    const rig = new CameraRig(
      { ...DEFAULT_CONFIG.camera, chaseOffset: { x: 0, y: 24, z: 65 } },
      16 / 9,
    );
    const pos = new Vector3(0, -1000, 0);
    rig.snap(pos, 0, 0);
    const before = rig.camera.position.clone();
    rig.orbit(0.5, 0.2);
    rig.update(pos, 0, 0, 1);
    expect(rig.camera.position.distanceTo(before)).toBeGreaterThan(5);
    rig.orbit(0, 0, -100);
    expect(rig.chaseRadius).toBe(35);
    rig.orbit(0, 0, 100);
    expect(rig.chaseRadius).toBe(180);
    rig.setMode('first-person');
    rig.snap(pos, 0, 0);
    const facing = rig.camera.getWorldDirection(new Vector3());
    rig.orbit(0.3, 0);
    rig.update(pos, 0, 0, 1);
    expect(rig.camera.getWorldDirection(new Vector3()).distanceTo(facing)).toBeGreaterThan(0.1);
  });
});

describe('v2 binding migration', () => {
  it('reverts untouched pitch and scan while keeping custom keys and resolving new-default conflicts', () => {
    store.setItem(
      PREVIOUS_BINDINGS_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        keys: {
          pitchUp: ['KeyR'],
          pitchDown: ['KeyV'],
          scan: ['KeyF'],
          thrustForward: ['KeyI'],
          toggleLights: [],
          toggleJournal: ['KeyH'],
          toggleSonar: ['KeyG'],
        },
      }),
    );
    const input = makeInput();
    expect(input.getAction('pitchDown')?.keys).toEqual(['KeyF']);
    expect(input.getAction('scan')?.keys).toEqual(['KeyG']);
    expect(input.getAction('resetCamera')?.keys).toEqual(['KeyX']);
    expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
    expect(input.getAction('toggleLights')?.keys).toEqual([]);
    expect(input.getAction('toggleJournal')?.keys).toEqual(['KeyH']);
    expect(input.getAction('toggleSonar')?.keys).toEqual([]);
    expect(JSON.parse(store.getItem(BINDINGS_STORAGE_KEY)!).version).toBe(3);
    expect(store.getItem(PREVIOUS_BINDINGS_STORAGE_KEY)).not.toBeNull();
  });
});
