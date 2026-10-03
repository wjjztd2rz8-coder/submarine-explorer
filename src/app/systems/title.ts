/**
 * Title scene bridge (F-TITLE-E): the Monterey canyon + research sub backdrop
 * behind the home menu. One shared WebGL renderer: while the home menu is the
 * visible view, `render.draw` hands the canvas to the title scene (see
 * `renderSystem`) instead of the gameplay scene.
 *
 * - The scene is built lazily on first home entry; the Monterey crop loads
 *   after that, never blocks `__gameReady`, and fails soft to the "Expedition
 *   preview" composition.
 * - It draws only while active: home visible, not in the sites subview (the
 *   embedded globe supplies the image there), no covering modal, tab visible.
 *   Inactive means `drawCount` stops; resuming invalidates for a fresh frame.
 * - Decorative only: no sim, route or save writes.
 */

import { TitleScene, type TitleLayout, type TitleTier } from '../../render/title/TitleScene.js';
import { buildTitleCrop, loadTitleCrop } from '../../render/title/TitleTerrain.js';
import type { GameContext } from '../context.js';
import { Disposables } from '../Disposables.js';
import type { GameSystem } from '../System.js';
import * as THREE from 'three';

/** Read-only diagnostics and the draw entry point, published as `ctx.titleScene`. */
export interface TitleBridge {
  readonly active: boolean;
  readonly terrainReady: boolean;
  readonly animated: boolean;
  readonly drawCount: number;
  readonly calls: number;
  readonly triangles: number;
  /** Home/menu owns the canvas this frame (active or deliberately idle). */
  readonly ownsCanvas: boolean;
  /** Draw the title frame (active) or clear to navy once (sites view); no-op otherwise. */
  present(renderer: THREE.WebGLRenderer): void;
}

const MONTEREY_TILE = 'monterey-canyon';
const NAVY = new THREE.Color(0x06131f);

export function titleTier(tier: GameContext['tier']): TitleTier {
  return tier === 'low' ? 'low' : tier === 'medium' ? 'medium' : 'high';
}

/** Match home.css: min-aspect-ratio includes square viewports. */
export function titleLayout(w: number, h: number): TitleLayout {
  if (w >= h && h <= 500) return 'short-landscape';
  return w < 960 ? 'portrait' : 'desktop';
}

export function createTitleSystem(): GameSystem {
  const cleanup = new Disposables();
  let scene: TitleScene | null = null;
  let ctxRef: GameContext | null = null;
  let disposed = false;
  let terrainReady = false;
  let loadStarted = false;
  let active = false;
  let wasActive = false;
  let cleared = false;
  let vw = 0;
  let vh = 0;
  let layout: TitleLayout | null = null;
  let pixelRatio = 0;
  let titleExposure = 1;
  let presentationDirty = true;
  let appliedTier: TitleTier | null = null;
  let appliedReduced: boolean | null = null;

  const homeVisible = (ctx: GameContext): boolean => ctx.app.state === 'home' && ctx.home.isOpen;
  const covered = (ctx: GameContext): boolean =>
    ctx.settingsScreen.isOpen ||
    ctx.discovery.guide.isOpen ||
    ctx.globe.isOpen ||
    (ctx.upgrades?.isOpen ?? false) ||
    (ctx.controlsCard?.isOpen ?? false);

  const bridge: TitleBridge = {
    get active() {
      return active;
    },
    get terrainReady() {
      return terrainReady;
    },
    get animated() {
      return active && (scene?.animated ?? false);
    },
    get drawCount() {
      return scene?.stats.drawCount ?? 0;
    },
    get calls() {
      return scene?.stats.calls ?? 0;
    },
    get triangles() {
      return scene?.stats.triangles ?? 0;
    },
    get ownsCanvas() {
      return ctxRef !== null && scene !== null && homeVisible(ctxRef);
    },
    present(renderer) {
      if (!ctxRef || !scene) return;
      if (active && !scene.animated && !presentationDirty) return;
      if (!active && (!ctxRef.home.sitesOpen || cleared || document.hidden)) return;
      // Gameplay may have left an offscreen target or depth-dependent exposure.
      // The title always presents to the canvas with the boot exposure.
      const target = renderer.getRenderTarget();
      const exposure = renderer.toneMappingExposure;
      const color = renderer.getClearColor(new THREE.Color());
      const alpha = renderer.getClearAlpha();
      const viewport = renderer.getViewport(new THREE.Vector4());
      const scissor = renderer.getScissor(new THREE.Vector4());
      const scissorTest = renderer.getScissorTest();
      try {
        renderer.setRenderTarget(null);
        renderer.toneMappingExposure = titleExposure;
        if (!cleared) {
          // Clear the entire canvas on entry/resize, including outside the hero.
          renderer.setScissorTest(false);
          renderer.setClearColor(NAVY, 1);
          renderer.clear();
        }
        if (active) {
          scene.draw(renderer);
          presentationDirty = false;
        }
        cleared = true;
      } finally {
        renderer.toneMappingExposure = exposure;
        renderer.setClearColor(color, alpha);
        renderer.setViewport(viewport.x, viewport.y, viewport.z, viewport.w);
        renderer.setScissor(scissor.x, scissor.y, scissor.z, scissor.w);
        renderer.setScissorTest(scissorTest);
        // Restore last: offscreen targets have their own GL viewport/scissor.
        renderer.setRenderTarget(target);
      }
    },
  };

  const ensureScene = (ctx: GameContext): void => {
    if (scene || disposed) return;
    scene = new TitleScene({ tier: titleTier(ctx.tier), reducedMotion: ctx.rig.reduceMotion });
    ctx.home.root.classList.add('has-title-scene');
    // After the first frame so the load never competes with `__gameReady`.
    if (!loadStarted) {
      loadStarted = true;
      const timer = setTimeout(() => void loadCrop(ctx), 0);
      cleanup.add(() => clearTimeout(timer));
    }
  };

  const loadCrop = async (ctx: GameContext): Promise<void> => {
    if (disposed) return;
    try {
      const crop =
        ctx.meta.id === MONTEREY_TILE
          ? buildTitleCrop(ctx.tile)
          : await loadTitleCrop(() => ctx.loader.load(MONTEREY_TILE));
      if (disposed || !scene) {
        crop.dispose();
        return;
      }
      scene.setCrop(crop);
      presentationDirty = true;
      terrainReady = true;
      ctx.home.setSceneCaption(true);
    } catch (error) {
      if (disposed) return;
      terrainReady = false;
      console.warn('[title] Monterey preview unavailable; using the fallback shot.', error);
    }
  };

  const reconcile = (ctx: GameContext): void => {
    const should =
      homeVisible(ctx) && !ctx.home.sitesOpen && !covered(ctx) && !document.hidden && !!scene;
    active = should;
    if (should !== wasActive) cleared = false;
    if (should && !wasActive) {
      scene?.invalidate();
      presentationDirty = true;
    }
    wasActive = should;
  };

  return {
    name: 'title',
    init(ctx) {
      ctxRef = ctx;
      titleExposure = ctx.renderer.toneMappingExposure;
      cleanup.listen(window, 'resize', () => {
        cleared = false;
        scene?.invalidate();
        presentationDirty = true;
      });
      cleanup.listen(document, 'visibilitychange', () => {
        reconcile(ctx);
      });
      ctx.titleScene = bridge;
      ctx.expose({
        get titleScene() {
          return {
            active: bridge.active,
            terrainReady: bridge.terrainReady,
            animated: bridge.animated,
            drawCount: bridge.drawCount,
            calls: bridge.calls,
            triangles: bridge.triangles,
          };
        },
      });
      cleanup.add(
        ctx.bus.on('app:state', ({ state }) => {
          if (state === 'home') ensureScene(ctx);
        }),
      );
      if (ctx.app.state === 'home') ensureScene(ctx);
    },
    frame: {
      'render.prepare': (f, ctx) => {
        reconcile(ctx);
        // The selector's CSS hides its globe on exceptionally short screens.
        // Stop that renderer as well; CSS alone leaves its update loop drawing.
        if (ctx.homeGlobe && homeVisible(ctx) && ctx.home.sitesOpen) {
          ctx.home.sizeGlobeTargets();
          const visible =
            !document.hidden && !covered(ctx) && ctx.home.globeSlot.getClientRects().length > 0;
          if (visible) ctx.homeGlobe.open('api');
          else ctx.homeGlobe.close();
        }
        if (!scene || !active) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const next = titleLayout(w, h);
        if (w !== vw || h !== vh || next !== layout) {
          cleared = false;
          presentationDirty = true;
          vw = w;
          vh = h;
          layout = next;
          scene.resize(w, h, next);
        }
        const nextPixelRatio = ctx.renderer.getPixelRatio();
        if (nextPixelRatio !== pixelRatio) {
          pixelRatio = nextPixelRatio;
          cleared = false;
          scene.invalidate();
          presentationDirty = true;
        }
        const nextTier = titleTier(ctx.tier);
        const nextReduced = ctx.rig.reduceMotion;
        if (nextTier !== appliedTier || nextReduced !== appliedReduced) presentationDirty = true;
        appliedTier = nextTier;
        appliedReduced = nextReduced;
        scene.setQuality(nextTier);
        scene.setReducedMotion(nextReduced);
        scene.update(f.dt);
      },
    },
    dispose() {
      disposed = true;
      cleanup.dispose();
      ctxRef?.home.root.classList.remove('has-title-scene');
      scene?.dispose();
      scene = null;
      active = false;
      terrainReady = false;
      ctxRef = null;
    },
  };
}
