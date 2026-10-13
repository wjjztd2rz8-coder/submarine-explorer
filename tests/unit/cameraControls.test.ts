import { afterEach, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import type { GameContext } from '../../src/app/context.js';
import type { FrameState } from '../../src/app/System.js';
import { makeConfig } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Vector3 } from 'three';

function setup(route: boolean, rig?: CameraRig) {
  const offReset = vi.fn();
  const ctx = {
    bus: new EventBus(),
    rig: rig ?? { resetView: vi.fn() },
    hud: { onResetCamera: vi.fn(() => offReset) },
    sub: { position: new Vector3(0, -100, 0), yaw: 0 },
    canvas: new EventTarget(),
    app: { state: 'home' },
    route: route ? {} : null,
    input: { wheelDelta: 0 },
    photoMode: { active: false },
    keyboard: { unlock: vi.fn() },
    expose: vi.fn(),
  } as unknown as GameContext;
  cameraControlsSystem.init?.(ctx);
  expect(ctx.expose).toHaveBeenCalledWith({ cameraTips: ctx.cameraTips });
  return { ctx, offReset };
}
function tick(ctx: GameContext, frozen: boolean, sampled = { throttle: 0, yaw: 0, ballast: 0 }) {
  cameraControlsSystem.frame!['controls.camera']!(
    { frozen, sampled, state: {} } as FrameState,
    ctx,
  );
}
afterEach(() => {
  cameraControlsSystem.dispose?.();
  vi.restoreAllMocks();
});
it('detects the first real move after the dive starts and re-arms on the next mission', () => {
  const { ctx } = setup(false);
  tick(ctx, false);
  tick(ctx, true, { throttle: 1, yaw: 1, ballast: 1 });
  expect(ctx.cameraTips.moved).toBe(false);
  tick(ctx, false, { throttle: 1, yaw: 0, ballast: 0 });
  expect(ctx.cameraTips.moved).toBe(false);
  ctx.sub.position.z = -0.6;
  tick(ctx, false);
  expect(ctx.cameraTips.moved).toBe(true);
  ctx.bus.emit('mission:started', { missionId: 'titanic', tileId: 'titanic' });
  expect(ctx.cameraTips.moved).toBe(false);
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
