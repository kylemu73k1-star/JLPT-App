// JLPT Journey Service Worker — auto-updating
// Checks for updates every time the app is opened.
// No manual version bumping needed.

const CACHE_NAME = "jlpt-journey-auto";
const BASE = "/JLPT-App";

const FILES_TO_CACHE = [
  BASE + "/",
  BASE + "/index.html",
  BASE + "/manifest.json",
  BASE + "/icon-192.png",
  BASE + "/icon-512.png"
];

// Install: cache all files on first install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML (always gets latest), cache-first for assets
self.addEventListener("fetch", event => {
  // Never intercept Anthropic API calls
  if (event.request.url.includes("anthropic.com")) return;

  const url = new URL(event.request.url);
  const isHTML = event.request.destination === "document" ||
                 url.pathname.endsWith(".html") ||
                 url.pathname.endsWith("/");

  if (isHTML) {
    // Network first: always try to get the latest HTML
    // Falls back to cache if offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) throw new Error("bad response");
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for assets, update in background
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});

// Allow pages to trigger a skip-waiting if a new SW is ready
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
