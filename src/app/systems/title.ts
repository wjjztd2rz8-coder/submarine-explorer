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
      if (active) {
        cleared = false;
        scene.draw(renderer);
        return;
      }
      // Sites view: the globe is the image. Clear the shared canvas once.
      if (ctxRef.home.sitesOpen && !cleared) {
        const color = renderer.getClearColor(new THREE.Color());
        const alpha = renderer.getClearAlpha();
        renderer.setRenderTarget(null);
        renderer.setClearColor(NAVY, 1);
        renderer.clear();
        renderer.setClearColor(color, alpha);
        cleared = true;
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
      setTimeout(() => void loadCrop(ctx), 0);
    }
  };

  const loadCrop = async (ctx: GameContext): Promise<void> => {
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
      terrainReady = true;
      ctx.home.setSceneCaption(true);
    } catch (error) {
      terrainReady = false;
      console.warn('[title] Monterey preview unavailable; using the fallback shot.', error);
    }
  };

  const reconcile = (ctx: GameContext): void => {
    const should =
      homeVisible(ctx) && !ctx.home.sitesOpen && !covered(ctx) && !document.hidden && !!scene;
    active = should;
    if (should && !wasActive) {
      cleared = false;
      scene?.invalidate();
    }
    wasActive = should;
  };

  return {
    name: 'title',
    init(ctx) {
      ctxRef = ctx;
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
        if (!scene || !active) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const next = titleLayout(w, h);
        if (w !== vw || h !== vh || next !== layout) {
          vw = w;
          vh = h;
          layout = next;
          scene.resize(w, h, next);
        }
        scene.setQuality(titleTier(ctx.tier));
        scene.setReducedMotion(ctx.rig.reduceMotion);
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
    },
  };
}
