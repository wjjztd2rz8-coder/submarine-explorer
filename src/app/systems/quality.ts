/**
 * Quality tiers v2 at run time (F0-CORE): `window.__game.perf` counters and
 * dynamic resolution.
 *
 * - `perf` reports the last frame's draw calls and triangles (post pass
 *   included, from `renderer.info` via the render system), the smoothed frame
 *   time, the tier and how it was chosen, and the current pixel ratio and
 *   resolution scale (pixel ratio / the tier's ceiling).
 * - Dynamic resolution (`core/Quality.ts` `DynamicResolution`) steps the pixel
 *   ratio down while frames run over budget and back up with headroom. It runs
 *   when the tier was auto-detected (`auto` setting or `?tier=auto`), so a
 *   fixed tier (the default is `medium`) renders exactly as before.
 *   `?dynres=1` forces it on and `?dynres=0` off.
 */

import { DynamicResolution } from '../../core/Quality.js';
import type { GameContext } from '../context.js';
import type { GameSystem } from '../System.js';

/** The live `window.__game.perf` shape. */
export interface PerfStats {
  readonly tier: GameContext['tier'];
  readonly tierSource: GameContext['quality']['source'];
  readonly drawCalls: number;
  readonly triangles: number;
  /** Smoothed real frame time (ms). */
  readonly frameMs: number;
  readonly pixelRatio: number;
  /** The tier's pixel ratio before any dynamic scaling. */
  readonly maxPixelRatio: number;
  /** `pixelRatio / maxPixelRatio`: 1 at full resolution. */
  readonly resolutionScale: number;
  readonly dynamicResolution: boolean;
  /** Objects attached to the main scene, including hidden meshes and groups. */
  readonly sceneObjects: number;
  /** Live renderer allocations; useful for restart/reload soak comparisons. */
  readonly geometries: number;
  readonly textures: number;
}

/** Is dynamic resolution on for this dive? */
export function dynamicResolutionEnabled(
  param: string | null,
  source: GameContext['quality']['source'],
): boolean {
  if (param === '1') return true;
  if (param === '0') return false;
  return source === 'auto';
}

export function createQualitySystem(): GameSystem {
  let dynres: DynamicResolution | null = null;
  let lastNowMs = 0;
  let frameMs = 0;
  return {
    name: 'quality',
    init(ctx) {
      const { renderer, config, quality, params } = ctx;
      const maxPixelRatio = renderer.getPixelRatio();
      if (dynamicResolutionEnabled(params.get('dynres'), quality.source))
        dynres = new DynamicResolution(config.quality.dynamicResolution, maxPixelRatio);
      const perf: PerfStats = {
        get tier() {
          return ctx.tier;
        },
        get tierSource() {
          return quality.source;
        },
        get drawCalls() {
          return ctx.renderStats.calls;
        },
        get triangles() {
          return ctx.renderStats.triangles;
        },
        get frameMs() {
          return frameMs;
        },
        get pixelRatio() {
          return renderer.getPixelRatio();
        },
        maxPixelRatio,
        get resolutionScale() {
          return renderer.getPixelRatio() / maxPixelRatio;
        },
        dynamicResolution: dynres !== null,
        get sceneObjects() {
          let count = 0;
          ctx.scene.traverse(() => count++);
          return count;
        },
        get geometries() {
          return renderer.info.memory.geometries;
        },
        get textures() {
          return renderer.info.memory.textures;
        },
      };
      ctx.expose({ quality, perf });
    },
    frame: {
      'late.perf': (f, ctx) => {
        const ms = lastNowMs ? f.nowMs - lastNowMs : 0;
        lastNowMs = f.nowMs;
        // A hidden tab or a debugger pause is not a slow frame.
        if (ms > 0 && ms < 250) frameMs = frameMs ? frameMs + (ms - frameMs) * 0.1 : ms;
        if (!dynres || f.frozen) return;
        const next = dynres.update(ms);
        if (next !== null) {
          ctx.renderer.setPixelRatio(next);
          ctx.resize();
        }
      },
    },
  };
}
