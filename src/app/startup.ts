import { el } from '../ui/dom.js';
import { showFatal } from './boot.js';
import type { BootContext, GameContext, ShellContext } from './context.js';
import { DeferredStartup } from './deferredStartup.js';
import { createHomeSystems, startHomeLoop } from './homeStartup.js';
import { startLoop } from './loop.js';
import { SystemRunner } from './System.js';

function publish(ctx: BootContext): void {
  const { scene, renderer, bus, config } = ctx;
  window.__game = Object.defineProperties(
    { scene, renderer, bus, config },
    Object.getOwnPropertyDescriptors(ctx.exposed),
  );
}

/** Page navigation still resolves each selected route once and presents readiness on its first frame. */
export async function startRuntime(ctx: BootContext): Promise<() => void> {
  // Home never imports the ordered dive list or requests its tile.
  const startup = new DeferredStartup({
    async load(request: BootContext, signal: AbortSignal) {
      const [tile, { createSystems }] = await Promise.all([
        request.loader.load(request.tileId, signal),
        import('./systems.js'),
      ]);
      return { tile, systems: createSystems() };
    },
    // Tiles are CPU arrays; dropping the attempt releases them. Systems own GPU resources.
    release() {},
    initialize(request, loaded, lifetime) {
      const ctx = Object.assign(request, {
        tile: loaded.tile,
        meta: loaded.tile.meta,
      }) as GameContext;
      ctx.bus.emit('tile:loaded', { meta: ctx.meta });
      const runner = new SystemRunner(ctx);
      lifetime.addCleanup(() => runner.dispose());
      runner.init(loaded.systems);
      publish(ctx);
      lifetime.addCleanup(startLoop(ctx, runner));
    },
  });
  // The existing briefing surface carries loading until the first dive frame.
  // It is replaced by the real briefing (or piloting), never an extra guidance card.
  const loading = ctx.app.state === 'dive' ? el('div', 'briefing') : null;
  if (loading) {
    loading.id = 'startup-loading';
    loading.setAttribute('role', 'status');
    const panel = el('div', 'briefing-panel');
    panel.append(el('h1', 'briefing-title', 'Loading dive…'));
    loading.append(panel);
    document.body.append(loading);
  }
  const offReady = ctx.bus.on('game:ready', () => loading?.remove());
  let stopHome: (() => void) | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    loading?.remove();
    offReady();
    stopHome?.();
    startup.dispose();
    window.removeEventListener('pagehide', onPageHide);
  };
  const onPageHide = (event: PageTransitionEvent) => {
    // Cached pages resume their existing loop and controls on Back navigation.
    if (!event.persisted) dispose();
  };
  window.addEventListener('pagehide', onPageHide);
  try {
    if (ctx.app.state === 'home') {
      if ((await startup.start({ state: 'home' })) !== 'home' || disposed) return dispose;
      const shell = ctx as ShellContext;
      const runner = new SystemRunner<ShellContext, { dt: number; nowMs: number; frozen: boolean }>(
        shell,
      );
      stopHome = () => runner.dispose();
      runner.init(createHomeSystems());
      publish(ctx);
      const stopLoop = startHomeLoop(shell, (f) => runner.frame(f));
      stopHome = () => {
        stopLoop();
        runner.dispose();
      };
    } else {
      await startup.start({ state: 'dive', dive: { key: ctx.params.toString(), request: ctx } });
    }
  } catch (error) {
    dispose();
    const message = error instanceof Error ? error.message : String(error);
    ctx.bus.emit('tile:error', { id: ctx.tileId, error: message });
    showFatal(`Could not start dive "${ctx.tileId}": ${message}`);
  }
  return dispose;
}
