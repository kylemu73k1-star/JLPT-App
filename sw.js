// JLPT Journey Service Worker
// Every time you update your app, bump this version number (e.g. "v2", "v3")
// That forces the phone to download the new version automatically
const CACHE_NAME = "jlpt-journey-v2";

// These are the files we cache so the app works with no internet
const FILES_TO_CACHE = [
  "/JLPT-App/",
  "/JLPT-App/index.html",
  "/JLPT-App/manifest.json",
  "/JLPT-App/icon-192.png",
  "/JLPT-App/icon-512.png"
];

// Install: cache all files when the PWA is first installed
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Activate immediately, don't wait for old tabs to close
  self.skipWaiting();
});

// Activate: delete any old caches from previous versions
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
// This is what makes the app work offline
self.addEventListener("fetch", event => {
  // Don't intercept API calls to Anthropic — those need the real network
  if (event.request.url.includes("anthropic.com")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Not in cache — fetch from network and cache it for next time
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
