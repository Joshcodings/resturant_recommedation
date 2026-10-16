// TasteMatch Service Worker for offline data caching
const CACHE_NAME = 'tastematch-cache-v2';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/data/manifest.json',
  '/data/country_city_index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_URLS).catch(() => {
        // Soft fail if offline during install
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass service worker for Vite dev server internals and HMR
  if (url.pathname.startsWith('/@') || url.pathname.includes('node_modules')) {
    return;
  }

  // Network-first strategy for page navigations to always load freshest assets
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        })
        .catch(() => caches.match(event.request).then((res) => res || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first strategy for static assets and data shards
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((networkRes) => {
          if (!networkRes || networkRes.status !== 200) {
            return networkRes;
          }
          if (event.request.url.includes('/data/') || event.request.url.includes('/assets/')) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkRes;
        })
        .catch(() => cached);
    })
  );
});
