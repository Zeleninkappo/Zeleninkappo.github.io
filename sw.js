importScripts('config.js'); // Načte APP_VERSION

const CACHE_STATIC = `zelix-static-v${APP_VERSION}`;
const CACHE_RUNTIME = `zelix-runtime-v${APP_VERSION}`;
const CURRENT_CACHES = [CACHE_STATIC, CACHE_RUNTIME];

// Jen lokální assety (cross-origin CDN necachujeme přes addAll - opaque
// response by mohl shodit celou instalaci; prohlížeč si CDN cachuje sám přes HTTP cache).
const APP_SHELL = [
    './',
    './index.html',
    './style.css',
    './config.js',
    './utils.js',
    './data.js',
    './logic.js',
    './ui.js',
    './manifest.json',
    './offline.html'
];

// --- INSTALACE ---
self.addEventListener('install', (e) => {
    self.skipWaiting(); // Nová verze se nečeká, přebere kontrolu hned po activate
    e.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(APP_SHELL))
            .catch((err) => console.warn('Zelix SW: Instalace cache selhala', err))
    );
});

// --- AKTIVACE: úklid starých cache verzí ---
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// --- Ruční vynucení aktualizace z UI (tlačítko "Nová verze") ---
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// --- FETCH STRATEGIE ---
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

    if (isHTML) {
        // NETWORK-FIRST pro dokumenty: uživatel vždy dostane nejnovější layout,
        // pokud je online. Offline fallback na cache, pak na offline.html.
        // Tohle přímo řeší bug "napůl vykreslené UI" - stará poškozená
        // verze v cache se už nikdy nezobrazí, pokud je síť dostupná.
        e.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
                    return res;
                })
                .catch(() =>
                    caches.match(req).then((cached) => cached || caches.match('./offline.html'))
                )
        );
        return;
    }

    // STALE-WHILE-REVALIDATE pro statické assety (JS/CSS/ikony):
    // okamžitě vrátí cache (rychlost), na pozadí stáhne novou verzi pro příště.
    e.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && res.type !== 'opaque') {
                        const copy = res.clone();
                        caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
