// Somnus Service Worker
// ⚠ Bump CACHE_VERSION on every deploy — this is what forces iOS to pick up changes.
const CACHE_VERSION = 'somnus-v22';
const STATIC_ASSETS = ['./manifest.json', './icon-192.png', './icon-512.png'];

// Install: pre-cache static assets only (not index.html)
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate: delete all old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - index.html → network-first (always try fresh; fall back to cache if offline)
// - everything else → cache-first (icons, manifest don't change often)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHtml = url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname === url.origin + '/';

  if (isHtml) {
    // Network-first for the app shell
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first for static assets
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
});
