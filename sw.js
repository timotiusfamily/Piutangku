const CACHE_NAME = 'piutang-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './logo1.png',
  // external libs (allow network fallback)
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if(k !== CACHE_NAME) return caches.delete(k);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Allow firebase and other dynamic network calls to pass (network-first)
  if(url.origin !== location.origin){
    return event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
  }
  event.respondWith(
    caches.match(event.request).then(cacheRes => cacheRes || fetch(event.request).then(fetchRes => {
      // cache GET requests
      if(event.request.method === 'GET'){
        const copy = fetchRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return fetchRes;
    })).catch(()=>caches.match('./index.html'))
  );
});

