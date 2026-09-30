/**
 * Keyboard, mouse and gamepad input (core/Input.ts). Sampled by the loop at the
 * start of each frame; edge presses are cleared at the end.
 */

import { Input } from '../../core/Input.js';
import type { GameSystem } from '../System.js';

export const inputSystem: GameSystem = {
  name: 'input',
  init(ctx) {
    const input = new Input(ctx.canvas);
    input.attach();
    ctx.input = input;
    ctx.expose({ input });
  },
  frame: {
    'late.input': (_f, ctx) => ctx.input.endFrame(),
  },
};
