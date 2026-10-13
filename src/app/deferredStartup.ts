import type { AppState } from './context.js';

/** A resolved start. The caller's key includes every input that distinguishes a dive. */
export interface DiveSelection<Request> {
  readonly key: string;
  readonly request: Request;
}

/** Boot owns route policy; this boundary receives its existing Home/dive decision. */
export type StartupRoute<Request> =
  | { readonly state: Extract<AppState, 'home'> }
  | { readonly state: Extract<AppState, 'dive'>; readonly dive: DiveSelection<Request> };

export interface DiveLifetime {
  readonly signal: AbortSignal;
  /** Register teardown before initializing anything that can partially fail. */
  addCleanup(cleanup: () => void): void;
}

export interface StartupOperations<Request, Tile> {
  load(request: Request, signal: AbortSignal): Promise<Tile>;
  /** Release a loaded tile, including one returned after cancellation. */
  release(tile: Tile): void;
  /**
   * Synchronous like SystemRunner.init. Register rollback before init, and use
   * the lifetime for any async work started by systems. Do not publish readiness
   * here: it still belongs to the first presented frame.
   */
  initialize(request: Request, tile: Tile, lifetime: DiveLifetime): undefined;
}

type DiveResult = 'started' | 'cancelled';

interface Attempt<Request> {
  selection: DiveSelection<Request>;
  controller: AbortController;
  cleanups: Array<() => void>;
  promise: Promise<DiveResult>;
}

/**
 * Owns only the dive load/init lifetime, not the shell, title, settings or routes.
 * Home does no dive work. A selection replaces the previous lifetime, while
 * selecting the same key shares its pending (or successful) result.
 */
export class DeferredStartup<Request, Tile> {
  private current: Attempt<Request> | null = null;
  private disposed = false;

  constructor(private readonly operations: StartupOperations<Request, Tile>) {}

  start(route: StartupRoute<Request>): Promise<'home' | DiveResult> {
    if (this.disposed) return Promise.resolve('cancelled');
    if (route.state === 'dive') return this.select(route.dive);
    this.cancel();
    return Promise.resolve('home');
  }

  select(selection: DiveSelection<Request>): Promise<DiveResult> {
    if (this.disposed) return Promise.resolve('cancelled');
    if (this.current?.selection.key === selection.key) return this.current.promise;
    const previous = this.current;
    const attempt: Attempt<Request> = {
      selection,
      controller: new AbortController(),
      cleanups: [],
      // Run after publishing the attempt, so even reentrant callbacks see it.
      promise: Promise.resolve().then(() => this.run(attempt)),
    };
    this.current = attempt;
    try {
      if (previous) this.cleanup(previous);
    } catch (error) {
      if (this.current === attempt) this.current = null;
      this.cleanup(attempt);
      return Promise.reject(error);
    }
    return attempt.promise;
  }

  /** Abort and release the current lifetime; another selection may follow. */
  cancel(): void {
    const attempt = this.current;
    this.current = null;
    if (attempt) this.cleanup(attempt);
  }

  /** Final teardown. Subsequent starts/selections do no work. */
  dispose(): void {
    this.disposed = true;
    this.cancel();
  }

  private async run(attempt: Attempt<Request>): Promise<DiveResult> {
    const signal = attempt.controller.signal;
    const lifetime: DiveLifetime = {
      signal,
      addCleanup: (cleanup) => {
        if (signal.aborted) cleanup();
        else attempt.cleanups.push(cleanup);
      },
    };
    if (signal.aborted) return 'cancelled';
    let tile: Tile;
    try {
      tile = await this.operations.load(attempt.selection.request, signal);
    } catch (error) {
      // A cancelled load may reject even if its loader ignores AbortSignal.
      if (signal.aborted) return 'cancelled';
      this.fail(attempt, error);
    }
    lifetime.addCleanup(() => this.operations.release(tile));
    if (signal.aborted) return 'cancelled';
    try {
      this.operations.initialize(attempt.selection.request, tile, lifetime);
      return signal.aborted ? 'cancelled' : 'started';
    } catch (error) {
      this.fail(attempt, error);
    }
  }

  private fail(attempt: Attempt<Request>, error: unknown): never {
    if (this.current === attempt) this.current = null;
    try {
      this.cleanup(attempt);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Dive startup and cleanup failed');
    }
    // Preserve the original error for the caller's tile:error / showFatal path.
    throw error;
  }

  private cleanup(attempt: Attempt<Request>): void {
    attempt.controller.abort();
    const errors: unknown[] = [];
    for (const cleanup of attempt.cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) throw new AggregateError(errors, 'Dive cleanup failed');
  }
}
