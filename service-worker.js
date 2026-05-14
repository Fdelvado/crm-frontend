const CACHE_NAME = "crm-cache-v999";

const urlsToCache = [
    "/",
    "/clientes.html",
    "/css/global.css",
    "/js/app.js",
    "/logo192.png",
    "/logo512.png",
    "/manifest.json"
];

// INSTALAR
self.addEventListener("install", event => {

    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

// ACTIVAR
self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys().then(keys => {

            return Promise.all(

                keys.map(key => {

                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }

                })
            );

        })
    );

    self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {

    // ❌ NO CACHEAR PETICIONES API
    if (
        event.request.url.includes("railway.app") ||
        event.request.url.includes("/solicitudes") ||
        event.request.url.includes("/auth")
    ) {
        return;
    }

    event.respondWith(

        caches.match(event.request)
            .then(response => {

                return response || fetch(event.request);

            })
    );
});