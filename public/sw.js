// Finance Manager — Network-Only Service Worker
// This SW enables PWA installability WITHOUT any offline caching.
// All requests are always forwarded to the network so data is always live.

const SW_VERSION = '1.0.0';

// ── Install: activate immediately, skip waiting ───────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW v${SW_VERSION}] Installing...`);
  self.skipWaiting();
});

// ── Activate: claim all clients right away ────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW v${SW_VERSION}] Activating...`);
  event.waitUntil(self.clients.claim());
});

// ── Fetch: network-only — never serve from cache ──────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle same-origin http/https requests; ignore chrome-extension etc.
  const { request } = event;
  const url = new URL(request.url);

  if (!['http:', 'https:'].includes(url.protocol)) return;

  event.respondWith(fetch(request));
});
