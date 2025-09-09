const CACHE_NAME = 'catalogo-almoxerifado-v3';
const urlsToCache = [
  '/',
  '/styles.css',
  '/app.js',
  '/icons/FAVICON.jpg'
];

// Install event
self.addEventListener('install', event => {
  console.log('SW: Installing v3...');
  self.skipWaiting(); // Force immediate activation
});

// Activate event
self.addEventListener('activate', event => {
  console.log('SW: Activating v3...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('SW: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - MINIMAL INTERVENTION
self.addEventListener('fetch', event => {
  // Don't intercept manifest.json or sw.js
  if (event.request.url.includes('manifest.json') || 
      event.request.url.includes('sw.js')) {
    console.log('SW: Skipping interception for:', event.request.url);
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
