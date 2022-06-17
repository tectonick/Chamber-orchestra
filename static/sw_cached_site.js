const cacheName = 'v1';

// Call Install Event
self.addEventListener('install', () => {
});

// Call Activate Event
self.addEventListener('activate', e => {
  // Remove unwanted caches
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== cacheName) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Call Fetch Event
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(async (res) => {
        // Make copy/clone of response
        const resClone = res.clone();
        // Open cahce
        caches.open(cacheName).then(async cache => {
          // Add response to cache
            cache.put(e.request, resClone).catch(err => {err});
        });
        return res;
      })
      .catch(() => caches.match(e.request).then(res => res))
  );
});
