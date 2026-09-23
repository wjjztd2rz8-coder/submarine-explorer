/**
 * Input action-map tests. No DOM: keys go in through `injectKey`, which is the
 * same set the real listeners write to, and storage is a stub so the tests never
 * touch `localStorage`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  BINDINGS_STORAGE_KEY,
  Input,
  defaultActions,
  keyLabel,
  type BindingStore,
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

describe('Input action map', () => {
  it('exposes every action with a label and a category for a settings screen', () => {
    const input = makeInput();
    expect(input.actions.length).toBe(defaultActions().length);
    for (const a of input.actions) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(['Piloting', 'Systems', 'View']).toContain(a.category);
      expect(a.keys.length).toBeGreaterThan(0);
    }
    expect(input.primaryKeyLabel('thrustForward')).toBe('W');
    expect(input.primaryKeyLabel('ballastFlood')).toBe('Shift');
  });

  it('maps keys to normalised axes', () => {
    const input = makeInput();
    input.injectKey('KeyW', true);
    input.injectKey('KeyD', true);
    input.injectKey('ShiftLeft', true);
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
    input.injectKey('KeyC', true);
    expect(input.sample().toggleCamera).toBe(true);
    input.endFrame();
    // Still held, but the edge has been consumed.
    expect(input.sample().toggleCamera).toBe(false);
    input.injectKey('KeyC', false);
    input.injectKey('KeyC', true);
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

    // Stealing: give W to boost; thrustForward must not still claim it.
    input.rebind('boost', ['KeyW']);
    expect(input.getAction('thrustForward')?.keys).not.toContain('KeyW');
    expect(input.sample().boost).toBe(true);

    const saved = store.getItem(BINDINGS_STORAGE_KEY);
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved as string).version).toBe(1);
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
    expect(input.rebind('boost', [])).toBe(false);
    expect(input.getAction('boost')?.keys).toEqual(['KeyX']);

    store.setItem(BINDINGS_STORAGE_KEY, '{not json');
    const recovered = makeInput();
    expect(recovered.getAction('boost')?.keys).toEqual(['KeyX']);

    store.setItem(BINDINGS_STORAGE_KEY, JSON.stringify({ version: 99, keys: { boost: ['KeyZ'] } }));
    const wrongVersion = makeInput();
    expect(wrongVersion.getAction('boost')?.keys).toEqual(['KeyX']);
  });
});

describe('Input bindings across reloads (C5)', () => {
  it('a binding displaced by a conflict stays unbound after reload', () => {
    const first = makeInput();
    first.rebind('thrustForward', ['KeyX']); // takes X from boost
    expect(first.getAction('boost')?.keys).toEqual([]);

    const second = makeInput();
    expect(second.getAction('boost')?.keys).toEqual([]);
    expect(second.getAction('thrustForward')?.keys).toEqual(['KeyX']);
    second.injectKey('KeyX', true);
    const s = second.sample();
    expect(s.throttle).toBe(1);
    expect(s.boost).toBe(false);
  });

  it('an action missing from the save does not reclaim a key another action saved', () => {
    const payload = { version: 1, keys: { boost: ['KeyW'] } };
    store.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(payload));
    const input = makeInput();
    expect(input.getAction('boost')?.keys).toEqual(['KeyW']);
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
    expect(input.rebind('boost', ['KeyZ'])).toBe(true);
    expect(() => input.resetBindings()).not.toThrow();
    expect(input.getAction('boost')?.keys).toEqual(['KeyX']);
  });

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
    expect(input.getAction('boost')?.keys).toEqual(['KeyX']);
  });
});

describe('Input mouse look', () => {
  it('turns accumulated pixels into a clamped virtual stick, only when enabled', () => {
    const input = makeInput();
    input.state.lookDx = 280;
    input.state.lookDy = -70;
    expect(input.sample().yaw).toBe(0); // mouse-look off by default

    input.setMouseLook(true);
    input.state.lookDx = 280; // 2x the full-deflection distance
    input.state.lookDy = -70;
    const s = input.sample();
    expect(s.yaw).toBe(1);
    expect(s.pitch).toBeCloseTo(0.5, 6);

    input.setMouseLook(false);
    expect(input.state.lookDx).toBe(0);
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
