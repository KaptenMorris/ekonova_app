
const CACHE_NAME = 'ekonova-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json',
  // Consider adding other critical static assets here
  // For example, main CSS file if its name is predictable, or key UI images.
  // Be cautious with caching dynamically generated or hashed Next.js assets directly.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache urls during install:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache - fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Optional: Cache the new resource if needed
            // Be careful what you cache here dynamically, especially for non-GET requests or API calls
            // if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME).then((cache) => {
            //     cache.put(event.request, responseToCache);
            //   });
            // }
            return networkResponse;
          }
        ).catch((error) => {
          console.error('Service Worker: Fetch failed; returning offline page instead.', error);
          // Optional: return a custom offline page if one is cached
          // return caches.match('/offline.html'); 
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
