/**
 * Keyboard, mouse and gamepad input (core/Input.ts). Sampled by the loop at the
 * start of each frame; edge presses are cleared at the end.
 */

import { Input } from '../../core/Input.js';
import { Disposables } from '../Disposables.js';
import type { GameSystem } from '../System.js';

export function createInputSystem(): GameSystem {
  const cleanup = new Disposables();
  return {
    name: 'input',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const input = new Input(ctx.canvas);
      input.attach();
      cleanup.add(() => input.dispose());
      cleanup.add(
        ctx.bus.on('app:state', ({ state }) => {
          if (state !== 'dive') input.clear();
        }),
      );
      ctx.input = input;
      ctx.expose({ input });
    },
    frame: {
      'late.input': (f, ctx) => {
        // Keys pressed behind a menu must not resume piloting when it closes.
        // Photo mode still consumes drag/zoom and held camera controls.
        if (f.frozen && !ctx.photoMode.active) ctx.input.clear();
        else ctx.input.endFrame();
      },
    },
  };
}
