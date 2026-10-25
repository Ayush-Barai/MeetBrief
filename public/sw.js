/* MeetBrief AI service worker — safe static caching only. */
const VERSION = "meetbrief-v2";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_CACHE = `${VERSION}-offline`;

const PRECACHE = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const STATIC_DESTINATIONS = new Set(["style", "script", "font", "image"]);

function isCacheableAsset(request, url) {
  if (!STATIC_DESTINATIONS.has(request.destination)) {
    return url.pathname.startsWith("/icons/");
  }
  // Next.js build assets are content-hashed and safe to cache. Everything else
  // (HTML, API data, share pages) stays network-only.
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private application data, API responses, share pages or audio.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/share/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/meetings") ||
    url.pathname.startsWith("/setup")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline")
          .then((cached) => cached ?? new Response("You are offline.", { status: 503 })),
      ),
    );
    return;
  }

  if (isCacheableAsset(request, url)) {
    // Network-first: always try the network so deploys are picked up, then fall
    // back to the cached copy when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached ?? Response.error()),
        ),
    );
  }
});
