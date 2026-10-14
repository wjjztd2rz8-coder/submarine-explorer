import { afterEach, describe, expect, it, vi } from 'vitest';
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

// Exercise the runtime boundary with the real lifecycle, runner and frame loops.
// The component lists stand in for WebGL/DOM systems so ordering and readiness
// can be checked without a browser.
vi.mock('three', async (original) => ({
  ...(await original<typeof import('three')>()),
  WebGLRenderer: vi.fn(function () {
    return { getContext: () => null, setPixelRatio() {}, setSize() {} };
  }),
}));
vi.mock('../../src/app/boot.js', () => ({ showFatal: vi.fn() }));
vi.mock('../../src/app/homeStartup.js', async (original) => ({
  ...(await original<typeof import('../../src/app/homeStartup.js')>()),
  createHomeSystems: vi.fn(() => []),
}));
vi.mock('../../src/app/systems.js', () => ({ createSystems: vi.fn(() => []) }));

import { startRuntime } from '../../src/app/startup.js';
import { showFatal } from '../../src/app/boot.js';
import { createHomeSystems } from '../../src/app/homeStartup.js';
import { createSystems } from '../../src/app/systems.js';
import { makeExposer, type BootContext, type GameContext } from '../../src/app/context.js';
import { EventBus } from '../../src/core/EventBus.js';
import { makeConfig } from '../../src/core/Config.js';
import { makeSyntheticTile } from './helpers.js';
import { Save, SETTINGS_STORAGE_KEY, PROGRESS_STORAGE_KEY } from '../../src/core/Save.js';
import { Input, LEGACY_BINDINGS_STORAGE_KEY } from '../../src/core/Input.js';

function runtimeSetup(state: 'home' | 'dive' = 'home') {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const nodes: Array<{ id: string; removed: boolean; remove(): void }> = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', {
    body: { append: (node: (typeof nodes)[number]) => nodes.push(node) },
    createElement: () => ({
      id: '',
      removed: false,
      append() {},
      setAttribute() {},
      remove() {
        this.removed = true;
      },
    }),
  });
  const tile = makeSyntheticTile({ id: 'lost-city' });
  const load = vi.fn(async (_id: string, _signal?: AbortSignal) => tile);
  const input = { state: {}, sample: vi.fn(() => ({})) };
  const ctx = {
    app: { state },
    params: new URLSearchParams('tile=lost-city&tier=low'),
    tileId: 'lost-city',
    loader: { load },
    bus: new EventBus(),
    config: makeConfig(),
    renderer: {},
    scene: {},
    input,
    sub: { getState: () => ({}), position: {}, velocity: {} },
    ...makeExposer(),
  } as unknown as BootContext;
  const present = () => {
    const [id, callback] = frames.entries().next().value!;
    frames.delete(id);
    callback(100);
  };
  return { ctx, load, tile, nodes, frames, present };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.mocked(createHomeSystems).mockReturnValue([]);
  vi.mocked(createSystems).mockReturnValue([]);
});

describe('runtime startup capability', () => {
  it('presents an interactive Home with no selected-tile load or dive factory call', async () => {
    const h = runtimeSetup();
    const drawn = vi.fn();
    vi.mocked(createHomeSystems).mockReturnValue([
      { name: 'title', frame: { 'render.draw': drawn } },
    ]);
    const dispose = await startRuntime(h.ctx);
    expect(h.load).not.toHaveBeenCalled();
    expect(createSystems).not.toHaveBeenCalled();
    expect(window.__gameReady).toBeUndefined();
    expect(h.nodes).toEqual([]); // No dive loading/briefing surface on Home.
    h.present();
    expect(drawn).toHaveBeenCalledTimes(1);
    expect(window.__gameReady).toBe(true);
    dispose();
    expect(h.frames.size).toBe(0);
  });

  it('keeps loading visible and systems uninitialized until the selected tile arrives', async () => {
    const h = runtimeSetup('dive');
    const held = pending<typeof h.tile>();
    h.load.mockReturnValue(held.promise);
    const init = vi.fn((ctx: GameContext) => {
      ctx.expose({ sub: ctx.sub });
    });
    const draw = vi.fn(() => {
      expect(window.__gameReady).toBeUndefined();
    });
    vi.mocked(createSystems).mockReturnValue([
      { name: 'dive', init, frame: { 'render.draw': draw } },
    ]);
    const ready = vi.fn();
    h.ctx.bus.on('game:ready', ready);
    const result = startRuntime(h.ctx);
    await vi.waitFor(() =>
      expect(h.load).toHaveBeenCalledExactlyOnceWith('lost-city', expect.any(AbortSignal)),
    );
    expect(init).not.toHaveBeenCalled();
    expect(window.__gameReady).toBeUndefined();
    expect(h.nodes[0].id).toBe('startup-loading');
    expect(h.nodes[0].removed).toBe(false);
    held.resolve(h.tile);
    const dispose = await result;
    expect(init).toHaveBeenCalledExactlyOnceWith(h.ctx);
    expect((h.ctx as GameContext).tile).toBe(h.tile);
    expect(window.__gameReady).toBeUndefined();
    expect(ready).not.toHaveBeenCalled();
    expect(h.nodes[0].removed).toBe(false);
    h.present();
    expect(draw).toHaveBeenCalledTimes(1);
    expect(window.__gameReady).toBe(true);
    expect(ready).toHaveBeenCalledExactlyOnceWith({ tileId: 'lost-city' });
    expect(h.nodes[0].removed).toBe(true);
    expect(createHomeSystems).not.toHaveBeenCalled();
    dispose();
  });

  it('aborts page teardown during loading and never installs a late selected tile', async () => {
    const h = runtimeSetup('dive');
    const held = pending<typeof h.tile>();
    h.load.mockReturnValue(held.promise);
    const init = vi.fn();
    vi.mocked(createSystems).mockReturnValue([{ name: 'dive', init }]);
    const result = startRuntime(h.ctx);
    await vi.waitFor(() => expect(h.load).toHaveBeenCalled());
    window.dispatchEvent(new Event('pagehide'));
    expect(h.load.mock.calls[0][1]!.aborted).toBe(true);
    held.resolve(h.tile);
    await result;
    expect(init).not.toHaveBeenCalled();
    expect(h.frames.size).toBe(0);
    expect(h.nodes[0].removed).toBe(true);
    expect(showFatal).not.toHaveBeenCalled();
  });

  it('keeps a cached Home interactive when Back navigation restores the page', async () => {
    const h = runtimeSetup();
    const dispose = await startRuntime(h.ctx);
    const event = new Event('pagehide');
    Object.defineProperty(event, 'persisted', { value: true });
    window.dispatchEvent(event);
    expect(h.frames.size).toBe(1);
    h.present();
    expect(window.__gameReady).toBe(true);
    dispose();
    expect(h.frames.size).toBe(0);
  });

  it('reports a tile failure without starting any dive systems or hiding the error', async () => {
    const h = runtimeSetup('dive');
    h.load.mockRejectedValue(new Error('offline tile'));
    const init = vi.fn();
    vi.mocked(createSystems).mockReturnValue([{ name: 'dive', init }]);
    const error = vi.fn();
    h.ctx.bus.on('tile:error', error);
    await startRuntime(h.ctx);
    expect(init).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledExactlyOnceWith({ id: 'lost-city', error: 'offline tile' });
    expect(showFatal).toHaveBeenCalledExactlyOnceWith(
      'Could not start dive "lost-city": offline tile',
    );
    expect(h.frames.size).toBe(0);
    expect(h.nodes[0].removed).toBe(true);
  });

  it('rolls back a partially initialized runtime system on failure', async () => {
    const h = runtimeSetup('dive');
    const rollback = vi.fn();
    vi.mocked(createSystems).mockReturnValue([
      {
        name: 'dive',
        init() {
          throw new Error('partial');
        },
        dispose: rollback,
      },
    ]);
    await startRuntime(h.ctx);
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(showFatal).toHaveBeenCalledExactlyOnceWith('Could not start dive "lost-city": partial');
    expect(h.frames.size).toBe(0);
  });
});

describe('page boot capability', () => {
  it.each(['empty', 'legacy', 'corrupt'] as const)(
    'boots Home with a %s save and preserves live preferences and controls on the next load',
    async (shape) => {
      runtimeSetup();
      Object.assign(window, {
        location: { search: '', href: 'https://example.test/' },
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 1,
      });
      Object.assign(document, { getElementById: () => ({}), body: { dataset: {} } });
      const values = new Map<string, string>();
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      };
      if (shape === 'legacy') {
        storage.setItem(
          'subexplorer.settings.v2',
          JSON.stringify({
            version: 2,
            graphicsTier: 'low',
            gameplayMode: 'custom',
            captions: true,
            gameplay: {
              speedProfile: 'standard',
              descentProfile: 'research',
              sonarMarkers: false,
              currents: 'gentle',
            },
          }),
        );
        storage.setItem(
          LEGACY_BINDINGS_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            keys: { toggleRov: ['KeyE'], thrustForward: ['KeyI'] },
          }),
        );
        storage.setItem(
          PROGRESS_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            legacyCredited: true,
            points: 10,
            lifetime: 40,
            upgrades: { thrust: 1 },
          }),
        );
      } else if (shape === 'corrupt') {
        for (const key of [SETTINGS_STORAGE_KEY, LEGACY_BINDINGS_STORAGE_KEY, PROGRESS_STORAGE_KEY])
          storage.setItem(key, '{broken');
      }
      const originalLegacy = storage.getItem('subexplorer.settings.v2');
      vi.stubGlobal('localStorage', storage);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          expect(url).toBe('/data/tiles/index.json');
          return { ok: true, json: async () => ({ tiles: [{ id: 'titanic' }] }) };
        }),
      );
      const { boot } =
        await vi.importActual<typeof import('../../src/app/boot.js')>('../../src/app/boot.js');
      const first = await boot();
      expect(first?.app.state).toBe('home');
      expect(first).not.toHaveProperty('tile');
      expect(first?.settings.gameplayMode).toBe(shape === 'legacy' ? 'custom' : 'arcade');
      expect(first?.settings.gameplayBaseMode).toBe('arcade');
      expect(first?.settings.gameplay).not.toHaveProperty('sonarMarkers');
      expect(first?.settings.gameplay).not.toHaveProperty('descentProfile');
      expect(first?.settings.gameplay).not.toHaveProperty('speedProfile');
      if (shape === 'legacy') {
        expect(first?.progress.snapshot().upgrades).toEqual({ thrust: 1 });
        expect(first?.tier).toBe('low');
        expect(first?.settings.gameplay.currents).toBe('realistic');
      }
      const input = new Input({ storage });
      if (shape === 'legacy') expect(input.getAction('thrustForward')?.keys).toEqual(['KeyI']);
      expect(input.getAction('toggleRov' as never)).toBeUndefined();
      input.rebind('thrustForward', ['KeyK']);
      first!.save.setGameplayMode('realistic');
      first!.save.setGameplayOption('batteryOxygen', false);
      first!.save.save({
        graphicsTier: 'medium',
        reduceMotion: true,
        captions: true,
        sonarPalette: 'highContrast',
        uiScale: 120,
      });
      const second = await boot();
      expect(second?.settings).toEqual(first!.save.get());
      expect(second?.tier).toBe('medium');
      expect(second?.effective.gameplay.batteryOxygen).toBe(false);
      expect(second?.effective.speedName).toBe('research');
      expect(new Input({ storage }).getAction('thrustForward')?.keys).toEqual(['KeyK']);
      expect(storage.getItem('subexplorer.settings.v2')).toBe(originalLegacy);
      expect(new Save({ config: makeConfig(), storage }).get()).toEqual(second!.settings);
    },
  );

  it.each(['?tier=low', '?tile=lost-city&tier=low'])(
    'resolves %s without requesting a dive tile before the startup boundary',
    async (search) => {
      runtimeSetup();
      Object.assign(window, {
        location: { search, href: `https://example.test/${search}` },
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 1,
      });
      Object.assign(document, { getElementById: () => ({}), body: { dataset: {} } });
      vi.stubGlobal('localStorage', { getItem: () => null, setItem() {} });
      const fetch = vi.fn(async (url: string) => {
        expect(url).toBe('/data/tiles/index.json');
        return {
          ok: true,
          json: async () => ({ tiles: [{ id: 'titanic' }, { id: 'lost-city' }] }),
        };
      });
      vi.stubGlobal('fetch', fetch);
      const { boot } =
        await vi.importActual<typeof import('../../src/app/boot.js')>('../../src/app/boot.js');
      const ctx = await boot();
      expect(ctx?.app.state).toBe(search.includes('tile=') ? 'dive' : 'home');
      expect(ctx?.tileId).toBe(search.includes('tile=') ? 'lost-city' : 'titanic');
      expect(ctx).not.toHaveProperty('tile');
      expect(ctx).not.toHaveProperty('meta');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(createSystems).not.toHaveBeenCalled();
      expect(window.__gameReady).toBeUndefined();
    },
  );
});
