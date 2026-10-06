// ============================================================
// sw.ps1 (Service Worker for Progressive Web Apps)
// ============================================================

const CACHE_NAME = "kit-crew-todo-v2026-10-06-1";
const SORTABLE_URL = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/Sortable.min.js";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./assets/favicon.svg",
    "./assets/icon-192.png",
    "./assets/icon-512.png",
    "./css/styles-borders.css",
    "./css/styles.css",
    "./js/app.js",
    "./js/parser.js",
    "./js/store.js",
    "./js/timer.js",
    "./js/ui.js",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(APP_SHELL);

            try {
                const response = await fetch(SORTABLE_URL, { mode: "no-cors" });
                await cache.put(SORTABLE_URL, response);
            } catch {
                // The app still works without offline drag-and-drop caching.
            }

            await self.skipWaiting();
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => caches.match("./index.html")),
        );
        return;
    }

    if (requestUrl.origin === self.location.origin) {
        event.respondWith(
            (async () => {
                try {
                    const response = await fetch(event.request);
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, response.clone());
                    return response;
                } catch {
                    return caches.match(event.request);
                }
            })(),
        );
        return;
    }

    if (event.request.url === SORTABLE_URL) {
        event.respondWith(
            caches.match(event.request).then((cached) => cached || fetch(event.request)),
        );
    }
});
