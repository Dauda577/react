// sw.js — Service Worker
// ✅ FIX: Supabase URLs (API + WebSockets) are never intercepted by the SW.
//         Without this, the PWA serves cached/stale responses for Supabase
//         requests and WebSocket upgrades silently fail.

const CACHE_NAME = "sneakershub-v1";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ✅ CRITICAL: Never intercept Supabase requests.
  //    This covers both REST API calls and WebSocket upgrades (realtime).
  //    Without this bypass, realtime subscriptions silently fail in PWA mode.
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    // Also bypass any Supabase edge function calls or custom domains you use
    event.request.url.includes(self.__SUPABASE_URL__ ?? "")
  ) {
    return; // Let the browser handle it natively — no caching
  }

  // ✅ Bypass non-GET requests (POST, PATCH, DELETE etc.)
  if (event.request.method !== "GET") return;

  // ✅ Bypass browser-extension requests
  if (!url.protocol.startsWith("http")) return;

  // Network-first for navigation requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/index.html")
      )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache valid same-origin responses
        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic"
        ) {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});

// ── Push Notifications ─────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "SneakersHub", body: event.data.text() };
  }

  const title = data.title ?? "SneakersHub";
  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/icons/icon-192x192.png",
    badge: data.badge ?? "/icons/icon-72x72.png",
    data: data.data ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});