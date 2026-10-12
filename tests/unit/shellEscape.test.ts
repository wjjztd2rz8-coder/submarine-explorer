import { afterEach, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import { shellKeysSystem } from '../../src/app/systems/shell.js';
import { EventBus } from '../../src/core/EventBus.js';

afterEach(() => {
  shellKeysSystem.dispose?.();
  vi.unstubAllGlobals();
});

function setup() {
  const win = new EventTarget();
  // Match browser removal semantics; Node does not normalize boolean capture here.
  const remove = win.removeEventListener.bind(win);
  win.removeEventListener = (type, listener, options) =>
    remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { pointerLockElement: null });
  const app = { state: 'dive' };
  const setAppState = vi.fn();
  const exitPhotoMode = vi.fn();
  const pauseEscape = vi.fn();
  const settingsScreen = { isOpen: false };
  const photoMode = { active: false };
  const ctx = {
    app,
    bus: new EventBus(),
    discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
    settingsScreen,
    globe: { isOpen: false },
    photoMode,
    home: {},
    pause: { escape: pauseEscape },
    setAppState,
    exitPhotoMode,
  } as unknown as GameContext;
  shellKeysSystem.init?.(ctx);
  const afterShell = vi.fn();
  win.addEventListener('keydown', afterShell);
  const escape = () => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperties(event, { code: { value: 'Escape' }, key: { value: 'Escape' } });
    win.dispatchEvent(event);
    return event;
  };
  return {
    pauseEscape,
    setApp: (state: string) => {
      app.state = state;
    },
    settingsScreen,
    photoMode,
    setAppState,
    exitPhotoMode,
    afterShell,
    escape,
  };
}

it('capture-phase Escape pauses the dive before input sees it', () => {
  const f = setup();
  const event = f.escape();
  expect(event.defaultPrevented).toBe(true);
  expect(f.setAppState).toHaveBeenCalledExactlyOnceWith('pause');
  expect(f.afterShell).not.toHaveBeenCalled();
});

it('Escape in the pause menu steps back through its own views', () => {
  const f = setup();
  f.setApp('pause');
  f.escape();
  expect(f.pauseEscape).toHaveBeenCalledOnce();
  expect(f.setAppState).not.toHaveBeenCalled();
});

it('an open settings dialog retains Escape priority over pause', () => {
  const f = setup();
  f.settingsScreen.isOpen = true;
  f.escape();
  expect(f.setAppState).not.toHaveBeenCalled();
});

it('photo-mode exit retains Escape priority over pause', () => {
  const f = setup();
  f.photoMode.active = true;
  f.escape();
  expect(f.exitPhotoMode).toHaveBeenCalledOnce();
  expect(f.setAppState).not.toHaveBeenCalled();
});

it('disposing shell keys removes pause handling', () => {
  const f = setup();
  shellKeysSystem.dispose?.();
  f.escape();
  expect(f.setAppState).not.toHaveBeenCalled();
  expect(f.afterShell).toHaveBeenCalledOnce();
});
