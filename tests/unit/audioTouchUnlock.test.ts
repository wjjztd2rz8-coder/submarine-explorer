import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import { FocusTrap } from '../../src/ui/FocusTrap.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';

const calls = vi.hoisted(() => ({
  unlock: vi.fn(),
  dispose: vi.fn(),
  disposeCaptions: vi.fn(),
  unlistenSave: vi.fn(),
}));
vi.mock('../../src/audio/AudioSystem.js', () => ({
  AudioSystem: class {
    captions = {};
    unlock = calls.unlock;
    dispose = calls.dispose;
    setSettings = vi.fn();
    setPaused = vi.fn();
  },
}));
vi.mock('../../src/ui/Captions.js', () => ({
  Captions: class {
    dispose = calls.disposeCaptions;
  },
}));
import { audioSystem } from '../../src/app/systems/audio.js';

afterEach(() => {
  audioSystem.dispose?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
describe('touch unlock integration', () => {
  it('captures press and release gestures and removes every handler on restart', () => {
    const target = new EventTarget();
    const remove = target.removeEventListener.bind(target);
    target.removeEventListener = (type, listener, options) =>
      remove(type, listener, typeof options === 'boolean' ? { capture: options } : options);
    const listen = vi.spyOn(target, 'addEventListener');
    vi.stubGlobal('window', target);
    const ctx = {
      config: DEFAULT_CONFIG,
      bus: new EventBus(),
      terrain: { sampleHeight: () => -100 },
      app: { state: 'home' },
      settings: { captions: false },
      save: { onChange: () => calls.unlistenSave },
      expose: vi.fn(),
    } as unknown as GameContext;
    for (let round = 0; round < 2; round++) {
      audioSystem.init?.(ctx);
      for (const name of ['pointerdown', 'pointerup', 'touchend']) {
        expect(listen).toHaveBeenCalledWith(name, expect.any(Function), {
          passive: true,
          capture: true,
        });
        target.dispatchEvent(new Event(name));
      }
      expect(listen).toHaveBeenCalledWith('keydown', expect.any(Function), true);
      // Keyboard gestures still unlock audio when the top modal consumes the key.
      vi.stubGlobal('document', {});
      const trap = new FocusTrap({ hidden: false } as HTMLElement, { onEscape: null });
      trap.activate();
      const key = new Event('keydown', { cancelable: true });
      Object.defineProperty(key, 'code', { value: 'Escape' });
      target.dispatchEvent(key);
      expect(key.defaultPrevented).toBe(true);
      trap.dispose();
      expect(calls.unlock).toHaveBeenCalledTimes((round + 1) * 4);
      audioSystem.dispose?.();
      target.dispatchEvent(new Event('touchend'));
      expect(calls.unlock).toHaveBeenCalledTimes((round + 1) * 4);
    }
    expect(calls.dispose).toHaveBeenCalledTimes(2);
    expect(calls.disposeCaptions).toHaveBeenCalledTimes(2);
    expect(calls.unlistenSave).toHaveBeenCalledTimes(2);
  });
});
