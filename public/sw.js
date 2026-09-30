/**
 * Made Store Spin Wheel - Service Worker
 * Enables 100% offline capability for college expo booths and mobile devices.
 */

const CACHE_NAME = 'made-store-spin-v1';

// Critical app shell assets to precache
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './logo.png',
  './manifest.webmanifest',
  './manifest.json',
  './favicon.png',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Install Event: Precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Precache core local assets
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Precache non-fatal warning:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Put fresh copy in cache
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline: Serve cached app shell index.html
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('./index.html') || await cache.match('./') || await cache.match('/');
          return cachedResponse || new Response('Offline - Made Store Spin Wheel', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Handle fonts, styles, scripts, images: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, we're offline
          return null;
        });

      // If cached response exists, return it immediately while fetching update in background
      // Otherwise wait for network fetch
      return cachedResponse || fetchPromise.then((res) => {
        if (res) return res;
        // If offline and request is an image, fallback gracefully
        if (request.destination === 'image') {
          return caches.match('./icons/icon-192.png');
        }
        return new Response('Network error occurred', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// Message listener to trigger skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
