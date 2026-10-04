import { afterEach, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import { shellKeysSystem } from '../../src/app/systems/shell.js';
import { EventBus } from '../../src/core/EventBus.js';
import { HUD } from '../../src/ui/HUD.js';

afterEach(() => {
  shellKeysSystem.dispose?.();
  vi.unstubAllGlobals();
});

function setup(open = true) {
  const win = new EventTarget();
  // Match browser removal semantics; Node does not normalize boolean capture here.
  const remove = win.removeEventListener.bind(win);
  win.removeEventListener = (type, listener, options) =>
    remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { pointerLockElement: null });
  const summary = { focus: vi.fn() };
  const details = { open, querySelector: () => summary };
  // Use the real HUD dismissal method with only its DOM surface stubbed.
  const hud = Object.create(HUD.prototype) as HUD;
  Object.defineProperty(hud, 'root', { value: { querySelector: () => details } });
  const setAppState = vi.fn();
  const exitPhotoMode = vi.fn();
  const settingsScreen = { isOpen: false };
  const photoMode = { active: false };
  const ctx = {
    hud,
    app: { state: 'dive' },
    bus: new EventBus(),
    discovery: { guide: { isOpen: false }, debrief: { isOpen: false } },
    settingsScreen,
    globe: { isOpen: false },
    photoMode,
    home: {},
    pause: {},
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
    details,
    summary,
    settingsScreen,
    photoMode,
    setAppState,
    exitPhotoMode,
    afterShell,
    escape,
  };
}

it('capture-phase Escape closes credits and returns focus before pause or input sees it', () => {
  const f = setup();
  const event = f.escape();
  expect(f.details.open).toBe(false);
  expect(f.summary.focus).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(true);
  expect(f.setAppState).not.toHaveBeenCalled();
  expect(f.afterShell).not.toHaveBeenCalled();
  // Once credits are dismissed, the same key retains normal pause behavior.
  f.escape();
  expect(f.setAppState).toHaveBeenCalledExactlyOnceWith('pause');
  expect(f.summary.focus).toHaveBeenCalledOnce();
});

it('Escape pauses normally when credits are already closed', () => {
  const f = setup(false);
  f.escape();
  expect(f.setAppState).toHaveBeenCalledExactlyOnceWith('pause');
  expect(f.summary.focus).not.toHaveBeenCalled();
});

it('an open settings dialog retains Escape priority over credits', () => {
  const f = setup();
  f.settingsScreen.isOpen = true;
  f.escape();
  expect(f.details.open).toBe(true);
  expect(f.summary.focus).not.toHaveBeenCalled();
  expect(f.setAppState).not.toHaveBeenCalled();
});

it('photo-mode exit retains Escape priority over credits', () => {
  const f = setup();
  f.photoMode.active = true;
  f.escape();
  expect(f.exitPhotoMode).toHaveBeenCalledOnce();
  expect(f.details.open).toBe(true);
  expect(f.setAppState).not.toHaveBeenCalled();
});

it('disposing shell keys removes credit dismissal along with pause handling', () => {
  const f = setup();
  shellKeysSystem.dispose?.();
  f.escape();
  expect(f.details.open).toBe(true);
  expect(f.setAppState).not.toHaveBeenCalled();
  expect(f.afterShell).toHaveBeenCalledOnce();
});
