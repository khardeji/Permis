// PermiConduit minimal service worker for PWA installability
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network-first pass-through so SSR and Supabase sessions always stay fresh.
});
