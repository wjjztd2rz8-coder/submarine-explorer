import { afterEach, expect, it, vi } from 'vitest';
import { createPhotoSystem } from '../../src/app/systems/photo.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { EventBus } from '../../src/core/EventBus.js';
import { PhotoMode } from '../../src/ui/PhotoMode.js';
import { PhotoGallery } from '../../src/ui/PhotoGallery.js';
import { PhotoStore, type Photo } from '../../src/game/PhotoStore.js';

// Only the DOM operations used by the viewfinder; event dispatch exercises its real listeners.
class Element extends EventTarget {
  children: Element[] = [];
  textContent = '';
  className = '';
  hidden = false;
  type = '';
  dataset: Record<string, string> = {};
  classList = { toggle: vi.fn() };
  append(...children: Element[]) {
    this.children.push(...children);
  }
  replaceChildren(...children: Element[]) {
    this.children = children;
  }
  setAttribute() {}
  remove() {}
  contains(child: Element): boolean {
    return child === this || this.children.some((el) => el.contains(child));
  }
  click() {
    this.dispatchEvent(new Event('click'));
  }
}
let touch = false;
afterEach(() => {
  touch = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const documentElement = { classList: { contains: (name: string) => touch && name === 'is-touch' } };

it('releases photo ZIP URLs and timers on gallery teardown without affecting another gallery', () => {
  vi.useFakeTimers();
  vi.stubGlobal('document', { body: new Element(), createElement: () => new Element() });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  let serial = 0;
  const create = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation(() => `blob:photo-${++serial}`);
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const saved = [
    {
      id: 'p1',
      siteId: 'titanic',
      siteName: 'Titanic',
      poiId: null,
      poiName: null,
      at: '2026-10-01T00:00:00Z',
      depthM: 100,
      image: 'data:image/jpeg;base64,YQ==',
    },
  ] satisfies Photo[];
  const first = new PhotoGallery(new PhotoStore(null));
  const second = new PhotoGallery(new PhotoStore(null));
  const download = (gallery: PhotoGallery) => {
    const container = new Element();
    gallery.render(container as unknown as HTMLElement, saved);
    container.children[0].children[1].click();
  };
  try {
    download(first);
    download(second);
    expect(create).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(2);
    first.dispose();
    expect(revoke.mock.calls).toEqual([['blob:photo-1']]);
    expect(vi.getTimerCount()).toBe(1);
    first.dispose();
    vi.advanceTimersByTime(30_000);
    expect(revoke.mock.calls).toEqual([['blob:photo-1'], ['blob:photo-2']]);
    download(second);
    second.dispose();
    expect(revoke).toHaveBeenCalledWith('blob:photo-3');
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    first.dispose();
    second.dispose();
    create.mockRestore();
    revoke.mockRestore();
  }
});

it('replaces the toast in the top panel, restarts its timeout, and cancels it on exit/dispose', () => {
  vi.useFakeTimers();
  const body = new Element();
  vi.stubGlobal('document', { body, documentElement, createElement: () => new Element() });
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const mode = new PhotoMode(vi.fn(), vi.fn(), vi.fn());
  const top = (mode.root as unknown as Element).children[1];
  const toast = top.children.at(-1)!;
  try {
    for (let round = 0; round < 2; round++) {
      mode.setActive(true);
      mode.toast('Saved to Journal');
      expect(top.children.filter((el) => el.className === 'photo-mode-toast')).toHaveLength(1);
      vi.advanceTimersByTime(2000);
      mode.toast('Photo storage is full', true);
      vi.advanceTimersByTime(500); // The previous success timer must not hide the error.
      expect(toast.hidden).toBe(false);
      expect(toast.textContent).toBe('Photo storage is full');
      expect(toast.classList.toggle).toHaveBeenLastCalledWith('is-error', true);
      vi.advanceTimersByTime(5499);
      expect(toast.hidden).toBe(false);
      vi.advanceTimersByTime(1);
      expect(toast.hidden).toBe(true);

      mode.toast('Photo storage is full', true);
      vi.advanceTimersByTime(1000);
      mode.toast('Saved to Journal');
      expect(toast.classList.toggle).toHaveBeenLastCalledWith('is-error', false);
      vi.advanceTimersByTime(2499);
      expect(toast.hidden).toBe(false);
      vi.advanceTimersByTime(1);
      expect(toast.hidden).toBe(true);

      mode.toast('Saved to Journal');
      mode.setActive(false);
      expect(toast.hidden).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      mode.setActive(true);
      expect(toast.hidden).toBe(true);
    }
    mode.toast('Saved to Journal');
  } finally {
    mode.dispose();
  }
  expect(vi.getTimerCount()).toBe(0);
});

it('offers visible Capture, Done and Pause actions while the viewfinder is active', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, documentElement, createElement: () => new Element() });
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
  mode.dispose();
});

it('restores the opener only after the dive controls become visible again, over two rounds', () => {
  const body = new Element();
  let photoActive = false;
  let activeElement: Element | object = body;
  body.classList.toggle.mockImplementation((_name: string, on: boolean) => {
    photoActive = on;
  });
  const opener = {
    isConnected: true,
    // visibility:hidden retains layout boxes, but the browser refuses focus.
    getClientRects: () => [{}],
    blur: () => {
      activeElement = body;
    },
    focus: vi.fn(() => {
      if (!photoActive) activeElement = opener;
    }),
  };
  vi.stubGlobal('document', {
    body,
    documentElement,
    get activeElement() {
      return activeElement;
    },
    createElement: () => new Element(),
  });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const mode = new PhotoMode(vi.fn(), () => mode.setActive(false), vi.fn());
  try {
    for (let round = 0; round < 2; round++) {
      opener.focus();
      mode.setActive(true);
      expect(photoActive).toBe(true);
      expect(activeElement).toBe(body);
      const actions = (mode.root as unknown as Element).children.at(-1)!.children.at(-1)!;
      actions.children[1].click();
      expect(photoActive).toBe(false);
      expect(activeElement).toBe(opener);
    }
  } finally {
    mode.dispose();
  }
});

it('Done uses the photo system exit and Pause leaves photo mode for the pause menu', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, documentElement, createElement: () => new Element() });
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

it('disposing one photo system preserves the other live system over two lifetimes', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, documentElement, createElement: () => new Element() });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  for (let round = 0; round < 2; round++) {
    const setup = () => {
      const ctx = {
        bus: new EventBus(),
        journal: { setPhotoGallery: vi.fn() },
        expose: vi.fn(),
        rig: { exitPhotoMode: vi.fn() },
        input: { state: { lookDx: 0, lookDy: 0 }, wheelDelta: 0 },
        setAppState: vi.fn(),
      } as unknown as GameContext;
      const system = createPhotoSystem();
      system.init?.(ctx);
      system.start?.(ctx);
      return { ctx, system };
    };
    const first = setup();
    const second = setup();
    try {
      second.ctx.photoMode.setActive(true);
      first.system.dispose?.();
      expect(second.ctx.photoMode.active).toBe(true);
      second.ctx.bus.emit('app:state', { state: 'pause' });
      expect(second.ctx.photoMode.active).toBe(false);
      expect(second.ctx.rig.exitPhotoMode).toHaveBeenCalledOnce();
    } finally {
      first.system.dispose?.();
      second.system.dispose?.();
    }
  }
});

it('on touch the capture button and tips name no keys', () => {
  touch = true;
  const body = new Element();
  vi.stubGlobal('document', { body, documentElement, createElement: () => new Element() });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const mode = new PhotoMode(
    () => {},
    () => {},
    () => {},
  );
  mode.setActive(true, 'Enter');
  const bottom = (mode.root as unknown as Element).children.at(-1)!;
  const tips = bottom.children[0]!;
  const capture = bottom.children.at(-1)!.children[0]!;
  expect(capture.textContent).toBe('Capture');
  expect(tips.textContent).toBe('Drag to orbit · pinch to zoom');
  expect(`${capture.textContent} ${tips.textContent}`).not.toMatch(/Enter|Space|Esc|wheel/);
  mode.dispose();
});
