// Service worker: appka se otevře i bez signálu (data z Microsoftu se ale načtou až online).
const CACHE = 'ukolnicek-1.3.0';
const SHELL = [
  './', 'index.html', 'config.js', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/core.js', 'js/csv.js', 'js/dny.js', 'js/store-demo.js', 'js/store-sp.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'data/akce-2026-27.csv', 'data/ukoly-navrh-2026-27.csv',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Microsoft Graph a přihlášení nikdy z mezipaměti
  // nejdřív síť (ať se nová verze projeví hned), bez signálu mezipaměť
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))),
  );
});
