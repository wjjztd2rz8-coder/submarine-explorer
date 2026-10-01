/**
 * Camera: the chase / first-person / orbit rig (A3), and the D2-CAMERA
 * controls (view toggle, reset, double-click reset, mouse look and wheel zoom).
 * The rig is built early (the discovery teleport and the ROV snap it); the
 * controls come after the input system.
 */

import { CameraRig } from '../../sub/CameraRig.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

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
    const tips = { until: performance.now() + 20_000 };
    ctx.cameraTips = tips;
    cleanup.add(
      bus.on('mission:started', () => {
        rig.resetView();
        tips.until = performance.now() + 20_000;
      }),
    );
    hud.onResetCamera(() => {
      if (ctx.app.state === 'dive') {
        rig.resetView();
        tips.until = 0;
      }
    });
    cleanup.listen(canvas, 'dblclick', () => {
      if (
        ctx.app.state === 'dive' &&
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
