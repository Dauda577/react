// SneakersHub Service Worker

const CACHE_NAME = "sneakershub-v3";

// ── Install: activate immediately ────────────────────────────────────────
self.addEventListener("install", () => self.skipWaiting());

// ── Activate: clear old caches, take control ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network first ──────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

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

// ── Push: receive server push (for future server-sent pushes) ────────────
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

// ── Notification click: focus existing tab or open new one ────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/account";
  const fullUrl = self.location.origin + targetUrl;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // If there's already an open tab for this app, navigate it
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // No open tab — open a new one
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});