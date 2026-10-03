// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const template = readFileSync('public/sw.js', 'utf8');
const defaultScope = 'https://example.test/submarine-explorer/';
const keyOf = (request: Request | string) => (typeof request === 'string' ? request : request.url);

function worker(scope = defaultScope, active = true) {
  const handlers = new Map<string, (event: unknown) => void>();
  const entries = new Map<string, Map<string, Response>>();
  const put = vi.fn(
    async (cache: Map<string, Response>, request: Request | string, response: Response) => {
      cache.set(keyOf(request), response);
    },
  );
  const add = vi.fn(async (_request: Request) => {});
  const caches = {
    open: vi.fn(async (name: string) => {
      if (!entries.has(name)) entries.set(name, new Map());
      const values = entries.get(name)!;
      return {
        match: async (request: Request | string) => values.get(keyOf(request))?.clone(),
        put: (request: Request | string, response: Response) => put(values, request, response),
        add,
      };
    }),
    keys: async () => [...entries.keys()],
    delete: vi.fn(async (name: string) => entries.delete(name)),
  };
  const self = {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    addEventListener: (name: string, handler: (event: unknown) => void) =>
      handlers.set(name, handler),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
  };
  const fetch = vi.fn(async (_request: Request, _options?: RequestInit) => new Response('fresh'));
  const source = active
    ? template
        .replace('__SW_VERSION__', 'test')
        .replace('__SW_PRECACHE__', JSON.stringify(['', 'index.html', 'app.js']))
    : template;
  runInNewContext(source, { self, caches, fetch, Request, Response, URL });
  const prefix = `subexp-${encodeURIComponent(new URL(scope).pathname)}-`;
  function dispatch(name: string, request?: Request) {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers.get(name)!({
      request,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => {
        response = promise;
      },
    });
    return { pending, response };
  }
  const seed = async (name: string, path: string, text: string) => {
    const cache = await caches.open(name === 'tiles-v1' ? 'subexp-tiles-v1' : `${prefix}${name}`);
    await cache.put(new URL(path, scope).href, new Response(text));
  };
  return { dispatch, seed, prefix, entries, caches, self, fetch, put, add };
}

describe('offline service worker', () => {
  it('leaves the unstamped development worker inert without parsing the placeholder', () => {
    const sw = worker(defaultScope, false);
    for (const event of ['install', 'activate', 'fetch']) {
      const result = sw.dispatch(event, new Request(defaultScope));
      expect(result.pending).toEqual([]);
      expect(result.response).toBeUndefined();
    }
    expect(sw.self.clients.claim).not.toHaveBeenCalled();
  });

  it('requires every shell file before replacing the previous offline worker', async () => {
    const sw = worker();
    sw.add.mockRejectedValueOnce(new Error('missing chunk'));
    await expect(Promise.all(sw.dispatch('install').pending)).rejects.toThrow('missing chunk');
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    await Promise.all(sw.dispatch('install').pending);
    expect(sw.self.skipWaiting).toHaveBeenCalledOnce();
  });

  it.each(['https://example.test/', defaultScope])(
    'uses the cached shell for a new offline navigation at %s',
    async (scope) => {
      const sw = worker(scope);
      await sw.seed('shell-test', '', 'offline shell');
      sw.fetch.mockRejectedValue(new Error('offline'));
      const request = new Request(`${scope}?tile=titanic`);
      Object.defineProperty(request, 'mode', { value: 'navigate' });
      const res = await sw.dispatch('fetch', request).response!;
      expect(await res.text()).toBe('offline shell');
    },
  );

  it('falls back to the shell during a server outage', async () => {
    const sw = worker();
    await sw.seed('shell-test', '', 'offline shell');
    sw.fetch.mockResolvedValue(new Response('unavailable', { status: 503 }));
    const res = await sw.dispatch('fetch', new Request(defaultScope)).response!;
    expect(await res.text()).toBe('offline shell');
  });

  it.each(['https://example.test/', defaultScope])(
    'preserves the installed offline shell when a new deploy serves navigation HTML at %s',
    async (scope) => {
      const sw = worker(scope);
      await sw.seed('shell-test', '', '<script src="app.js"></script>');
      await sw.seed('shell-test', 'app.js', 'installed chunk');
      sw.fetch.mockResolvedValueOnce(new Response('<script src="new-deploy.js"></script>'));
      expect(await (await sw.dispatch('fetch', new Request(scope)).response!).text()).toContain(
        'new-deploy.js',
      );
      sw.fetch.mockRejectedValue(new Error('offline before next worker installs'));
      const offline = await sw.dispatch('fetch', new Request(scope)).response!;
      expect(await offline.text()).toBe('<script src="app.js"></script>');
      expect(
        await (await sw.dispatch('fetch', new Request(`${scope}app.js`)).response!).text(),
      ).toBe('installed chunk');
    },
  );

  it('bypasses the HTTP cache when filling a new deployment mutable-asset cache', async () => {
    const sw = worker();
    const request = new Request(`${defaultScope}data/landmarks/titanic/mission.json`);
    sw.fetch.mockImplementation(
      async (_request, options) =>
        new Response(
          options?.cache === 'reload' ? 'new deployment mission' : 'previous deployment HTTP cache',
        ),
    );
    expect(await (await sw.dispatch('fetch', request).response!).text()).toBe(
      'new deployment mission',
    );
    expect(sw.fetch).toHaveBeenCalledWith(request, { cache: 'reload' });
    sw.fetch.mockClear();
    expect(await (await sw.dispatch('fetch', request).response!).text()).toBe(
      'new deployment mission',
    );
    expect(sw.fetch).not.toHaveBeenCalled();
  });

  it('refreshes a queried tile index instead of treating it as an immutable tile', async () => {
    const sw = worker();
    const path = 'data/tiles/index.json?catalog=1';
    await sw.seed('tiles-v1', path, 'stale');
    const request = new Request(`${defaultScope}${path}`);
    const result = sw.dispatch('fetch', request);
    expect(result.pending).toHaveLength(1);
    expect(await (await result.response!).text()).toBe('stale');
    await Promise.all(result.pending);
    expect(sw.fetch).toHaveBeenCalledWith(request, { cache: 'reload' });
  });

  it('keeps tile-index refresh and its cache write alive after returning a stale hit', async () => {
    const sw = worker();
    await sw.seed('tiles-v1', 'data/tiles/index.json', 'stale');
    let finish!: (response: Response) => void;
    sw.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const result = sw.dispatch('fetch', new Request(`${defaultScope}data/tiles/index.json`));
    expect(result.pending).toHaveLength(1);
    expect(await (await result.response!).text()).toBe('stale');
    finish(new Response('fresh index'));
    await Promise.all(result.pending);
    expect(
      await sw.entries.get('subexp-tiles-v1')!.get(`${defaultScope}data/tiles/index.json`)!.text(),
    ).toBe('fresh index');
  });

  it('serves a downloaded tile without using the network', async () => {
    const sw = worker();
    await sw.seed('tiles-v1', 'data/tiles/titanic/heightmap.bin', 'tile');
    sw.fetch.mockRejectedValue(new Error('offline'));
    const result = sw.dispatch(
      'fetch',
      new Request(`${defaultScope}data/tiles/titanic/heightmap.bin`),
    );
    expect(await (await result.response!).text()).toBe('tile');
    expect(sw.fetch).not.toHaveBeenCalled();
  });

  it('refreshes mutable landmark content instead of reusing the permanent legacy tile cache', async () => {
    const sw = worker();
    const path = 'data/landmarks/titanic/mission.json';
    await sw.seed('tiles-v1', path, 'legacy mission');
    const result = sw.dispatch('fetch', new Request(`${defaultScope}${path}`));
    expect(await (await result.response!).text()).toBe('fresh');
    expect(sw.fetch).toHaveBeenCalledOnce();
    expect(sw.entries.get(`${sw.prefix}assets-test`)!.has(`${defaultScope}${path}`)).toBe(true);
  });

  it.each(['app.js', 'data/tiles/new/meta.json', 'data/tiles/index.json', 'index.html'])(
    'returns online %s even when cache storage is full',
    async (path) => {
      const sw = worker();
      sw.put.mockRejectedValue(new Error('quota exceeded'));
      const result = sw.dispatch('fetch', new Request(new URL(path, defaultScope)));
      expect(await (await result.response!).text()).toBe('fresh');
      await Promise.all(result.pending);
    },
  );

  it('only cleans obsolete caches belonging to its own deployment base', async () => {
    const sw = worker();
    const keep = [
      `${sw.prefix}shell-test`,
      `${sw.prefix}assets-test`,
      'subexp-tiles-v1',
      'subexp-shell-legacy',
      'subexp-%2Fother%2F-shell-old',
      'unrelated',
    ];
    for (const name of [...keep, `${sw.prefix}shell-old`]) sw.entries.set(name, new Map());
    await Promise.all(sw.dispatch('activate').pending);
    expect(await sw.caches.keys()).toEqual(keep);
    expect(sw.self.clients.claim).toHaveBeenCalledOnce();
  });

  it('passes cross-origin, outside-scope, non-GET and range requests through', () => {
    const sw = worker();
    for (const request of [
      new Request('https://other.test/app.js'),
      new Request('https://example.test/other/app.js'),
      new Request(defaultScope, { method: 'POST' }),
      new Request(`${defaultScope}asset.bin`, { headers: { range: 'bytes=0-3' } }),
    ]) {
      expect(sw.dispatch('fetch', request).response).toBeUndefined();
    }
    expect(sw.fetch).not.toHaveBeenCalled();
  });
});
