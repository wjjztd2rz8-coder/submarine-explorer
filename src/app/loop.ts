/**
 * The frame loop (F0-CORE, from the old `main.ts` `frame()`).
 *
 *   - `Time.tick()` converts the real frame delta into N fixed 60 Hz steps.
 *   - Each step advances the piloted vehicle with the sampled input (the ROV
 *     system's `sim.vehicles` stage).
 *   - Rendering then happens once, using the real frame delta for camera
 *     smoothing and animation, so visuals are smooth at any refresh rate.
 *
 * Everything between sampling and `__gameReady` runs as system frame hooks in
 * `FRAME_STAGES` order (`app/System.ts`). `window.__gameReady` is set once the
 * first frame has been presented; the Playwright tests wait on it.
 */

import * as THREE from 'three';
import { Time } from '../core/Time.js';
import { FROZEN_INPUT } from '../game/MissionRouter.js';
import type { GameContext } from './context.js';
import type { FrameState, GameSystem, SystemRunner } from './System.js';

/**
 * `gate.input`: the input the sim sees and the fixed steps to run. While
 * anything freezes the game nothing simulates and input is ignored (sampling
 * still runs, so edge presses do not queue up behind a card).
 */
export const inputGateSystem: GameSystem = {
  name: 'inputGate',
  frame: {
    'gate.input': (f) => {
      f.state = f.frozen ? FROZEN_INPUT : f.sampled;
      f.steps = f.frozen ? 0 : f.realSteps;
      // fix S (QA-B #10): mission clock and DIVE TIME count real seconds of
      // unfrozen play, not capped physics time.
      f.clockDt = f.frozen ? 0 : f.dt;
    },
  },
};

/** A frame state with neutral values; each frame overwrites what it uses. */
export function makeFrameState(ctx: GameContext): FrameState {
  const sampled = ctx.input.state;
  return {
    nowMs: 0,
    dt: 0,
    fixedDt: 0,
    elapsed: 0,
    sampled,
    realSteps: 0,
    shellFrozen: false,
    blocked: false,
    frozen: false,
    state: sampled,
    steps: 0,
    clockDt: 0,
    sub: ctx.sub.getState(),
    forward: new THREE.Vector3(),
    pilotPosition: ctx.sub.position,
    pilotForward: new THREE.Vector3(),
    pilotYaw: 0,
    pilotPitch: 0,
    pilotVelocity: ctx.sub.velocity,
    atmo: undefined as unknown as FrameState['atmo'],
    fog: { color: new THREE.Color(), density: 0 },
    nextScanObjective: undefined,
    debugLogDue: false,
  };
}

/** Start the requestAnimationFrame loop. */
export function startLoop(ctx: GameContext, runner: SystemRunner): void {
  const time = new Time(ctx.config.physicsHz);
  const f = makeFrameState(ctx);
  let ready = false;
  let lastTerrainLog = 0;

  function frame(nowMs: number): void {
    requestAnimationFrame(frame);

    f.nowMs = nowMs;
    f.sampled = ctx.input.sample();
    f.realSteps = time.tick(nowMs);
    f.dt = time.frameDelta;
    f.fixedDt = time.fixedDelta;
    f.elapsed = time.elapsed;
    f.shellFrozen = false;
    f.blocked = false;
    f.frozen = false;
    f.debugLogDue = ctx.debugTerrain && nowMs - lastTerrainLog > 1000;

    runner.frame(f);

    if (f.debugLogDue) lastTerrainLog = nowMs;
    if (!ready) {
      ready = true;
      window.__gameReady = true;
      ctx.bus.emit('game:ready', { tileId: ctx.meta.id });
      console.info(`[main] ready: ${ctx.meta.id}`);
    }
  }

  requestAnimationFrame(frame);
}
