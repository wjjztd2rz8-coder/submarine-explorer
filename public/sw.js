/**
 * Service worker (F1-TOUCH). The build (`tools/pwaPlugin.ts`) replaces the two
 * placeholders below: VERSION changes whenever the app shell changes, and
 * PRECACHE lists the shell files relative to this file's scope, so the same
 * worker works at `/` and under a GitHub Pages base such as `/submarine-explorer/`.
 *
 * - index.html / navigations: network first, cache as the offline fallback.
 * - Precached shell (hashed JS and CSS, icons, manifest): cache first.
 * - Tiles (`data/tiles/<id>/...`): cache first in a cache that survives deploys
 *   (a tile id is immutable). `data/tiles/index.json` is stale-while-revalidate.
 * - Other same-origin assets (models, textures, decoders): cache first, in a
 *   cache tied to VERSION so a deploy refreshes them.
 * A new deploy installs beside the old worker, takes over at once and deletes
 * the old versioned caches.
 */
const VERSION = '__SW_VERSION__';
const scope = self.registration.scope;

/** Development (no build): the placeholders are untouched; do nothing. */
const ACTIVE = !VERSION.startsWith('__');
const PRECACHE = ACTIVE ? JSON.parse('__SW_PRECACHE__') : [];
// CacheStorage is origin-wide; two project installs must not delete each
// other's versioned shell or assets. Tile keys already include the full URL.
const PREFIX = `subexp-${encodeURIComponent(new URL(scope).pathname)}-`;
const SHELL = `${PREFIX}shell-${VERSION}`;
const ASSETS = `${PREFIX}assets-${VERSION}`;
const TILES = 'subexp-tiles-v1';

self.addEventListener('install', (event) => {
  if (!ACTIVE) return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Keep the previous worker if any shell file is unavailable. Activating
      // a partial shell would discard the only complete offline version.
      await Promise.all(
        PRECACHE.map((path) => cache.add(new Request(new URL(path, scope), { cache: 'reload' }))),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  if (!ACTIVE) return;
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== SHELL && key !== ASSETS && key !== TILES)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function store(cache, request, response) {
  try {
    await cache.put(request, response.clone());
  } catch {
    // Quota exhaustion must not turn a successful network read into a failure.
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) await store(cache, request, res);
    else {
      const hit = (await cache.match(request)) || (await cache.match(new URL('./', scope).href));
      if (hit) return hit;
    }
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) || (await cache.match(new URL('./', scope).href));
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.status === 200) await store(cache, request, res);
  return res;
}

function staleWhileRevalidate(request, cacheName, event) {
  const opened = caches.open(cacheName);
  const fresh = opened.then(async (cache) => {
    try {
      const res = await fetch(request);
      if (res.ok) await store(cache, request, res);
      return res;
    } catch {
      return null;
    }
  });
  // Attach synchronously: a cached response can finish before the refresh.
  event.waitUntil(fresh.then(() => {}));
  return opened.then(
    async (cache) => (await cache.match(request)) || (await fresh) || Response.error(),
  );
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!ACTIVE || request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(scope)) return;
  const rel = url.href.slice(scope.length);

  if (request.mode === 'navigate' || rel === '' || rel === 'index.html') {
    event.respondWith(networkFirst(request, SHELL));
  } else if (rel === 'data/tiles/index.json') {
    event.respondWith(staleWhileRevalidate(request, TILES, event));
  } else if (rel.startsWith('data/tiles/')) {
    event.respondWith(cacheFirst(request, TILES));
  } else if (PRECACHE.includes(rel)) {
    event.respondWith(cacheFirst(request, SHELL));
  } else if (!rel.endsWith('.map')) {
    event.respondWith(cacheFirst(request, ASSETS));
  }
});
