const CACHE_NAME = "crm-cache-v1";

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

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(
                    urlsToCache
                );
            })
    );
});

// FETCH
self.addEventListener("fetch", event => {

    event.respondWith(

        caches.match(event.request)
            .then(response => {

                return response ||
                    fetch(event.request);
            })
    );
});