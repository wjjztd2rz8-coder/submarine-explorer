import { registerServiceWorker } from '../core/Pwa.js';
import { Input } from '../core/Input.js';
import { Time } from '../core/Time.js';
import { DiscoveryStore } from '../game/DiscoveryStore.js';
import { PhotoStore } from '../game/PhotoStore.js';
import { uiScaleFactors } from '../ui/HUD.js';
import { Journal } from '../ui/Journal.js';
import { PhotoGallery } from '../ui/PhotoGallery.js';
import type { ShellContext } from './context.js';
import { Disposables } from './Disposables.js';
import type { GameSystem } from './System.js';
import { createDailySystem } from './systems/daily.js';
import { initializeProgressMenus } from './systems/progress.js';
import { settingsSystem } from './systems/settings.js';
import { globeSystem, initializeShell, shellKeysSystem, shellSystem } from './systems/shell.js';
import { createQualitySystem } from './systems/quality.js';
import { createTitleSystem } from './systems/title.js';

/** Only menu capabilities and the decorative title run before selecting a site. */
export function createHomeSystems(): GameSystem<
  ShellContext,
  { dt: number; nowMs: number; frozen: boolean }
>[] {
  const cleanup = new Disposables();
  return [
    {
      name: 'menuData',
      init(ctx) {
        ctx.discoveries = new DiscoveryStore();
        ctx.journal = new Journal(ctx.bus);
        ctx.journal.setStore(ctx.discoveries);
        ctx.journal.setHomeMode(true);
        ctx.photos = new PhotoStore();
        ctx.journal.setPhotoGallery(
          ctx.photos,
          new PhotoGallery(ctx.photos, () => ctx.journal.refresh()),
        );
        ctx.input = new Input(ctx.canvas);
        ctx.input.attach();
        registerServiceWorker();
        ctx.expose({
          journal: ctx.journal,
          fieldGuide: ctx.journal,
          discoveries: ctx.discoveries,
          photos: ctx.photos,
          input: ctx.input,
          progress: ctx.progress,
        });
        cleanup.add(() => ctx.journal.dispose());
        cleanup.add(() => ctx.input.dispose());
        cleanup.listen(window, 'keydown', (event) => {
          if (event.code === 'Escape' && ctx.journal.isOpen) ctx.journal.close();
        });
      },
      frame: {
        'scan.discovery': (_f, ctx) => {
          if (ctx.input.state.toggleGuide && !ctx.settingsScreen.isOpen && !ctx.globe.isOpen)
            ctx.journal.toggle();
        },
        'late.input': (_f, ctx) => ctx.input.endFrame(),
      },
      dispose: () => cleanup.dispose(),
    },
    { name: 'shell', init: initializeShell, dispose: shellSystem.dispose },
    globeSystem,
    settingsSystem,
    createDailySystem(),
    {
      name: 'menuProgress',
      start(ctx) {
        initializeProgressMenus(ctx, cleanup);
      },
    },
    shellKeysSystem,
    createTitleSystem(),
    {
      name: 'titleRender',
      init(ctx) {
        ctx.renderStats = { calls: 0, triangles: 0 };
        const resize = () => {
          ctx.renderer.setSize(window.innerWidth, window.innerHeight, false);
          const scale = uiScaleFactors(window.innerWidth, ctx.save.get().uiScale);
          document.documentElement.style.setProperty('--ui-auto-scale', String(scale.auto));
          document.documentElement.style.setProperty('--ui-user-scale', String(scale.user));
        };
        ctx.resize = resize;
        cleanup.listen(window, 'resize', resize);
        resize();
      },
      frame: {
        'render.draw': (_f, ctx) => {
          ctx.titleScene.present(ctx.renderer);
          ctx.renderStats.calls = ctx.titleScene.calls;
          ctx.renderStats.triangles = ctx.titleScene.triangles;
        },
      },
    },
    createQualitySystem(),
  ];
}

/** The title does not need a vehicle, camera rig, physics frame or post pass. */
export function startHomeLoop(
  ctx: ShellContext,
  frame: (f: { dt: number; nowMs: number; frozen: boolean }) => void,
): () => void {
  const time = new Time(ctx.config.physicsHz);
  let ready = false;
  let frameId = requestAnimationFrame(draw);
  function draw(nowMs: number): void {
    ctx.input.sample();
    time.tick(nowMs);
    frame({ dt: time.frameDelta, nowMs, frozen: true });
    if (!ready) {
      ready = true;
      window.__gameReady = true;
    }
    frameId = requestAnimationFrame(draw);
  }
  return () => cancelAnimationFrame(frameId);
}
