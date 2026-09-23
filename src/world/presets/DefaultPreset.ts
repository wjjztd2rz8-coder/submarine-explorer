/** The depth-band look from Atmosphere.ts, unchanged. */

import type { EnvPresetName } from '../../core/Config.js';
import type { EnvPreset } from './types.js';

export class DefaultPreset implements EnvPreset {
  readonly name: EnvPresetName = 'default';
  readonly stats = { draws: 0, particles: 0, lights: 0 };
  enter(): void {}
  update(): void {}
  exit(): void {}
}
