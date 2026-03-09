// SneakersHub Service Worker
// Bump this version string whenever you deploy — forces cache refresh on all browsers
const CACHE_NAME = "sneakershub-v4";

// ── Install: activate immediately ────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());

// ── Activate: clear ALL old caches, take control immediately ─────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open tabs to reload so they get the new SW immediately
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_ACTIVATED" }));
        });
      })
  );
});

// ── Fetch: network first, never cache HTML ────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  // NEVER cache HTML/navigation requests — always fetch fresh from network.
  // This is the root cause of Safari blank pages: stale HTML referencing
  // old JS chunk hashes that no longer exist on the server.
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // JS/CSS chunks — network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: receive server push ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch { data = { title: "SneakersHub", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "SneakersHub", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/account" },
      tag: data.tag || "sneakershub",
      renotify: true,
    })
  );
});

// ── Notification click ────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/account";
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});