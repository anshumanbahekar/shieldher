// ============================================
// ShieldHer — Advanced Service Worker
// Offline SOS fallback, background location sync,
// push notifications for check-in reminders
// ============================================

const CACHE_NAME = "shieldher-v1";
const OFFLINE_URLS = [
  "/",
  "/dashboard",
  "/emergency",
  "/offline",
];

// Install — cache critical pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(async () => {
        // If SOS trigger fails offline — queue it for background sync
        if (url.pathname === "/api/sos/trigger") {
          await queueOfflineSOS(request.clone());
          return new Response(
            JSON.stringify({ data: { queued: true, offline: true } }),
            { headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: { message: "Offline", code: "OFFLINE" } }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/sounds/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
    return;
  }

  // Network first for pages, fallback to cache
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("/offline")))
  );
});

// Background sync — send queued SOS when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sos-sync") {
    event.waitUntil(flushOfflineSOSQueue());
  }
});

// Push notifications — for check-in reminders
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const { title = "ShieldHer", body = "Check-in reminder", type = "checkin" } = data;

  const options = {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: { type, url: data.url ?? "/dashboard" },
    actions: type === "checkin"
      ? [
          { action: "safe", title: "I'm Safe ✓" },
          { action: "snooze", title: "Snooze 10min" },
        ]
      : [],
    requireInteraction: type === "sos",
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { action, data } = event;

  if (action === "safe") {
    event.waitUntil(
      fetch("/api/check-in/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_in_id: data.check_in_id }),
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(data.url));
      if (existing) return existing.focus();
      return self.clients.openWindow(data.url ?? "/dashboard");
    })
  );
});

// ============================================
// OFFLINE SOS QUEUE
// ============================================
async function queueOfflineSOS(request) {
  const body = await request.json();
  const db = await openDB();
  const tx = db.transaction("sos-queue", "readwrite");
  tx.objectStore("sos-queue").add({ ...body, queued_at: Date.now() });
}

async function flushOfflineSOSQueue() {
  const db = await openDB();
  const tx = db.transaction("sos-queue", "readwrite");
  const store = tx.objectStore("sos-queue");
  const items = await store.getAll();

  for (const item of items) {
    try {
      await fetch("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      store.delete(item.id);
    } catch {}
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("shieldher-offline", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore("sos-queue", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
