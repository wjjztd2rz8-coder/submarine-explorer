import { describe, expect, it, vi } from 'vitest';
import {
  DeferredStartup,
  type DiveLifetime,
  type DiveSelection,
} from '../../src/app/deferredStartup.js';
import { chooseTileId, resolveMissionRoute } from '../../src/game/MissionRouter.js';
import { dailyDive } from '../../src/game/Daily.js';
import { missionUrl, tileUrl } from '../../src/ui/MissionSelect.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';

function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

interface Request {
  tileId: string;
}
interface Tile {
  id: string;
}
const selected = (tileId: string): DiveSelection<Request> => ({
  key: tileId,
  request: { tileId },
});

function setup() {
  const loads: ReturnType<typeof pending<Tile>>[] = [];
  const load = vi.fn((_request: Request, _signal: AbortSignal) => {
    const result = pending<Tile>();
    loads.push(result);
    return result.promise;
  });
  const events: string[] = [];
  const installed = new Set<string>();
  const release = vi.fn((tile: Tile) => events.push(`release ${tile.id}`));
  const initSystem = vi.fn((name: string) => installed.add(name));
  const initialize = vi.fn((_request: Request, tile: Tile, lifetime: DiveLifetime): undefined => {
    for (const name of ['terrain', 'mission']) {
      const id = `${tile.id}/${name}`;
      lifetime.addCleanup(() => {
        installed.delete(id);
        events.push(`dispose ${id}`);
      });
      initSystem(id);
    }
  });
  const startup = new DeferredStartup({ load, release, initialize });
  return { startup, loads, load, release, initialize, initSystem, installed, events };
}

describe('deferred dive startup', () => {
  it('boots Home with zero dive tile loads and zero dive system initializations', async () => {
    const h = setup();
    expect(await h.startup.start({ state: 'home' })).toBe('home');
    expect(await h.startup.start({ state: 'home' })).toBe('home');
    expect(h.load).not.toHaveBeenCalled();
    expect(h.initialize).not.toHaveBeenCalled();
    expect(h.initSystem).not.toHaveBeenCalled();
    h.startup.dispose();
    expect(h.release).not.toHaveBeenCalled();
  });

  it('loads only the selected site after selection and initializes only after its tile arrives', async () => {
    const h = setup();
    await h.startup.start({ state: 'home' });
    const selection = selected('lost-city');
    const result = h.startup.select(selection);
    await Promise.resolve();
    expect(h.load).toHaveBeenCalledExactlyOnceWith(selection.request, expect.any(AbortSignal));
    expect(h.initSystem).not.toHaveBeenCalled();
    const tile = { id: 'lost-city' };
    h.loads[0].resolve(tile);
    expect(await result).toBe('started');
    expect(h.initialize).toHaveBeenCalledExactlyOnceWith(
      selection.request,
      tile,
      expect.objectContaining({ signal: h.load.mock.calls[0][1] }),
    );
    expect(h.initSystem.mock.calls).toEqual([['lost-city/terrain'], ['lost-city/mission']]);
    h.startup.dispose();
    expect(h.installed.size).toBe(0);
    expect(h.events).toEqual([
      'dispose lost-city/mission',
      'dispose lost-city/terrain',
      'release lost-city',
    ]);
  });

  it.each(['mission', 'free dive'])(
    'starts a resolved direct %s route without a Home selection',
    async (kind) => {
      // Reuse the existing link and route contracts; boot still decides bypass.
      const href =
        kind === 'mission'
          ? missionUrl('https://example.test/?tier=low', 'titanic')
          : tileUrl('https://example.test/?tier=low', 'lost-city');
      const params = new URL(href).searchParams;
      const route = await resolveMissionRoute(params, async () => ({
        ok: true,
        text: async () => JSON.stringify(titanicMission),
      }));
      const tileId = chooseTileId(
        route?.tileId ?? params.get('tile'),
        [{ id: 'titanic' }, { id: 'lost-city' }],
        'titanic',
      );
      const h = setup();
      const result = h.startup.start({ state: 'dive', dive: selected(tileId) });
      await Promise.resolve();
      expect(h.load.mock.calls[0][0].tileId).toBe(kind === 'mission' ? 'titanic' : 'lost-city');
      h.loads[0].resolve({ id: tileId });
      expect(await result).toBe('started');
      expect(h.initialize).toHaveBeenCalledTimes(1);
      h.startup.dispose();
    },
  );

  it('shares repeated pending and successful selections without duplicate load or init', async () => {
    const h = setup();
    const first = h.startup.select(selected('titanic'));
    const second = h.startup.select(selected('titanic'));
    expect(second).toBe(first);
    await Promise.resolve();
    h.loads[0].resolve({ id: 'titanic' });
    expect(await first).toBe('started');
    expect(h.startup.select(selected('titanic'))).toBe(first);
    expect(h.load).toHaveBeenCalledTimes(1);
    expect(h.initialize).toHaveBeenCalledTimes(1);
    expect(h.initSystem).toHaveBeenCalledTimes(2);
    h.startup.dispose();
  });

  it('preserves a load error, initializes nothing and permits retry of the same selection', async () => {
    const h = setup();
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    const error = new Error('tile unavailable');
    const rejected = expect(result).rejects.toBe(error);
    h.loads[0].reject(error);
    await rejected;
    expect(h.load.mock.calls[0][1].aborted).toBe(true);
    expect(h.initialize).not.toHaveBeenCalled();
    expect(h.installed.size).toBe(0);
    expect(h.release).not.toHaveBeenCalled();
    const retry = h.startup.select(selected('titanic'));
    await Promise.resolve();
    h.loads[1].resolve({ id: 'titanic' });
    expect(await retry).toBe('started');
    expect(h.initialize).toHaveBeenCalledTimes(1);
    h.startup.dispose();
  });

  it('rolls back partial system initialization and releases the loaded tile on failure', async () => {
    const h = setup();
    const error = new Error('mission init failed');
    const disposePartial = vi.fn();
    h.initialize.mockImplementationOnce((_request, _tile, lifetime) => {
      lifetime.addCleanup(disposePartial);
      throw error;
    });
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    const rejected = expect(result).rejects.toBe(error);
    const tile = { id: 'titanic' };
    h.loads[0].resolve(tile);
    await rejected;
    expect(disposePartial).toHaveBeenCalledTimes(1);
    expect(h.release).toHaveBeenCalledExactlyOnceWith(tile);
    h.startup.dispose();
    expect(disposePartial).toHaveBeenCalledTimes(1);
    const retry = h.startup.select(selected('titanic'));
    expect(await retry).toBe('cancelled');
  });

  it.each(['cancel', 'dispose'] as const)(
    '%s aborts a pending load and releases a late tile without stale initialization',
    async (action) => {
      const h = setup();
      const result = h.startup.select(selected('titanic'));
      await Promise.resolve();
      h.startup[action]();
      expect(h.load.mock.calls[0][1].aborted).toBe(true);
      const tile = { id: 'titanic' };
      h.loads[0].resolve(tile); // loader deliberately ignores abort
      expect(await result).toBe('cancelled');
      expect(h.release).toHaveBeenCalledExactlyOnceWith(tile);
      expect(h.initialize).not.toHaveBeenCalled();
      h.startup.dispose();
      expect(h.release).toHaveBeenCalledTimes(1);
    },
  );

  it('does no load when disposed before the pending operation starts or selected again', async () => {
    const h = setup();
    const result = h.startup.select(selected('titanic'));
    h.startup.dispose();
    expect(await result).toBe('cancelled');
    expect(await h.startup.select(selected('lost-city'))).toBe('cancelled');
    expect(await h.startup.start({ state: 'dive', dive: selected('titanic') })).toBe('cancelled');
    expect(await h.startup.start({ state: 'home' })).toBe('cancelled');
    expect(h.load).not.toHaveBeenCalled();
    expect(h.initSystem).not.toHaveBeenCalled();
  });

  it('treats a cancelled load rejection as cancellation and allows a fresh start', async () => {
    const h = setup();
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    h.startup.cancel();
    h.loads[0].reject(new Error('fetch aborted'));
    expect(await result).toBe('cancelled');
    const retry = h.startup.select(selected('titanic'));
    await Promise.resolve();
    h.loads[1].resolve({ id: 'titanic' });
    expect(await retry).toBe('started');
    h.startup.dispose();
  });

  it.each(['resolve', 'reject'] as const)(
    'a superseded load can %s after the selected site starts without replacing it',
    async (completion) => {
      const h = setup();
      const old = h.startup.select(selected('titanic'));
      await Promise.resolve();
      const next = h.startup.select(selected('lost-city'));
      await Promise.resolve();
      h.loads[1].resolve({ id: 'lost-city' });
      expect(await next).toBe('started');
      if (completion === 'resolve') h.loads[0].resolve({ id: 'titanic' });
      else h.loads[0].reject(new Error('old load failed'));
      expect(await old).toBe('cancelled');
      expect(h.initialize).toHaveBeenCalledTimes(1);
      expect([...h.installed]).toEqual(['lost-city/terrain', 'lost-city/mission']);
      expect(h.startup.select(selected('lost-city'))).toBe(next);
      h.startup.dispose();
      expect(h.installed.size).toBe(0);
    },
  );

  it('returning to Home releases installed systems before a new selection', async () => {
    const h = setup();
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    h.loads[0].resolve({ id: 'titanic' });
    await result;
    expect(await h.startup.start({ state: 'home' })).toBe('home');
    expect(h.installed.size).toBe(0);
    expect(h.load).toHaveBeenCalledTimes(1);
    const next = h.startup.select(selected('lost-city'));
    await Promise.resolve();
    h.loads[1].resolve({ id: 'lost-city' });
    expect(await next).toBe('started');
    h.startup.dispose();
  });

  it('cancellation during synchronous init cleans resources registered before and after abort', async () => {
    const h = setup();
    const before = vi.fn();
    const after = vi.fn();
    h.initialize.mockImplementationOnce((_request, _tile, lifetime) => {
      lifetime.addCleanup(before);
      h.startup.dispose();
      expect(lifetime.signal.aborted).toBe(true);
      lifetime.addCleanup(after);
    });
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    h.loads[0].resolve({ id: 'titanic' });
    expect(await result).toBe('cancelled');
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it('continues rollback after a disposer throws and retains the startup error', async () => {
    const h = setup();
    const initError = new Error('init failed');
    const cleanupError = new Error('cleanup failed');
    const remaining = vi.fn();
    h.initialize.mockImplementationOnce((_request, _tile, lifetime) => {
      lifetime.addCleanup(remaining);
      lifetime.addCleanup(() => {
        throw cleanupError;
      });
      throw initError;
    });
    const result = h.startup.select(selected('titanic'));
    await Promise.resolve();
    const rejected = expect(result).rejects.toMatchObject({
      errors: [initError, expect.objectContaining({ errors: [cleanupError] })],
    });
    h.loads[0].resolve({ id: 'titanic' });
    await rejected;
    expect(remaining).toHaveBeenCalledTimes(1);
    expect(h.release).toHaveBeenCalledTimes(1);
    h.startup.dispose();
    expect(h.release).toHaveBeenCalledTimes(1);
  });

  it('passes resolved settings, progress and captured Daily data unchanged across midnight', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-10-01T23:59:59Z'));
      const request = Object.freeze({
        tileId: 'titanic',
        settings: Object.freeze({ gameplayMode: 'arcade', graphicsTier: 'auto' }),
        progress: Object.freeze({ lifetime: 2400, discoveries: ['titanic/bow'] }),
        daily: Object.freeze(dailyDive('2026-10-01', ['titanic'])!),
        params: new URLSearchParams('mission=titanic&daily=2026-10-01&tier=low'),
      });
      const snapshot = JSON.stringify(request);
      const tile = pending<Tile>();
      const load = vi.fn((_request: typeof request, _signal: AbortSignal) => tile.promise);
      const initialize = vi.fn(
        (_request: typeof request, _tile: Tile, _lifetime: DiveLifetime): undefined => {},
      );
      const startup = new DeferredStartup({ load, initialize, release: vi.fn() });
      const selection = { key: request.params.toString(), request };
      const result = startup.start({ state: 'dive', dive: selection });
      await Promise.resolve();
      vi.setSystemTime(new Date('2026-10-02T00:00:01Z'));
      tile.resolve({ id: 'titanic' });
      expect(await result).toBe('started');
      expect(load.mock.calls[0][0]).toBe(request);
      expect(initialize.mock.calls[0][0]).toBe(request);
      expect(JSON.stringify(request)).toBe(snapshot);
      expect(request.daily).toEqual(dailyDive('2026-10-01', ['titanic']));
      expect(request.params.get('tier')).toBe('low');
      startup.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
