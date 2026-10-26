import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { createPhotoSystem } from '../../src/app/systems/photo.js';
import type { GameContext } from '../../src/app/context.js';
import { SystemRunner, type FrameState } from '../../src/app/System.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import { LIFE_ID_PREFIX } from '../../src/world/life/Life.js';
import { PhotoMode, canvasThumbnail } from '../../src/ui/PhotoMode.js';
import { PhotoGallery } from '../../src/ui/PhotoGallery.js';
import { PHOTO_STORAGE_KEY, PhotoStore, type Photo } from '../../src/game/PhotoStore.js';
import titanicPois from '../../data/landmarks/titanic/pois.json';
import titanicMeta from '../../data/tiles/titanic/meta.json';

vi.mock('../../src/ui/PhotoMode.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/ui/PhotoMode.js')>()),
  canvasThumbnail: vi.fn(),
}));

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
  vi.mocked(canvasThumbnail).mockReset();
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

// Keep the real viewfinder, bus, Scanner and stores; only canvas readback is replaced.
function automaticStillFixture() {
  vi.stubGlobal('document', {
    body: new Element(),
    documentElement,
    createElement: () => new Element(),
  });
  vi.stubGlobal('window', {
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  // Deterministic SOI/EOI bytes admitted by PhotoStore, without decoding an image.
  const image = 'data:image/jpeg;base64,/9j/2Q==';
  const thumbnail = vi.mocked(canvasThumbnail).mockReturnValue(image);
  const dives: Array<{ runner: SystemRunner }> = [];
  function createDive() {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => data.set(key, value)),
    };
    vi.stubGlobal('localStorage', storage);
    const bus = new EventBus();
    const completed = vi.fn();
    bus.on('scan:complete', completed);
    const discoveries = new DiscoveryStore(null);
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, discoveries);
    const poi = placePois(
      parsePois(titanicPois),
      titanicMeta,
      { sampleHeight: () => -3800 },
      DEFAULT_CONFIG.scan,
      'titanic',
    )[0];
    const species = SPECIES_BY_ID.get('rattail')!;
    const animal: ScanTarget = {
      id: `${LIFE_ID_PREFIX}${species.id}`,
      name: species.common,
      landmarkId: 'titanic',
      position: poi.position.clone(),
      radius: species.scanRadius,
      scanSeconds: species.scanSeconds,
    };
    const ctx = {
      bus,
      contentLandmark: 'titanic',
      discovery: { pois: [poi] },
      journal: {
        setPhotoGallery: vi.fn(),
        siteName: vi.fn(() => 'RMS Titanic'),
        refresh: vi.fn(),
      },
      progress: { cosmetics: { frame: 'stock' } },
      renderer: { domElement: {} },
      audio: { playShutter: vi.fn() },
      expose: vi.fn(),
      rig: { exitPhotoMode: vi.fn(), camera: new PerspectiveCamera() },
      input: { state: { lookDx: 0, lookDy: 0 }, wheelDelta: 0 },
      setAppState: (state: 'dive' | 'pause' | 'home') => bus.emit('app:state', { state }),
    } as unknown as GameContext;
    const f = {
      sampled: {},
      frozen: false,
      blocked: false,
      pilotPosition: poi.position.clone().add(new Vector3(0, 0.26, 5)),
    } as FrameState;
    const forward = new Vector3(0, 0, -1);
    let held = false;
    const system = createPhotoSystem();
    const runner = new SystemRunner(ctx);
    runner.init([
      {
        name: 'scan-driver',
        frame: {
          'scan.discovery': () =>
            scanner.update(1 / 60, f.pilotPosition, forward, held && !f.frozen),
        },
      },
      system,
    ]);
    const shutter = vi.spyOn(ctx.photoMode, 'shutter');
    const toast = vi.spyOn(ctx.photoMode, 'toast');
    const complete = (target: ScanTarget, runFrame = true) => {
      scanner.setTargets(target === poi ? [poi] : []);
      scanner.setExtraTargets(target === poi ? [] : [target]);
      held = true;
      for (let step = 0; step < Math.ceil(target.scanSeconds * 60) + 1; step++) {
        if (runFrame) runner.frame(f);
        else scanner.update(1 / 60, f.pilotPosition, forward, true);
      }
      held = false;
    };
    const dive = {
      ctx,
      runner,
      f,
      scanner,
      poi,
      animal,
      completed,
      discoveries,
      storage,
      shutter,
      toast,
      complete,
    };
    dives.push(dive);
    return dive;
  }
  return {
    image,
    thumbnail,
    createDive,
    dispose: () => dives.forEach(({ runner }) => runner.dispose()),
  };
}

describe('automatic scan still handoff', () => {
  it.each(['poi', 'animal'] as const)(
    'projects the %s into the crop at both vertical frame edges',
    (kind) => {
      const fixture = automaticStillFixture();
      const dive = fixture.createDive();
      const { ctx, runner, f } = dive;
      const target = dive[kind];
      Object.assign(ctx, { life: { targets: [dive.animal] } });
      const camera = ctx.rig.camera;
      camera.fov = 90;
      camera.aspect = 0.5;
      camera.updateProjectionMatrix();
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -1);
      try {
        for (const [y, expected] of [
          [9, 0.05],
          [-9, 0.95],
          [0, 0.5],
        ]) {
          target.position.set(0, y, -10);
          ctx.bus.emit('scan:complete', {
            poiId: target.id,
            landmarkId: 'titanic',
            firstTime: true,
          });
          runner.frame(f);
          expect(fixture.thumbnail.mock.lastCall?.[4]).toBeCloseTo(expected);
          expect(ctx.photos.photos[0]?.poiId).toBe(target.id);
        }
      } finally {
        fixture.dispose();
      }
    },
  );

  it('keeps a discovery when its still is unavailable and captures a later subject', () => {
    const fixture = automaticStillFixture();
    const dive = fixture.createDive();
    fixture.thumbnail.mockReturnValueOnce(null);
    try {
      dive.complete(dive.poi);
      expect(dive.discoveries.isDiscovered('titanic', dive.poi.id)).toBe(true);
      expect(dive.ctx.photos.photos).toEqual([]);
      expect(dive.ctx.journal.refresh).not.toHaveBeenCalled();
      dive.complete(dive.animal);
      expect(dive.ctx.photos.photos[0]?.poiId).toBe(dive.animal.id);
      expect(dive.ctx.journal.refresh).toHaveBeenCalledOnce();
    } finally {
      fixture.dispose();
    }
  });

  it.each(['poi', 'animal'] as const)(
    'files one quiet %s still at capture with real completion metadata and repeat semantics',
    (kind) => {
      const fixture = automaticStillFixture();
      const dive = fixture.createDive();
      const { ctx, runner, f, completed, storage, scanner, discoveries } = dive;
      const target = dive[kind];
      try {
        expect(runner.order).toEqual([
          'gate.photo: photo',
          'camera.photo: photo',
          'scan.discovery: scan-driver',
          'render.capture: photo',
        ]);
        // The discovery event is synchronous; photo persistence belongs to the later hook.
        ctx.bus.on('scan:complete', () => {
          expect(storage.setItem).not.toHaveBeenCalled();
          expect(ctx.photos.photos).toEqual([]);
          expect(ctx.journal.refresh).not.toHaveBeenCalled();
        });
        dive.complete(target);
        expect(completed.mock.calls).toEqual([
          [{ poiId: target.id, landmarkId: 'titanic', firstTime: true }],
        ]);
        expect(fixture.thumbnail).toHaveBeenCalledExactlyOnceWith(
          ctx.renderer.domElement,
          undefined,
          undefined,
          'stock',
          expect.any(Number), // where the subject sits, for the portrait crop
        );
        expect(ctx.photos.photos).toEqual([
          expect.objectContaining({
            image: fixture.image,
            siteId: 'titanic',
            siteName: 'RMS Titanic',
            poiId: target.id,
            poiName: target.name,
            depthM: 3789.7,
          }),
        ]);
        expect(storage.setItem).toHaveBeenCalledTimes(1);
        expect(storage.setItem.mock.calls[0][0]).toBe(PHOTO_STORAGE_KEY);
        expect(new PhotoStore(storage).photos).toEqual(ctx.photos.photos);
        expect(ctx.journal.refresh).toHaveBeenCalledTimes(1);
        expect(dive.shutter).not.toHaveBeenCalled();
        expect(dive.toast).not.toHaveBeenCalled();
        expect(ctx.audio.playShutter).not.toHaveBeenCalled();

        // Same-dive completions are suppressed; a later dive emits firstTime:false.
        dive.complete(target);
        expect(completed).toHaveBeenCalledTimes(1);
        scanner.resetDive();
        completed.mockClear();
        // The first completion's pending still was already consumed.
        ctx.bus.clear();
        // Keep the real photo listener: use a new observer instead of clearing the bus.
        runner.frame(f);
        expect(discoveries.isDiscovered('titanic', target.id)).toBe(true);
        expect(fixture.thumbnail).toHaveBeenCalledTimes(1);
      } finally {
        fixture.dispose();
      }
    },
  );
});
