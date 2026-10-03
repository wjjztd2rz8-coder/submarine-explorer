import { afterEach, expect, it, vi } from 'vitest';
import { createPhotoSystem } from '../../src/app/systems/photo.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { PhotoMode } from '../../src/ui/PhotoMode.js';

// Only the DOM operations used by the viewfinder; event dispatch exercises its real listeners.
class Element extends EventTarget {
  children: Element[] = [];
  textContent = '';
  className = '';
  hidden = false;
  type = '';
  classList = { toggle: vi.fn() };
  append(...children: Element[]) {
    this.children.push(...children);
  }
  setAttribute() {}
  click() {
    this.dispatchEvent(new Event('click'));
  }
}
afterEach(() => vi.unstubAllGlobals());
it('offers visible Capture, Done and Pause actions while the viewfinder is active', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, createElement: () => new Element() });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const capture = vi.fn();
  const pause = vi.fn();
  const mode = new PhotoMode(capture, () => mode.setActive(false), pause);
  mode.setActive(true);
  const root = mode.root as unknown as Element;
  const actions = root.children.at(-1)!.children.at(-1)!;
  expect(root.hidden).toBe(false);
  expect(actions.children.map((b) => b.textContent)).toEqual([
    'Capture (Enter / Space)',
    'Done',
    'Pause',
  ]);
  actions.children[0].click();
  expect(capture).toHaveBeenCalledOnce();
  actions.children[2].click();
  expect(pause).toHaveBeenCalledOnce();
  actions.children[1].click();
  expect(mode.active).toBe(false);
  expect(root.hidden).toBe(true);
  expect(body.classList.toggle).toHaveBeenLastCalledWith('photo-active', false);
});

it('Done uses the photo system exit and Pause leaves photo mode for the pause menu', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, createElement: () => new Element() });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const bus = new EventBus();
  const exit = vi.fn();
  const pause = vi.fn((state: 'home' | 'dive' | 'pause') => bus.emit('app:state', { state }));
  const ctx = {
    bus,
    journal: { setPhotoGallery: vi.fn() },
    expose: vi.fn(),
    rig: { exitPhotoMode: exit },
    input: { state: { lookDx: 12, lookDy: 20 }, wheelDelta: 80 },
    setAppState: pause,
  } as unknown as GameContext;
  const system = createPhotoSystem();
  try {
    system.init?.(ctx);
    system.start?.(ctx);
    ctx.photoMode.setActive(true);
    const root = ctx.photoMode.root as unknown as Element;
    const actions = root.children.at(-1)!.children.at(-1)!;
    actions.children[0].click();
    actions.children[1].click();
    expect(exit).toHaveBeenCalledOnce();
    expect(ctx.input.state.lookDx).toBe(0);
    expect(ctx.input.state.lookDy).toBe(0);
    expect(ctx.input.wheelDelta).toBe(0);
    expect(ctx.photoMode.active).toBe(false);
    system.frame?.['render.capture']?.({} as FrameState, ctx); // cancelled capture must not touch the renderer
    ctx.photoMode.setActive(true);
    actions.children[2].click();
    expect(pause).toHaveBeenCalledWith('pause');
    expect(ctx.photoMode.active).toBe(false);
    expect(exit).toHaveBeenCalledTimes(2);
  } finally {
    system.dispose?.();
  }
});
