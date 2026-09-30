/// <reference lib="webworker" />
/* Offline shell and assets are tied to one production release. */
const CACHE = "teaposters-__BUILD_VERSION__";
const BUILD_ASSETS = /* __BUILD_ASSETS__ */ [];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([
    "/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
    "/icons/apple-touch-icon.png", ...BUILD_ASSETS,
  ])));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("teaposters-") && key !== CACHE)
      .map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

async function remember(request, response) {
  if (!response.ok) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
  } catch {
    // Quota or storage restrictions must not break an online response.
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) {
          event.waitUntil(remember(request, response.clone()));
          return response;
        }
        return (await cache.match(request)) || (await cache.match("/")) || response;
      } catch {
        return (await cache.match(request)) || (await cache.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Keep dynamic requests (including Next's RSC requests) out of static caches.
  if (!url.pathname.startsWith("/_next/static/") && !url.pathname.startsWith("/icons/") && url.pathname !== "/manifest.webmanifest") return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    event.waitUntil(remember(request, response.clone()));
    return response;
  })());
});
