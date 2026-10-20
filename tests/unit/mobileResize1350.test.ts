import { afterEach, expect, it, vi } from 'vitest';
import type { GameContext } from '../../src/app/context.js';
import { renderSystem } from '../../src/app/systems/render.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';

let ctx: GameContext;
afterEach(() => {
  renderSystem.dispose?.();
  vi.unstubAllGlobals();
});

function fixture(tier: GameContext['tier'] = 'low') {
  const win = Object.assign(new EventTarget(), { innerWidth: 390, innerHeight: 844 });
  const setProperty = vi.fn();
  let touch = true;
  let onClassChange = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', {
    documentElement: {
      classList: { contains: () => touch },
      style: { setProperty },
    },
  });
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        onClassChange = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  const renderer = {
    setSize: vi.fn(),
    getPixelRatio: () => 2,
    toneMappingExposure: 1,
  };
  const rig = new CameraRig(DEFAULT_CONFIG.camera, 390 / 844);
  ctx = {
    renderer,
    rig,
    config: DEFAULT_CONFIG,
    tier,
    save: { get: () => ({ uiScale: 150 }) },
  } as unknown as GameContext;
  renderSystem.init?.(ctx);
  return {
    win,
    renderer,
    rig,
    setProperty,
    disconnect,
    setTouch(on: boolean) {
      touch = on;
      onClassChange();
    },
  };
}

it.each(['resize', 'orientationchange'])(
  '%s updates the Low touch camera, drawing size and HUD through both rotations',
  (event) => {
    const f = fixture();
    const portraitFov = f.rig.camera.fov;
    for (const [w, h] of [
      [844, 390],
      [390, 844],
    ]) {
      f.win.innerWidth = w;
      f.win.innerHeight = h;
      f.win.dispatchEvent(new Event(event));
      expect(f.renderer.setSize).toHaveBeenLastCalledWith(w, h, false);
      expect(f.rig.camera.aspect).toBeCloseTo(w / h);
      expect(f.rig.camera.view?.enabled ?? false).toBe(w > h);
      expect(f.rig.camera.fov).toBeCloseTo(w > h ? DEFAULT_CONFIG.camera.fovDeg : portraitFov);
      expect(ctx.post.target.width).toBe(w * 2);
      expect(ctx.post.target.height).toBe(h * 2);
      expect(f.setProperty).toHaveBeenCalledWith('--ui-user-scale', '1.5');
    }
    const calls = f.renderer.setSize.mock.calls.length;
    renderSystem.dispose?.();
    f.win.dispatchEvent(new Event(event));
    expect(f.renderer.setSize).toHaveBeenCalledTimes(calls);
    expect(f.disconnect).toHaveBeenCalledExactlyOnceWith();
  },
);

it('keeps the landscape projection aligned when touch mode changes without a resize', () => {
  const f = fixture();
  f.win.innerWidth = 844;
  f.win.innerHeight = 390;
  f.win.dispatchEvent(new Event('resize'));
  expect(f.rig.camera.view?.enabled).toBe(true);
  f.setTouch(false);
  expect(f.rig.camera.view?.enabled).toBe(false);
  f.setTouch(true);
  expect(f.rig.camera.view?.enabled).toBe(true);
  // Dynamic resolution reuses the same resize callback.
  f.renderer.getPixelRatio = () => 0.75;
  ctx.resize();
  expect(ctx.post.target.width).toBe(633);
  expect(ctx.post.target.height).toBe(293);
  expect(f.rig.camera.aspect).toBeCloseTo(844 / 390);
  expect(f.rig.camera.view?.enabled).toBe(true);
});

// The render system owns this pass even on Low, where the draw path skips it.
it.each(['low', 'high'] as const)('%s: teardown releases the post pass once', (tier) => {
  fixture(tier);
  const target = vi.spyOn(ctx.post.target, 'dispose');
  const depth = vi.spyOn(ctx.post.target.depthTexture!, 'dispose');
  const material = vi.spyOn(ctx.post.material, 'dispose');
  renderSystem.dispose?.();
  renderSystem.dispose?.();
  expect(target).toHaveBeenCalledOnce();
  expect(depth).toHaveBeenCalledOnce();
  expect(material).toHaveBeenCalledOnce();
});
