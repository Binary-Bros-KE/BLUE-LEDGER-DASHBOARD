// Minimal service worker — exists to satisfy PWA installability criteria. Chrome's Android install
// check specifically wants a fetch handler that calls respondWith(), not just a registered handler —
// an empty listener (no respondWith at all) is what this file used to have, and is the likely reason
// Chrome downgraded this origin to "Create shortcut only" after an install/uninstall cycle (matches
// APP/public/sw.js, the Owner App's own service worker, which has always called respondWith and has
// never had this problem). Deliberately does NOT cache API responses or page data: this is an
// internal admin tool where showing stale tenant or billing data would be actively harmful, so this
// is a pure passthrough to the network — respondWith(fetch(...)) still "handles" the fetch event for
// installability purposes without ever serving anything but a live network response.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
