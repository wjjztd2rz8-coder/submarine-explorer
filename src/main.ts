/**
 * Boot resolves the page's route and preferences. Startup presents Home with
 * only menu/title capabilities or loads the selected dive through its lifetime.
 * Readiness still belongs to the first presented frame.
 */

import { boot, showFatal } from './app/boot.js';
import { startRuntime } from './app/startup.js';

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
  await startRuntime(bootCtx);
}

main().catch((err: unknown) => {
  showFatal(err instanceof Error ? `${err.message}` : String(err));
});
