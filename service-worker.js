// ========================================
// 🚀 HARU Service Worker (PWA Caching Strategy)
// ========================================

const CACHE_NAME = "haru-v2.0.0";
const CACHE_STRATEGY = "network-first"; // "cache-first" | "network-first"

// 필수 캐시 파일 (오프라인 지원)
const CORE_FILES = [
  "./",
  "./index.html",
  "./signup.html",
  "./common.css",
  "./styles/tokens.css",
  "./styles/layout.css",
  "./styles/components.css",
  "./header.html",
  "./header.js",
  "./signup.js",
  "./storage.js",
  "./auth.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// 동적 캐시 파일 (사용 시 캐시)
const DYNAMIC_CACHE_PAGES = [
  "./board.html",
  "./chat.html",
  "./admin_dashboard.html",
  "./incoming_form.html",
  "./return_form.html",
  "./history_dashboard.html",
  "./lost_items_list.html",
  "./maintenance_list.html",
  "./orders_list.html",
  "./worklog.html",
  "./notices.html",
  "./profile.html",
  "./admin.html",
];

/* ========================================
   📦 Install Event (캐시 생성)
   ======================================== */
self.addEventListener("install", (event) => {
  console.log("📦 [ServiceWorker] Installing...");
  
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ [ServiceWorker] Caching core files");
        return cache.addAll(CORE_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error("❌ [ServiceWorker] Cache failed:", err);
      })
  );
});

/* ========================================
   🔄 Activate Event (구 캐시 삭제)
   ======================================== */
self.addEventListener("activate", (event) => {
  console.log("🔄 [ServiceWorker] Activating...");
  
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`🗑️ [ServiceWorker] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ [ServiceWorker] Activated");
        return self.clients.claim();
      })
  );
});

/* ========================================
   🌐 Fetch Event (캐싱 전략)
   ======================================== */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase / 외부 API 요청은 캐시하지 않음
  if (
    url.origin !== location.origin ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("gstatic") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Network-First 전략 (최신 데이터 우선)
  if (CACHE_STRATEGY === "network-first") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공 시 캐시 업데이트
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시 반환
          return caches.match(request);
        })
    );
  }
  
  // Cache-First 전략 (빠른 로딩 우선)
  else {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
  }
});

/* ========================================
   💬 Message Event (수동 캐시 업데이트)
   ======================================== */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME).then(() => {
      console.log("✅ Cache cleared");
    });
  }
});
