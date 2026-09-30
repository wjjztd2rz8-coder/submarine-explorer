/**
 * Entry point (F0-CORE). Boot builds the shared context (`app/boot.ts`), every
 * system in `app/systems.ts` initialises in order, `window.__game` gets the
 * debug handles, and the frame loop starts (`app/loop.ts`). Add features as
 * systems under `src/app/systems/`, not here. See docs/architecture.md.
 *
 * `window.__gameReady` is set to true once the first frame has been presented;
 * the Playwright smoke test waits on it.
 */

import { boot, showFatal } from './app/boot.js';
import type { GameContext } from './app/context.js';
import { startLoop } from './app/loop.js';
import { SystemRunner } from './app/System.js';
import { createSystems } from './app/systems.js';

declare global {
  interface Window {
    /** Set once the first frame has rendered. The e2e smoke test waits on this. */
    __gameReady?: boolean;
    /** Populated on a fatal startup error, for diagnostics. */
    __gameError?: string;
    /** Handy live handles for debugging from the console. */
    __game?: Record<string, unknown>;
  }
}

async function main(): Promise<void> {
  const bootCtx = await boot();
  if (!bootCtx) return;
  // Systems fill in the rest of the context during `init`.
  const ctx = bootCtx as GameContext;
  const runner = new SystemRunner(ctx);
  runner.init(createSystems());

  const { scene, renderer, bus, config } = ctx;
  window.__game = Object.defineProperties(
    { scene, renderer, bus, config },
    Object.getOwnPropertyDescriptors(ctx.exposed),
  );
  startLoop(ctx, runner);
}

main().catch((err: unknown) => {
  showFatal(err instanceof Error ? `${err.message}` : String(err));
});
