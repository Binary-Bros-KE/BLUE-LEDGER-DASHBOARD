// Minimal service worker — exists to satisfy PWA installability criteria (some browsers/platforms
// require a registered service worker before showing an install prompt). Deliberately does NOT
// cache API responses or page data: this is an internal admin tool where showing stale tenant or
// billing data would be actively harmful, so every request is passed straight through to the
// network untouched.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No event.respondWith() call — every request behaves exactly as if this worker didn't exist.
});
