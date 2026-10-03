import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { createTitleSystem, titleLayout, titleTier } from '../../src/app/systems/title.js';
import * as terrain from '../../src/render/title/TitleTerrain.js';

type Handler = (e: { state: string }) => void;

function fakeRenderer() {
  return {
    info: { render: { calls: 12, triangles: 60_000 } },
    render: vi.fn(),
    clear: vi.fn(),
    setRenderTarget: vi.fn(),
    setClearColor: vi.fn(),
    getClearColor: (c: THREE.Color) => c,
    getClearAlpha: () => 1,
    getViewport: (t: THREE.Vector4) => t.set(0, 0, 1280, 720),
    getScissor: (t: THREE.Vector4) => t.set(0, 0, 1280, 720),
    getScissorTest: () => false,
    setViewport: vi.fn(),
    setScissor: vi.fn(),
    setScissorTest: vi.fn(),
  };
}

function setup(over: { load?: () => Promise<unknown>; state?: string } = {}) {
  const handlers: Handler[] = [];
  const classes = new Set<string>();
  const caption = vi.fn();
  const ctx = {
    app: { state: over.state ?? 'home' },
    tier: 'low',
    meta: { id: 'other' },
    tile: {},
    loader: { load: over.load ?? (() => Promise.reject(new Error('blocked'))) },
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
  vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 720 });
  vi.stubGlobal('document', { hidden: false });
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

    ctx.home.sitesOpen = true;
    const sites = draw();
    for (let i = 0; i < 5; i++) draw();
    expect(draw()).toBe(sites);
    expect(r.clear).toHaveBeenCalledTimes(1); // navy once, not every frame
    ctx.home.sitesOpen = false;
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
});
