// Emergency recovery service worker:
// clears old caches and unregisters itself to prevent stale bundle white screens.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({ type: "SW_RECOVERY_RELOAD" });
      });

      await self.registration.unregister();
    })()
  );
});

self.addEventListener("fetch", () => {
  // Intentionally empty: after activation this SW unregisters itself.
});
