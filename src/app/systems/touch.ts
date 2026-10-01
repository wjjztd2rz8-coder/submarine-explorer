/**
 * Touch controls (F1-TOUCH, ui/TouchControls.ts): builds the on-screen stick,
 * slider and buttons after the input and camera controls exist, and shows them
 * only while touch is the primary input during play.
 */

import { registerServiceWorker } from '../../core/Pwa.js';
import { TouchControls } from '../../ui/TouchControls.js';
import type { GameSystem } from '../System.js';

export function createTouchSystem(): GameSystem {
  let touch: TouchControls | null = null;
  return {
    name: 'touch',
    init(ctx) {
      touch = new TouchControls({
        input: ctx.input,
        canvas: ctx.canvas,
        sonar: ctx.sonar,
        onPause: () => {
          if (ctx.app.state === 'dive') ctx.setAppState('pause');
        },
      });
      if (ctx.params.get('touch') === '1') touch.setTouchMode(true);
      ctx.expose({ touch });
      registerServiceWorker();
    },
    frame: {
      'late.input': (f, ctx) => {
        touch?.update(!f.frozen && ctx.app.state === 'dive', ctx.photoMode.active);
      },
    },
    dispose() {
      touch?.dispose();
      touch = null;
    },
  };
}
