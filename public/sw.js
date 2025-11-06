self.addEventListener('install', event => {
  console.log('Service Worker installed');
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated');
});

self.addEventListener('fetch', event => {
  // İsteğe bağlı offline caching:
  // event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
