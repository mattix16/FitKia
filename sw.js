const CACHE = 'fitkia-static-v1'; // cambia il numero a ogni release
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', // TODO: './styles.css' quando compilerai Tailwind (M4)
  './src/main.js', './src/config.js', './src/nutrition.js', './src/validation.js',
  './src/storage.js', './src/store.js', './src/ui/onboarding.js', './src/ui/dashboard.js',
  // TODO: Mattia, aggiungi icone e font self-hosted (.woff2)
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', event => {
  // TODO: Mattia, elimina le cache vecchie: caches.keys() -> filtra chi non è CACHE -> caches.delete()
  //       Ricorda event.waitUntil(...)
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Strategia attuale: cache-first. TODO: Mattia,
  //  1) richieste di navigazione offline -> fallback a './index.html'
  //  2) richieste a API esterne (Open Food Facts) -> network-first con fallback cache
  event.respondWith(caches.match(event.request).then(hit => hit ?? fetch(event.request)));
});