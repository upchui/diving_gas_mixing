/*
 * Service worker: keeps the app usable offline.
 *
 * Network first: online you always get the current version and the cache is
 * refreshed with every response; offline (or when the network takes longer
 * than NETWORK_TIMEOUT) the cached copy is served. New releases therefore
 * arrive without bumping a version number.
 */
'use strict';

const CACHE = 'nitrox-app-v1';
const NETWORK_TIMEOUT = 3000; // ms
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'blend.js',
  'thermo.js',
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
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const network = fetch(request);
  // Refresh the cache with every good response, even when we answer from the cache
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
  event.respondWith(respond(request, network));
});

async function respond(request, network) {
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch (_) {
    // offline: answer from the cache
  }
  const cache = await caches.open(CACHE);
  const cached =
    (await cache.match(request, { ignoreSearch: true })) ||
    (request.mode === 'navigate' ? await cache.match('./') : undefined);
  return cached || network;
}
