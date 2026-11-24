const CACHE_PREFIX = 'tower-blast-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const APP_ROOT = new URL('./', self.registration.scope).href;
const APP_SHELL = [
  APP_ROOT,
  new URL('manifest.webmanifest', APP_ROOT).href
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);

    // Pre-cache the compiled Vite entry point and stylesheet during install.
    // This makes the very first successful online visit usable offline later,
    // without requiring a second page refresh before the assets are cached.
    const page = await fetch(APP_ROOT);
    if (page.ok) {
      const html = await page.text();
      const assetUrls = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map((match) => new URL(match[1], APP_ROOT))
        .filter((url) => url.origin === self.location.origin)
        .filter((url) => url.href.startsWith(APP_ROOT))
        .map((url) => url.href);

      await cache.addAll([...new Set(assetUrls)]);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(APP_ROOT);
        })
    );
    return;
  }

  // Serve the versioned Vite bundle from cache after its initial precache.
  if (url.pathname.includes('/assets/') || url.pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
