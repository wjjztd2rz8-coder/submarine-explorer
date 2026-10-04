import { afterEach, expect, it, vi } from 'vitest';
import { Input } from '../../src/core/Input.js';

afterEach(() => vi.unstubAllGlobals());

it.each(['Space', 'Enter'])(
  'data credit summary keeps native %s activation without piloting',
  (code) => {
    const win = new EventTarget();
    vi.stubGlobal('window', win);
    const input = new Input({ storage: null });
    input.attach();
    try {
      const summary = {
        tagName: 'SUMMARY',
        closest: (selector: string) => (selector.split(', ').includes('summary') ? summary : null),
      };
      const event = new Event('keydown', { cancelable: true });
      Object.defineProperties(event, {
        target: { value: summary },
        code: { value: code },
      });
      win.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      const state = input.sample();
      expect(state.ballast).toBe(0);
      expect(state.capturePhoto).not.toBe(true);
    } finally {
      input.dispose();
    }
  },
);
