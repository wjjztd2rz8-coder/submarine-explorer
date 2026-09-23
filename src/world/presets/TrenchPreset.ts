/**
 * Hadal trench: darker than the abyss band (denser, blacker fog, less
 * ambient, heavier vignette), sparser marine snow, and a pressure-ambience
 * tick `env:trench { depth }` at intervals that shorten with depth, for audio
 * to hang creaks on later. The darkening eases in from 1,000 m to the hadal
 * zone (6,000 m) so the descent through the upper column looks normal.
 *
 * Draw calls: 0. Everything is an adjustment of the Atmosphere sample.
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { HADAL_TOP_M, smoothstep, trenchInterval } from './maths.js';
import { num } from './shared.js';
import type { EnvPreset, PresetEnterContext, PresetFrameContext, PresetParams } from './types.js';

const BLACK = new THREE.Color(0, 0, 0);

export class TrenchPreset implements EnvPreset {
  readonly name: EnvPresetName = 'trench';
  readonly stats = { draws: 0, particles: 0, lights: 0 };
  private params: PresetParams = {};
  private visuals = false;
  private clock = 0;
  /** Number of `env:trench` ticks emitted (tests read it). */
  ticks = 0;

  enter(ctx: PresetEnterContext): void {
    this.params = ctx.params;
    this.visuals = ctx.visuals;
    this.clock = 0;
  }

  update(dt: number, ctx: PresetFrameContext): void {
    const p = this.params;
    const depth = -ctx.subPosition.y;
    const k = smoothstep(1000, HADAL_TOP_M, depth);
    if (this.visuals && k > 0) {
      const a = ctx.atmo;
      a.fogDensity *= 1 + (num(p.fogScale, 1.5) - 1) * k;
      a.fogColor.lerp(BLACK, num(p.fogDarken, 0.45) * k);
      a.ambientIntensity *= 1 + (num(p.ambientScale, 0.55) - 1) * k;
      a.snowDensity *= 1 + (num(p.snowScale, 0.4) - 1) * k;
      a.vignette += num(p.vignetteAdd, 0.1) * k;
    }
    if (depth < HADAL_TOP_M) {
      this.clock = 0;
      return;
    }
    this.clock += dt;
    const gap = trenchInterval(
      depth,
      num(p.creakMaxGapS, 14),
      num(p.creakMinGapS, 5),
      num(p.creakFullDepthM, 10900),
    );
    if (this.clock >= gap) {
      this.clock = 0;
      this.ticks++;
      ctx.bus.emit('env:trench', { depth: ctx.subPosition.y });
    }
  }

  debug(): string {
    return `ticks=${this.ticks}`;
  }

  exit(): void {}
}
