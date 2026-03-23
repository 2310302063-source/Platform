// Service Worker for Offline Support & Caching
const CACHE_NAME = "social-learning-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches
          .match(event.request)
          .then((response) => response || caches.match("/offline.html"));
      })
  );
});

// Background Sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    const messages = await getUnsyncedMessages();
    for (const message of messages) {
      await sendMessage(message);
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

async function getUnsyncedMessages() {
  // Get from IndexedDB
  return [];
}

async function sendMessage(message: any) {
  // Send to server
}
