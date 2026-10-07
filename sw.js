/*
 * Service worker: keeps the app usable offline.
 *
 * Page, manifest and icons: network first. Online you always get the current version;
 * offline, on a server error or when the network takes longer than NETWORK_TIMEOUT,
 * the cached copy is served. Versioned scripts and styles (?v=<hash>, see Dockerfile)
 * never change, so they are served from the cache first.
 *
 * In a versioned build the cached page and the cached files always come from the same
 * install, so the offline copy never pairs a page with scripts it does not have. An
 * unversioned copy (e.g. GitHub Pages) refreshes the cache with every response instead.
 */
'use strict';

// Replaced with a content hash when the Docker image is built (see Dockerfile);
// the page then loads the same versioned files, e.g. app.js?v=<hash>
const VERSION = 'dev';
const PREFIX = 'nitrox-app-';
const CACHE = `${PREFIX}${VERSION}`;
const V = VERSION === 'dev' ? '' : `?v=${VERSION}`;
const NETWORK_TIMEOUT = 3000; // ms
const ASSETS = [
  './',
  'index.html',
  'style.css' + V,
  'app.js' + V,
  'blend.js' + V,
  'thermo.js' + V,
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Past the browser's HTTP cache, so a new version really stores new files (icons
      // are cached by the browser for days)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Only our own older caches: other apps on the same origin keep theirs
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigate = request.mode === 'navigate';

  // A versioned script or style never changes: answering from the cache means a slow
  // network can neither mix an old script into a new page nor store one version
  // under another's URL
  if (!navigate && url.searchParams.has('v')) {
    event.respondWith(cacheFirst(event, request));
    return;
  }

  const network = fetch(request);
  // Refresh the cache with good responses, even when we answer from the cache. In a
  // versioned build the page itself stays as installed (see above).
  const page = navigate || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (!(V && page)) {
    event.waitUntil(
      network
        .then(async (response) => {
          if (!response.ok) return;
          const copy = response.clone(); // before the page starts reading the body
          const cache = await caches.open(CACHE);
          await cache.put(request, copy);
        })
        .catch(() => {})
    );
  }
  event.respondWith(respond(request, network, navigate));
});

async function cacheFirst(event, request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) event.waitUntil(cache.put(request, response.clone()));
    return response;
  } catch (error) {
    // Offline without this exact version: an older one beats a page without scripts
    const older = await cache.match(request, { ignoreSearch: true });
    if (older) return older;
    throw error;
  }
}

async function respond(request, network, navigate) {
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
  let response;
  try {
    response = await Promise.race([network, timeout]);
  } catch (_) {
    // offline: answer from the cache
  }
  // A server error (e.g. 521 while the container restarts) falls back to the cached
  // copy; redirects and 404 are passed on as they are
  if (response && response.status < 500) return response;
  const cache = await caches.open(CACHE);
  const cached =
    (await cache.match(request, { ignoreSearch: navigate })) || (navigate ? await cache.match('./') : undefined);
  return cached || response || network;
}
