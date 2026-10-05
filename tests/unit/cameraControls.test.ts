import { afterEach, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { makeConfig } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Vector3 } from 'three';
import { FIRST_MINUTE_GUIDANCE } from '../../src/core/Config.js';

const key = 'subexplorer.controlsLearned.v1';
const records = new Map<string, string>();
function setup(route: boolean, rig?: CameraRig) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => records.get(k) ?? null,
    setItem: (k: string, value: string) => records.set(k, value),
  });
  const offReset = vi.fn();
  const tipStrip = {
    style: { setProperty: vi.fn() },
    classList: { remove: vi.fn(), toggle: vi.fn() },
  };
  const ctx = {
    bus: new EventBus(),
    rig: rig ?? { resetView: vi.fn() },
    hud: { root: { querySelector: () => tipStrip }, onResetCamera: vi.fn(() => offReset) },
    sub: { position: new Vector3(0, -100, 0), yaw: 0 },
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
  return { ctx, offReset, tipStrip };
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
  vi.restoreAllMocks();
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
  expect(ctx.cameraTips.until).toBeGreaterThan(0);
  expect(JSON.parse(records.get(key)!).learned).toBe(true);
  cameraControlsSystem.dispose?.();
  cameraControlsSystem.init?.(ctx);
  tick(ctx, false);
  expect(ctx.cameraTips.until).toBe(0);
});

it('starts a twelve-second deadline, fades after actual movement, and keeps learning', () => {
  let now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const { ctx, tipStrip } = setup(false);
  tick(ctx, false);
  expect(ctx.cameraTips.until).toBe(now + 12_000);
  tick(ctx, true, { throttle: 1, yaw: 1, ballast: 1 });
  expect(ctx.cameraTips.moved).toBe(false);
  tick(ctx, false, { throttle: 1, yaw: 0, ballast: 0 });
  expect(ctx.cameraTips.moved).toBe(false);
  ctx.sub.position.z = -0.6;
  now += 100;
  tick(ctx, false);
  expect(ctx.cameraTips.moved).toBe(true);
  expect(ctx.cameraTips.until).toBe(now + FIRST_MINUTE_GUIDANCE.fadeMs);
  expect(tipStrip.classList.toggle).toHaveBeenLastCalledWith('is-guidance-fading', true);
  expect(JSON.parse(records.get(key)!).learned).toBe(false);
  now += 1000;
  tick(ctx, false, { throttle: 0, yaw: 1, ballast: 1 });
  expect(JSON.parse(records.get(key)!).learned).toBe(true);
  ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
  expect(ctx.cameraTips.moved).toBe(false);
  expect(ctx.cameraTips.until).toBe(0);
});

it('does not extend a deadline that elapsed before movement', () => {
  let now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const { ctx } = setup(false);
  tick(ctx, false);
  const deadline = ctx.cameraTips.until;
  now += 13_000;
  tick(ctx, false, { throttle: 1, yaw: 0, ballast: 0 });
  ctx.sub.position.z -= 1;
  tick(ctx, false);
  expect(ctx.cameraTips.until).toBe(deadline);
  expect(ctx.cameraTips.moved).toBe(true);
});

it('reset controls restore the Lost City opening and leave an active photo orbit alone', () => {
  const rig = new CameraRig(makeConfig().camera, 16 / 9);
  rig.setChaseRadiusDefault(50);
  const { ctx } = setup(false, rig);
  ctx.app.state = 'dive';
  ctx.settingsScreen = { isOpen: false } as GameContext['settingsScreen'];
  ctx.globe = { isOpen: false } as GameContext['globe'];
  const reset = vi.mocked(ctx.hud.onResetCamera).mock.calls[0]![0];
  const resetFrame = { frozen: false, sampled: {}, state: { resetCamera: true } } as FrameState;
  for (const action of [
    () => cameraControlsSystem.frame!['controls.camera']!(resetFrame, ctx),
    () => reset(),
    () => ctx.canvas.dispatchEvent(new Event('dblclick')),
  ]) {
    rig.chaseRadius = 180;
    rig.freeLook = true;
    action();
    expect(rig.chaseRadius).toBe(50);
    expect(rig.freeLook).toBe(false);
  }
  ctx.photoMode = { active: true } as GameContext['photoMode'];
  rig.setMode('orbit');
  ctx.canvas.dispatchEvent(new Event('dblclick'));
  expect(rig.mode).toBe('orbit');
  reset();
  expect(rig.mode).toBe('orbit');
});
