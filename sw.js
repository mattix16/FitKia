// Service Worker di Fitkia. Cambia VERSION a ogni release: è ciò che fa arrivare gli aggiornamenti agli utenti.
const VERSION = 'v16';
const CACHE = `fitkia-${VERSION}`;

// App shell: tutto ciò che serve per aprire l'app senza rete.
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './app.css',
  './src/main.js', './src/config.js', './src/nutrition.js', './src/validation.js',
  './src/storage.js', './src/store.js', './src/log.js', './src/router.js', './src/profile.js', './src/id.js', './src/habits.js', './src/backup.js', './src/ui/nav.js', './src/ui/forms.js', './src/ui/toast.js', './src/ui/settings.js', './src/ui/format.js', './src/ui/icons.js', './src/ui/diary.js', './src/ui/history.js', './src/ui/water.js', './src/ui/weight.js', './src/ui/supplements.js', './src/data/foods.js',
  './src/ui/onboarding.js', './src/ui/dashboard.js', './src/ui/meals.js', './src/ui/foodPanel.js', './src/meta.js', './src/ui/notices.js', './src/native.js', './src/keyboard.js', './src/ui/keyboard.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
];

// Nessun CDN: gli stili sono app.css (compilato da Tailwind, vedi npm run build:css) e i font sono quelli di sistema.
// Tutto ciò che serve è nel precache: anche il PRIMO avvio funziona senza rete.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE); // se un file manca l'installazione fallisce: meglio accorgersene subito
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Elimina le cache delle versioni precedenti: senza questo si accumulano per sempre.
    await Promise.all(keys.filter(key => key.startsWith('fitkia-') && key !== CACHE).map(key => caches.delete(key)));
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const origin = new URL(request.url).origin;
  // Altre origini (es. API Open Food Facts, in futuro): non si intercettano qui.
  if (origin !== self.location.origin) return;

  // Aprire la pagina offline: prima la cache, poi index.html, poi la rete.
  if (request.mode === 'navigate') {
    event.respondWith((async () => (await caches.match(request)) ?? (await caches.match('./index.html')) ?? fetch(request))());
    return;
  }

  // Tutto il resto: cache-first. Se non c'è, rete, e la risposta si salva per la prossima volta.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});