/**
 * Camera: the chase / first-person / orbit rig, and the camera
 * controls (view toggle, reset, double-click reset, mouse look and wheel zoom).
 * The rig is built early (the discovery teleport snaps it); the
 * controls come after the input system.
 */

import { CameraRig } from '../../sub/CameraRig.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';
import { FirstMove } from '../../game/FirstMove.js';

const cleanup = new Disposables();

let noteControlUse: (s: { throttle: number; yaw: number; ballast: number }) => void = () => {};

export const cameraSystem: GameSystem = {
  name: 'camera',
  init(ctx) {
    const { terrain, sub } = ctx;
    // The rig samples the terrain so the camera never clips below the seabed.
    const rig = new CameraRig(
      ctx.effective.camera,
      window.innerWidth / window.innerHeight,
      terrain,
    );
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
    const tips = { moved: false };
    ctx.cameraTips = tips;
    ctx.expose({ cameraTips: tips });
    let started = false;
    const firstMove = new FirstMove();
    const pose = () => ({ ...ctx.sub.position, yaw: ctx.sub.yaw });
    const startTips = (): void => {
      started = true;
      firstMove.reset(pose());
      tips.moved = false;
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
      if (!tips.moved && firstMove.update(pose(), s)) tips.moved = true;
    };
    cleanup.add(() => {
      noteControlUse = () => {};
    });
    cleanup.add(
      hud.onResetCamera(() => {
        if (ctx.app.state === 'dive' && !ctx.photoMode.active) {
          rig.resetView();
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
      }
    });
  },
  frame: {
    'controls.camera': (f, ctx) => {
      const { rig, input } = ctx;
      const { frozen, state, sampled } = f;
      if (!frozen) noteControlUse(sampled);
      if (!frozen && state.toggleCamera) {
        rig.toggleMode();
      }
      if (!frozen && state.resetCamera) {
        rig.resetView();
      }
      // D-INPUT-HUD: drag to look, wheel to zoom (also while framing a photo).
      if (!frozen || ctx.photoMode.active) {
        if (sampled.lookDx || sampled.lookDy) {
          rig.orbit(-sampled.lookDx * 0.004, sampled.lookDy * 0.004);
        }
        if (input.wheelDelta) {
          rig.orbit(0, 0, input.wheelDelta * 0.001);
        }
      } else ctx.keyboard.unlock();
    },
  },
};
