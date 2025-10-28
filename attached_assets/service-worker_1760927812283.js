const CACHE_NAME = "haru-cache-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./common.css",
  "./header.html",
  "./header.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./signup.html",
  "./signup.js",
  "./return_form.html",
  "./return_form.js",
  "./lost_items.html",
  "./lost_items.js",
  "./maintenance.html",
  "./maintenance.js",
  "./history_dashboard_fast.js"
];

self.addEventListener("install", (event) => {
  console.log("📦 [ServiceWorker] Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.error("❌ 캐시 중 오류:", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  console.log("✅ [ServiceWorker] Activated");
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
