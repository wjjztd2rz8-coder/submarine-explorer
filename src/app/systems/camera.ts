/**
 * Camera: the chase / first-person / orbit rig (A3), and the D2-CAMERA
 * controls (view toggle, reset, double-click reset, mouse look and wheel zoom).
 * The rig is built early (the discovery teleport and the ROV snap it); the
 * controls come after the input system.
 */

import { CameraRig } from '../../sub/CameraRig.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';
import { FIRST_MINUTE_GUIDANCE } from '../../core/Config.js';
import { FirstMove } from '../../game/FirstMove.js';

const cleanup = new Disposables();

/** F-HUD-LAYOUT: the controls hint bar is for the first dives only. */
const LEARN_KEY = 'subexplorer.controlsLearned.v1';
const TIPS_DIVES = 3;
interface LearnRecord {
  dives: number;
  learned: boolean;
}
let noteControlUse: (s: { throttle: number; yaw: number; ballast: number }) => void = () => {};
function readLearn(): LearnRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(LEARN_KEY) ?? '{}') as Partial<LearnRecord>;
    return { dives: Number(raw.dives) || 0, learned: raw.learned === true };
  } catch {
    return { dives: 0, learned: false };
  }
}
function writeLearn(record: LearnRecord): void {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(record));
  } catch {
    // Private mode: the bar simply falls back to its opening timer.
  }
}

export const cameraSystem: GameSystem = {
  name: 'camera',
  init(ctx) {
    const { config, terrain, sub } = ctx;
    // A3: the rig samples the terrain so the camera never clips below the seabed.
    const rig = new CameraRig(config.camera, window.innerWidth / window.innerHeight, terrain);
    rig.snap(sub.position, sub.yaw, sub.pitch);
    ctx.rig = rig;
    ctx.expose({ rig });
  },
  frame: {
    'camera.rig': (f, ctx) => {
      ctx.rig.update(f.pilotPosition, f.pilotYaw, f.pilotPitch, f.dt, {
        roll: ctx.sub.roll,
        velocity: f.pilotVelocity,
      });
    },
  },
};

export const cameraControlsSystem: GameSystem = {
  name: 'cameraControls',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { bus, rig, hud, canvas } = ctx;
    const tips = { until: 0, moved: false };
    ctx.cameraTips = tips;
    ctx.expose({ cameraTips: tips });
    let learn = readLearn();
    let started = false;
    const firstMove = new FirstMove();
    const pose = () => ({ ...ctx.sub.position, yaw: ctx.sub.yaw });
    const tipStrip = hud.root.querySelector<HTMLElement>('.hud-control-tips');
    tipStrip?.style.setProperty('--guidance-fade-ms', `${FIRST_MINUTE_GUIDANCE.fadeMs}ms`);
    // Steering used once each: move, turn and rise/sink.
    const used = { throttle: false, yaw: false, ballast: false };
    const startTips = (): void => {
      started = true;
      firstMove.reset(pose());
      tips.moved = false;
      tipStrip?.classList.remove('is-guidance-fading');
      used.throttle = used.yaw = used.ballast = false;
      learn = readLearn();
      learn.dives += 1;
      writeLearn(learn);
      tips.until =
        learn.learned || learn.dives > TIPS_DIVES
          ? 0
          : performance.now() + FIRST_MINUTE_GUIDANCE.lifetimeMs;
    };
    cleanup.add(
      bus.on('mission:started', () => {
        rig.resetView();
        startTips();
      }),
    );
    noteControlUse = (s) => {
      // Home and briefing frames are frozen. Free dives have no mission:started event.
      if (!started) startTips();
      if (!tips.moved && firstMove.update(pose(), s)) {
        tips.moved = true;
        tips.until = Math.min(tips.until, performance.now() + FIRST_MINUTE_GUIDANCE.fadeMs);
      }
      if (Math.abs(s.throttle) > 0.2) used.throttle = true;
      if (Math.abs(s.yaw) > 0.2) used.yaw = true;
      if (Math.abs(s.ballast) > 0.2) used.ballast = true;
      if (!learn.learned && used.throttle && used.yaw && used.ballast) {
        learn.learned = true;
        writeLearn(learn);
      }
    };
    cleanup.add(() => {
      noteControlUse = () => {};
    });
    cleanup.add(
      hud.onResetCamera(() => {
        if (ctx.app.state === 'dive' && !ctx.photoMode.active) {
          rig.resetView();
          tips.until = 0;
        }
      }),
    );
    cleanup.listen(canvas, 'dblclick', () => {
      if (
        ctx.app.state === 'dive' &&
        !ctx.photoMode.active &&
        !ctx.settingsScreen.isOpen &&
        !ctx.globe.isOpen &&
        !(ctx.missionRouter?.frozen ?? false)
      ) {
        rig.resetView();
        tips.until = 0;
      }
    });
  },
  frame: {
    'controls.camera': (f, ctx) => {
      const { rig, rov, input, cameraTips } = ctx;
      const { frozen, state, sampled } = f;
      if (!frozen) noteControlUse(sampled);
      const tipStrip = ctx.hud.root.querySelector('.hud-control-tips');
      tipStrip?.classList.toggle(
        'is-guidance-fading',
        cameraTips.until > 0 &&
          performance.now() >= cameraTips.until - FIRST_MINUTE_GUIDANCE.fadeMs,
      );
      if (!frozen && !rov.deployed && state.toggleCamera) {
        rig.toggleMode();
        cameraTips.until = 0;
      }
      if (!frozen && !rov.deployed && state.resetCamera) {
        rig.resetView();
        cameraTips.until = 0;
      }
      // D-INPUT-HUD: drag to look, wheel to zoom (also while framing a photo).
      if (!frozen || ctx.photoMode.active) {
        if (sampled.lookDx || sampled.lookDy) {
          rig.orbit(-sampled.lookDx * 0.004, sampled.lookDy * 0.004);
          cameraTips.until = 0;
        }
        if (input.wheelDelta) {
          rig.orbit(0, 0, input.wheelDelta * 0.001);
          cameraTips.until = 0;
        }
      } else ctx.keyboard.unlock();
    },
  },
};
