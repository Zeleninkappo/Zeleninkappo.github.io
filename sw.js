importScripts('config.js'); // Načte APP_VERSION

const CACHE_NAME = `zelix-v${APP_VERSION}`; 

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './data.js',
  './logic.js',
  './ui.js',
  './manifest.json',
  './README.md'
];

// Instalace Service Workeru a cachování souborů
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Aktivace a vymazání staré cache (pokud změníš verzi)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// Interceptování požadavků (Offline first strategie)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
