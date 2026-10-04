import { afterEach, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';

const key = 'subexplorer.controlsLearned.v1';
const records = new Map<string, string>();
function setup(route: boolean) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => records.get(k) ?? null,
    setItem: (k: string, value: string) => records.set(k, value),
  });
  const offReset = vi.fn();
  const ctx = {
    bus: new EventBus(),
    rig: { resetView: vi.fn() },
    hud: { onResetCamera: vi.fn(() => offReset) },
    canvas: new EventTarget(),
    app: { state: 'home' },
    route: route ? {} : null,
    rov: { deployed: false },
    input: { wheelDelta: 0 },
    photoMode: { active: false },
    keyboard: { unlock: vi.fn() },
    expose: vi.fn(),
  } as unknown as GameContext;
  cameraControlsSystem.init?.(ctx);
  expect(ctx.expose).toHaveBeenCalledWith({ cameraTips: ctx.cameraTips });
  return { ctx, offReset };
}
function count() {
  return JSON.parse(records.get(key) ?? '{"dives":0}').dives;
}
function tick(ctx: GameContext, frozen: boolean, sampled = { throttle: 0, yaw: 0, ballast: 0 }) {
  cameraControlsSystem.frame!['controls.camera']!(
    { frozen, sampled, state: {} } as FrameState,
    ctx,
  );
}
afterEach(() => {
  cameraControlsSystem.dispose?.();
  records.clear();
  vi.unstubAllGlobals();
});
it('counts mission starts once and does not consume hints on Home or briefing', () => {
  const { ctx } = setup(true);
  tick(ctx, true);
  expect(count()).toBe(0);
  ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
  tick(ctx, false);
  expect(count()).toBe(1);
  ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
  expect(count()).toBe(2);
});
it('counts a free dive on first active frame, preserves three hint dives and disposes handlers', () => {
  const { ctx, offReset } = setup(false);
  tick(ctx, true);
  expect(count()).toBe(0);
  tick(ctx, false);
  tick(ctx, true);
  tick(ctx, false);
  expect(count()).toBe(1);
  expect(ctx.cameraTips.until).toBeGreaterThan(0);
  for (let dive = 2; dive <= 4; dive++) {
    cameraControlsSystem.dispose?.();
    cameraControlsSystem.init?.(ctx);
    tick(ctx, false);
    expect(count()).toBe(dive);
    expect(ctx.cameraTips.until > 0).toBe(dive <= 3);
  }
  cameraControlsSystem.dispose?.();
  expect(offReset).toHaveBeenCalledTimes(4);
  ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
  expect(count()).toBe(4);
});
it('hides learned controls across subsequent dives', () => {
  const { ctx } = setup(false);
  tick(ctx, false, { throttle: 1, yaw: 1, ballast: 1 });
  expect(ctx.cameraTips.until).toBe(0);
  cameraControlsSystem.dispose?.();
  cameraControlsSystem.init?.(ctx);
  tick(ctx, false);
  expect(ctx.cameraTips.until).toBe(0);
});
