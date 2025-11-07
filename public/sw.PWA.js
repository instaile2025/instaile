// public/sw.PWA.js dosyasının tam içeriği

// 1. ADIM: OneSignal'ın Service Worker'ını buraya ithal (import) ediyoruz
// Bu satır MUTLAKA en üstte olmalı
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');


// --- Sizin mevcut PWA kodunuz buradan başlıyor ---

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