/**
 * Input action-map tests. No DOM: keys go in through `injectKey`, which is the
 * same set the real listeners write to, and storage is a stub so the tests never
 * touch `localStorage`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
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

    // Stealing: give W to boost; thrustForward must not still claim it.
    input.rebind('boost', ['KeyW']);
    expect(input.getAction('thrustForward')?.keys).not.toContain('KeyW');
    expect(input.sample().boost).toBe(true);

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
    expect(input.rebind('boost', [])).toBe(false);
    expect(input.getAction('boost')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);

    store.setItem(BINDINGS_STORAGE_KEY, '{not json');
    const recovered = makeInput();
    expect(recovered.getAction('boost')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);

    store.setItem(BINDINGS_STORAGE_KEY, JSON.stringify({ version: 99, keys: { boost: ['KeyZ'] } }));
    const wrongVersion = makeInput();
    expect(wrongVersion.getAction('boost')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);
  });
});

describe('Input bindings across reloads (C5)', () => {
  it('a binding displaced by a conflict stays unbound after reload', () => {
    const first = makeInput();
    first.rebind('thrustForward', ['ShiftLeft', 'ShiftRight']); // takes both boost keys
    expect(first.getAction('boost')?.keys).toEqual([]);

    const second = makeInput();
    expect(second.getAction('boost')?.keys).toEqual([]);
    expect(second.getAction('thrustForward')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);
    second.injectKey('ShiftLeft', true);
    const s = second.sample();
    expect(s.throttle).toBe(1);
    expect(s.boost).toBe(false);
  });

  it('an action missing from the save does not reclaim a key another action saved', () => {
    const payload = { version: 3, keys: { boost: ['KeyW'] } };
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
    expect(input.getAction('boost')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);
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
    expect(input.getAction('boost')?.keys).toEqual(['ShiftLeft', 'ShiftRight']);
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
          boost: [],
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
    expect(input.getAction('boost')?.keys).toEqual([]);
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
          boost: [],
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
    expect(input.getAction('boost')?.keys).toEqual([]);
    expect(input.getAction('toggleJournal')?.keys).toEqual(['KeyH']);
    expect(input.getAction('toggleSonar')?.keys).toEqual([]);
    expect(JSON.parse(store.getItem(BINDINGS_STORAGE_KEY)!).version).toBe(3);
    expect(store.getItem(PREVIOUS_BINDINGS_STORAGE_KEY)).not.toBeNull();
  });
});
