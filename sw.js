// Cartabase service worker.
// Precaches the whole app — including the ~12MB OCR engine — so that
// after the first successful load (which needs internet once), the
// app works completely offline: no server, no CDN, nothing.

const CACHE_NAME = 'cartabase-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/ui-helpers.js',
  './js/settings.js',
  './js/db.js',
  './js/color-detect.js',
  './js/plate-ocr.js',
  './js/analyzer.js',
  './js/database-view.js',
  './js/capture-view.js',
  './js/settings-view.js',
  './js/app.js',
  './vendor/tesseract/tesseract.min.js',
  './vendor/tesseract/worker.min.js',
  './vendor/tesseract/tesseract-core-lstm.wasm.js',
  './vendor/tesseract/tesseract-core-simd-lstm.wasm.js',
  './tessdata/eng.traineddata',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first: this app's assets don't change unless you redeploy a
// new version (which bumps CACHE_NAME above), so prefer the fast,
// offline-safe local copy over a network round-trip.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Don't try to cache cross-origin (e.g. the optional vision API) responses.
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
