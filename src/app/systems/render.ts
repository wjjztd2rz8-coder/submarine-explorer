/**
 * Drawing: the scene to an offscreen target and the underwater post pass (A2
 * grade and vignette from the current depth band) to the screen, or the scene
 * straight to the canvas on the low tier / with post-processing off. Also the
 * window resize handler and the `?debugTerrain=1` once-a-second log.
 */

import type * as THREE from 'three';
import { UnderwaterPass } from '../../shaders/underwater.js';
import { uiScaleFactors } from '../../ui/HUD.js';
import type { GameSystem } from '../System.js';

export const renderSystem: GameSystem = {
  name: 'render',
  init(ctx) {
    const { renderer, rig, save } = ctx;
    const post = new UnderwaterPass(window.innerWidth, window.innerHeight);
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
    window.addEventListener('resize', resize);
    resize();
  },
  frame: {
    'render.draw': (f, ctx) => {
      const { renderer, scene, rig, post, atmoTier, renderStats } = ctx;
      // C5: post-processing can be switched off in Settings.
      if (atmoTier.post && ctx.postFx) {
        // Grade and vignette come from the current depth band (A2).
        (post.material.uniforms.uTint!.value as THREE.Color).copy(f.atmo.gradeTint);
        post.material.uniforms.uVignette!.value = f.atmo.vignette;
        renderer.setRenderTarget(post.target);
        renderer.clear();
        renderer.render(scene, rig.camera);
        post.render(renderer, f.elapsed, f.atmo.depth01);
        // The post quad's own render() auto-resets info; add the scene's share.
        renderStats.calls = post.sceneDrawCalls + renderer.info.render.calls;
        renderStats.triangles = post.sceneTriangles + renderer.info.render.triangles;
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, rig.camera);
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
