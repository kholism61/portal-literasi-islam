const CACHE_NAME = "literatur-islam-v1";
const OFFLINE_PAGE = "/offline.html";

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([
        "/",
        OFFLINE_PAGE
      ])
    )
  );
  self.skipWaiting();
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* ================= FETCH ================= */
self.addEventListener("fetch", (event) => {

  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // 🌐 Network First
        const networkResponse = await fetch(event.request);

        // Simpan ke cache kalau valid
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;

      } catch (error) {
        // 🔄 Fallback ke cache
        const cached = await cache.match(event.request);
        if (cached) return cached;

        // Kalau HTML dan tidak ada cache
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return cache.match(OFFLINE_PAGE);
        }

        return new Response("Offline", { status: 503 });
      }
    })()
  );

});