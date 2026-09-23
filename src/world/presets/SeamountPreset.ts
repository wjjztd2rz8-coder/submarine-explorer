/**
 * Seamount: identical to the default (basalt is the terrain's job), plus a
 * sparse warm glow at up to `glowLights` POIs of kind `vent` when the site
 * has any (e.g. Kamaʻehuakanaloa's summit vents). No draw calls.
 */

import * as THREE from 'three';
import type { EnvPresetName } from '../../core/Config.js';
import { GlowLights, num } from './shared.js';
import type { EnvPreset, PresetEnterContext, PresetFrameContext } from './types.js';

export class SeamountPreset implements EnvPreset {
  readonly name: EnvPresetName = 'seamount';
  readonly stats = { draws: 0, particles: 0, lights: 0 };
  private glow: GlowLights | null = null;

  enter(ctx: PresetEnterContext): void {
    if (!ctx.visuals) return;
    const p = ctx.params;
    const lift = new THREE.Vector3(0, num(p.glowLiftM, 6), 0);
    const vents = ctx.pois
      .filter((q) => q.kind === 'vent')
      .slice(0, Math.max(0, Math.min(3, Math.round(num(p.glowLights, 2)))))
      .map((q) => q.position.clone().add(lift));
    if (!vents.length) return;
    this.glow = new GlowLights(
      ctx.scene,
      vents,
      num(p.glowColor, 0xff9a4a),
      num(p.glowIntensity, 160),
      num(p.glowDistanceM, 50),
    );
    this.stats.lights = vents.length;
  }

  update(_dt: number, ctx: PresetFrameContext): void {
    this.glow?.update(ctx.elapsed);
  }

  exit(): void {
    this.glow?.dispose();
    this.glow = null;
    this.stats.lights = 0;
  }
}
