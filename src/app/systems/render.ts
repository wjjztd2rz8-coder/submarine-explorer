/**
 * Drawing: the scene to an offscreen target and the underwater post pass (A2
 * grade and vignette from the current depth band) to the screen, or the scene
 * straight to the canvas on the low tier / with post-processing off. Also the
 * window resize handler and the `?debugTerrain=1` once-a-second log.
 */

import type { PostFrame } from '../../shaders/underwater.js';
import { UnderwaterPass } from '../../shaders/underwater.js';
import { uiScaleFactors } from '../../ui/HUD.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';
import { drawWithReducedMotion } from '../../render/reducedMotion.js';

const cleanup = new Disposables();

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** God-ray strength by camera depth: none above the surface, best in the top tens of metres, gone by the twilight base. */
export function godRayStrength(base: number, depthM: number): number {
  return base * smooth(0, -6, depthM) * (1 - smooth(-30, -260, depthM));
}

let baseExposure = 1.0;

export const renderSystem: GameSystem = {
  name: 'render',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { renderer, rig, save } = ctx;
    const post = new UnderwaterPass(window.innerWidth, window.innerHeight, {
      tier: ctx.config.water.tiers[ctx.tier],
    });
    baseExposure = renderer.toneMappingExposure;
    ctx.post = post;
    ctx.renderStats = { calls: 0, triangles: 0 };
    const resize = (): void => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      rig.setAspect(w / h);
      post.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      // D-INPUT-HUD
      const scale = uiScaleFactors(w, save.get().uiScale);
      document.documentElement.style.setProperty('--ui-auto-scale', String(scale.auto));
      document.documentElement.style.setProperty('--ui-user-scale', String(scale.user));
    };
    ctx.resize = resize;
    cleanup.listen(window, 'resize', resize);
    resize();
  },
  frame: {
    'render.draw': (f, ctx) => {
      const { renderer, scene, rig, post, atmoTier, renderStats, config } = ctx;
      // F-TITLE-E: the home menu owns the canvas; skip the gameplay draw/post path.
      if (ctx.titleScene.ownsCanvas) {
        ctx.titleScene.present(renderer);
        renderStats.calls = ctx.titleScene.calls;
        renderStats.triangles = ctx.titleScene.triangles;
        return;
      }
      // C5: post-processing can be switched off in Settings.
      if (atmoTier.post && ctx.postFx) {
        // The composite applies the band gain itself: undo any direct-path exposure.
        renderer.toneMappingExposure = baseExposure;
        renderer.setRenderTarget(post.target);
        renderer.clear();
        drawWithReducedMotion(scene, rig.reduceMotion, () => renderer.render(scene, rig.camera));
        // Grade, vignette, fog and light come from the current depth band (A2).
        const a = f.atmo;
        const frame: PostFrame = {
          elapsed: f.elapsed,
          depthM: a.depth,
          depth01: a.depth01,
          photic: a.causticsStrength,
          tint: a.gradeTint,
          gain: a.gradeGain,
          saturation: a.gradeSaturation,
          vignette: a.vignette,
          fogColor: a.fogColor,
          fogDensity: a.fogDensity,
          aberration: config.water.aberrationStrength * atmoTier.aberration * 0.5,
          rayStrength: atmoTier.godRays ? godRayStrength(config.water.godRayStrength, a.depth) : 0,
          bloomStrength: 0.12,
          camera: rig.camera,
        };
        post.render(renderer, frame);
        // The post quad's own render() auto-resets info; add the scene's share.
        renderStats.calls = post.sceneDrawCalls + renderer.info.render.calls;
        renderStats.triangles = post.sceneTriangles + renderer.info.render.triangles;
      } else {
        // No post pass: the band's gain still reaches the frame through exposure.
        renderer.toneMappingExposure = baseExposure * f.atmo.gradeGain;
        renderer.setRenderTarget(null);
        drawWithReducedMotion(scene, rig.reduceMotion, () => renderer.render(scene, rig.camera));
        renderStats.calls = renderer.info.render.calls;
        renderStats.triangles = renderer.info.render.triangles;
      }
    },
    'late.debug': (f, ctx) => {
      if (!f.debugLogDue) return;
      const { terrain, atmosphere, atmoTier, post, renderer } = ctx;
      console.info(
        // The post quad's own render() auto-resets info, so add the scene's calls it captured.
        `[terrain] ${terrain.debugString()} | ${atmosphere.debugString()} | ` +
          `draws ${(atmoTier.post ? post.sceneDrawCalls : 0) + renderer.info.render.calls} | ` +
          `${(1 / Math.max(1e-3, f.dt)).toFixed(0)} fps`,
      );
    },
  },
};
