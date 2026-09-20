const CACHE_NAME = 'flow-app-shell-v2';
const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/favicon.svg', '/logo.jpg', '/icon-192.png', '/icon-512.png'];

const cacheAppShell = async () => {
  const cache = await caches.open(CACHE_NAME);
  const indexResponse = await fetch('/index.html', { cache: 'no-store' });
  if (!indexResponse.ok) throw new Error('Could not cache the Flow app shell.');

  const indexText = await indexResponse.clone().text();
  await cache.put('/index.html', indexResponse);

  const assetUrls = [...indexText.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'))
    .map((url) => url.pathname);

  await Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset)));
  await Promise.allSettled([...new Set(assetUrls)].map((asset) => cache.add(asset)));
};

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('flow-app-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});
