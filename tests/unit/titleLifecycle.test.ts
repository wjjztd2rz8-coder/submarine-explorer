import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createTitleSystem, titleLayout, titleTier } from '../../src/app/systems/title.js';
import * as terrain from '../../src/render/title/TitleTerrain.js';
import { TitleScene } from '../../src/render/title/TitleScene.js';
import { renderSystem } from '../../src/app/systems/render.js';

type Handler = (e: { state: string }) => void;

function fakeRenderer() {
  let target: unknown = null;
  const viewport = new THREE.Vector4(0, 0, 1280, 720);
  const scissor = viewport.clone();
  const currentViewport = viewport.clone();
  let scissorTest = false;
  const color = new THREE.Color(0x123456);
  let alpha = 0.5;
  return {
    toneMappingExposure: 1,
    info: { render: { calls: 12, triangles: 60_000 } },
    render: vi.fn((_scene: THREE.Scene, _camera: THREE.Camera) => {}),
    clear: vi.fn(),
    getPixelRatio: vi.fn(() => 1),
    getRenderTarget: vi.fn(() => target),
    setRenderTarget: vi.fn((next: unknown) => {
      target = next;
      currentViewport.copy(next instanceof THREE.WebGLRenderTarget ? next.viewport : viewport);
    }),
    setClearColor: vi.fn((next: THREE.Color, a: number) => {
      color.copy(next);
      alpha = a;
    }),
    getClearColor: (c: THREE.Color) => c.copy(color),
    getClearAlpha: () => alpha,
    getViewport: (v: THREE.Vector4) => v.copy(viewport),
    getCurrentViewport: (v: THREE.Vector4) => v.copy(currentViewport),
    getScissor: (v: THREE.Vector4) => v.copy(scissor),
    getScissorTest: () => scissorTest,
    setViewport: vi.fn((x: number, y: number, w: number, h: number) => {
      viewport.set(x, y, w, h);
      currentViewport.copy(viewport);
    }),
    setScissor: vi.fn((x: number, y: number, w: number, h: number) => scissor.set(x, y, w, h)),
    setScissorTest: vi.fn((value: boolean) => {
      scissorTest = value;
    }),
  };
}

function setup(over: { load?: () => Promise<unknown>; state?: string } = {}) {
  const handlers: Handler[] = [];
  const classes = new Set<string>();
  const caption = vi.fn();
  const ctx = {
    app: { state: over.state ?? 'home' },
    tier: 'low',
    renderer: fakeRenderer(),
    meta: { id: 'other' },
    tile: {},
    loader: { load: vi.fn(over.load ?? (() => Promise.reject(new Error('blocked')))) },
    rig: { reduceMotion: false },
    bus: {
      on: (name: string, h: Handler) => {
        if (name === 'app:state') handlers.push(h);
        return () => handlers.splice(handlers.indexOf(h), 1);
      },
    },
    home: {
      isOpen: true,
      sitesOpen: false,
      root: {
        classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
      },
      setSceneCaption: caption,
      sizeGlobeTargets: vi.fn(),
    },
    settingsScreen: { isOpen: false },
    discovery: { guide: { isOpen: false } },
    globe: { isOpen: false },
    upgrades: { isOpen: false },
    controlsCard: { isOpen: false },
    expose: vi.fn(),
  } as unknown as GameContext & Record<string, any>;
  const system = createTitleSystem();
  system.init!(ctx);
  const frame = (): void => system.frame!['render.prepare']!({ dt: 1 / 30 } as FrameState, ctx);
  return { ctx, system, frame, classes, caption, handlers };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', Object.assign(new EventTarget(), { innerWidth: 1280, innerHeight: 720 }));
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('title layout helpers', () => {
  it('maps layouts and tiers', () => {
    expect(titleLayout(1920, 1080)).toBe('desktop');
    expect(titleLayout(390, 844)).toBe('portrait');
    expect(titleLayout(844, 390)).toBe('short-landscape');
    expect(titleLayout(1280, 500)).toBe('short-landscape');
    expect(titleTier('low')).toBe('low');
    expect(titleTier('ultra')).toBe('high');
  });
});

describe('title lifecycle', () => {
  it('draws while home is active and stops when hidden, modal or sites', () => {
    const { ctx, frame } = setup();
    const r = fakeRenderer();
    const draw = (): number => {
      frame();
      ctx.titleScene.present(r as never);
      return ctx.titleScene.drawCount;
    };
    expect(ctx.home.root).toBeDefined();
    expect(draw()).toBe(1);
    expect(ctx.titleScene.active).toBe(true);
    const before = ctx.titleScene.drawCount;

    (document as { hidden: boolean }).hidden = true;
    for (let i = 0; i < 5; i++) draw();
    expect(ctx.titleScene.active).toBe(false);
    expect(ctx.titleScene.drawCount).toBe(before);
    (document as { hidden: boolean }).hidden = false;
    expect(draw()).toBeGreaterThan(before);

    (ctx.settingsScreen as { isOpen: boolean }).isOpen = true;
    const modal = draw();
    for (let i = 0; i < 5; i++) draw();
    expect(draw()).toBe(modal);
    (ctx.settingsScreen as { isOpen: boolean }).isOpen = false;
    expect(draw()).toBeGreaterThan(modal);

    r.clear.mockClear();
    (ctx.home as { sitesOpen: boolean }).sitesOpen = true;
    const sites = draw();
    for (let i = 0; i < 5; i++) draw();
    expect(draw()).toBe(sites);
    expect(r.clear).toHaveBeenCalledTimes(1); // navy once, not every frame
    (ctx.home as { sitesOpen: boolean }).sitesOpen = false;
    expect(draw()).toBeGreaterThan(sites);
  });

  it('does not claim the canvas in a dive and never builds a scene there', () => {
    const { ctx, frame } = setup({ state: 'dive' });
    frame();
    expect(ctx.titleScene.ownsCanvas).toBe(false);
    expect(ctx.titleScene.active).toBe(false);
  });

  it('builds lazily on the first home entry', () => {
    const { ctx, handlers, classes } = setup({ state: 'dive' });
    expect(classes.has('has-title-scene')).toBe(false);
    ctx.app.state = 'home';
    handlers[0]!({ state: 'home' });
    expect(classes.has('has-title-scene')).toBe(true);
  });

  it('fails soft when the Monterey fetch is blocked', async () => {
    const { ctx, frame, caption } = setup();
    await vi.runAllTimersAsync();
    frame();
    expect(ctx.titleScene.terrainReady).toBe(false);
    expect(caption).not.toHaveBeenCalled();
    ctx.titleScene.present(fakeRenderer() as never);
    expect(ctx.titleScene.drawCount).toBe(1);
  });

  it('sets the terrain caption once the crop is ready and disposes a late crop', async () => {
    const crop = {
      mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()),
      anchorFloorY: 0,
      halfSize: 1200,
      sampleFloor: () => 0,
      dispose: vi.fn(),
    };
    vi.spyOn(terrain, 'loadTitleCrop').mockResolvedValue(crop);
    const a = setup();
    await vi.runAllTimersAsync();
    expect(a.caption).toHaveBeenCalledWith(true);
    expect(a.ctx.titleScene.terrainReady).toBe(true);
    a.system.dispose!();
    expect(crop.dispose).toHaveBeenCalled();

    // Completion after teardown is ignored and the crop is released.
    const late = { ...crop, dispose: vi.fn() };
    let resolve!: (c: typeof late) => void;
    vi.spyOn(terrain, 'loadTitleCrop').mockReturnValue(new Promise((r) => (resolve = r)));
    const b = setup();
    await vi.runAllTimersAsync();
    b.system.dispose!();
    resolve(late);
    await vi.runAllTimersAsync();
    expect(late.dispose).toHaveBeenCalled();
    expect(b.caption).not.toHaveBeenCalled();
    expect(b.classes.has('has-title-scene')).toBe(false);
  });

  it('respects reduced motion immediately', () => {
    const { ctx, frame } = setup();
    frame();
    expect(ctx.titleScene.animated).toBe(true);
    ctx.rig.reduceMotion = true;
    frame();
    expect(ctx.titleScene.animated).toBe(false);
  });
  it('cancels the deferred tile fetch and removes listeners before teardown', async () => {
    const windowOff = vi.spyOn(window, 'removeEventListener');
    const documentOff = vi.spyOn(document, 'removeEventListener');
    const { ctx, system, handlers } = setup();
    system.dispose!();
    system.dispose!();
    await vi.runAllTimersAsync();
    expect(ctx.loader.load).not.toHaveBeenCalled();
    expect(handlers).toHaveLength(0);
    expect(windowOff).toHaveBeenCalledTimes(1);
    expect(documentOff).toHaveBeenCalledTimes(1);
    expect(ctx.titleScene.ownsCanvas).toBe(false);
  });

  it('resumes after visibility events even when no frames ran while hidden', () => {
    const { ctx, frame, system } = setup();
    const r = fakeRenderer();
    ctx.rig.reduceMotion = true;
    frame();
    ctx.titleScene.present(r as never);
    const before = ctx.titleScene.drawCount;
    (document as { hidden: boolean }).hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(ctx.titleScene.active).toBe(false);
    (document as { hidden: boolean }).hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    frame();
    ctx.titleScene.present(r as never);
    expect(ctx.titleScene.drawCount).toBe(before + 1);
    system.dispose!();
  });

  it('keeps static home idle and redraws on same-size resize and pixel-ratio changes', () => {
    const { ctx, frame, system } = setup();
    const r = fakeRenderer();
    ctx.rig.reduceMotion = true;
    const draw = () => {
      frame();
      ctx.titleScene.present(r as never);
    };
    draw();
    r.getRenderTarget.mockClear();
    r.setRenderTarget.mockClear();
    for (let i = 0; i < 120; i++) draw();
    expect(r.getRenderTarget).not.toHaveBeenCalled();
    expect(r.setRenderTarget).not.toHaveBeenCalled();
    expect(ctx.titleScene.drawCount).toBe(1);
    window.dispatchEvent(new Event('resize'));
    draw();
    expect(ctx.titleScene.drawCount).toBe(2);
    vi.mocked(ctx.renderer.getPixelRatio).mockReturnValue(0.75);
    draw();
    draw();
    expect(ctx.titleScene.drawCount).toBe(3);
    ctx.rig.reduceMotion = false;
    for (let i = 0; i < 10; i++) draw();
    expect(ctx.titleScene.drawCount).toBeGreaterThan(3);
    system.dispose!();
  });

  it('reuses one scene across repeated dive/home entries and modal closures', async () => {
    const resize = vi.spyOn(TitleScene.prototype, 'resize');
    const dispose = vi.spyOn(TitleScene.prototype, 'dispose');
    const { ctx, frame, handlers, system } = setup();
    const r = fakeRenderer();
    frame();
    ctx.titleScene.present(r as never);
    const initialListeners = handlers.length;
    for (let i = 0; i < 5; i++) {
      const before = ctx.titleScene.drawCount;
      ctx.app.state = 'dive';
      frame();
      ctx.titleScene.present(r as never);
      expect(ctx.titleScene.ownsCanvas).toBe(false);
      expect(ctx.titleScene.drawCount).toBe(before);
      ctx.app.state = 'home';
      handlers[0]!({ state: 'home' });
      frame();
      ctx.titleScene.present(r as never);
      expect(ctx.titleScene.drawCount).toBe(before + 1);
      for (const modal of [
        ctx.settingsScreen,
        ctx.discovery.guide,
        ctx.upgrades,
        ctx.controlsCard,
      ]) {
        (modal as { isOpen: boolean }).isOpen = true;
        frame();
        const paused = ctx.titleScene.drawCount;
        ctx.titleScene.present(r as never);
        expect(ctx.titleScene.drawCount).toBe(paused);
        (modal as { isOpen: boolean }).isOpen = false;
        frame();
        ctx.titleScene.present(r as never);
        expect(ctx.titleScene.drawCount).toBe(paused + 1);
      }
    }
    await vi.runAllTimersAsync();
    expect(ctx.loader.load).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
    expect(handlers).toHaveLength(initialListeners);
    expect(dispose).not.toHaveBeenCalled();
    system.dispose!();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'presents to the canvas and restores gameplay state (throw=%s)',
    (throws) => {
      const { ctx, frame, system, handlers } = setup({ state: 'dive' });
      const r = fakeRenderer();
      const target = new THREE.WebGLRenderTarget(32, 32);
      r.setRenderTarget(target);
      r.toneMappingExposure = 0.25;
      r.setViewport(3, 4, 500, 400);
      r.setScissor(5, 6, 300, 200);
      r.setScissorTest(true);
      r.clear.mockImplementation(() => {
        expect(r.getRenderTarget()).toBeNull();
        expect(r.getScissorTest()).toBe(false);
      });
      r.render.mockImplementation(() => {
        expect(r.getRenderTarget()).toBeNull();
        expect(r.toneMappingExposure).toBe(1);
        if (throws) throw new Error('draw failed');
      });
      ctx.app.state = 'home';
      handlers[0]!({ state: 'home' });
      frame();
      if (throws) expect(() => ctx.titleScene.present(r as never)).toThrow('draw failed');
      else ctx.titleScene.present(r as never);
      expect(r.getRenderTarget()).toBe(target);
      expect(r.getCurrentViewport(new THREE.Vector4()).toArray()).toEqual(
        target.viewport.toArray(),
      );
      expect(r.toneMappingExposure).toBe(0.25);
      expect(r.getClearColor(new THREE.Color()).getHex()).toBe(0x123456);
      expect(r.getClearAlpha()).toBe(0.5);
      expect(r.getViewport(new THREE.Vector4()).toArray()).toEqual([3, 4, 500, 400]);
      expect(r.getScissor(new THREE.Vector4()).toArray()).toEqual([5, 6, 300, 200]);
      expect(r.getScissorTest()).toBe(true);
      system.dispose!();
      target.dispose();
    },
  );
  it('closes the CSS-hidden selector globe and reopens it when visible', () => {
    const { ctx, frame, system } = setup();
    const rects = vi.fn(() => [] as unknown[]);
    (ctx.home as unknown as { globeSlot: unknown }).globeSlot = { getClientRects: rects } as never;
    ctx.homeGlobe = { open: vi.fn(), close: vi.fn() } as never;
    (ctx.home as { sitesOpen: boolean }).sitesOpen = true;
    frame();
    expect(ctx.homeGlobe.close).toHaveBeenCalledOnce();
    expect(ctx.homeGlobe.open).not.toHaveBeenCalled();
    rects.mockReturnValue([{}]);
    frame();
    expect(ctx.homeGlobe.open).toHaveBeenCalledWith('api');
    (document as { hidden: boolean }).hidden = true;
    frame();
    expect(ctx.homeGlobe.close).toHaveBeenCalledTimes(2);
    system.dispose!();
  });
  it('hands drawing back to gameplay on re-entry after quit-to-home', () => {
    const { ctx, frame, handlers, system } = setup({ state: 'dive' });
    const r = fakeRenderer();
    const gameplayScene = new THREE.Scene();
    Object.assign(ctx, {
      renderer: r,
      scene: gameplayScene,
      atmoTier: { post: false },
      renderStats: { calls: 0, triangles: 0 },
    });
    const draw = () => {
      frame();
      renderSystem.frame!['render.draw']!({ atmo: { gradeGain: 0.25 } } as FrameState, ctx);
    };
    draw();
    expect(r.render.mock.calls[0]![0]).toBe(gameplayScene);
    ctx.app.state = 'home';
    handlers[0]!({ state: 'home' });
    draw();
    expect(r.render.mock.calls.at(-1)![0]).not.toBe(gameplayScene);
    expect(ctx.titleScene.drawCount).toBe(1);
    expect(r.toneMappingExposure).toBe(0.25);
    ctx.app.state = 'dive';
    draw();
    expect(r.render.mock.calls.at(-1)![0]).toBe(gameplayScene);
    expect(ctx.titleScene.drawCount).toBe(1);
    system.dispose!();
  });
});
