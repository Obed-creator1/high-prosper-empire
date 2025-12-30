// public/sw.js — FLEET OS 2026 OFFICIAL SERVICE WORKER v6.0 (December 2025)
// Offline-First • Real-Time Push • Zero White Flash • Self-Healing

const CACHE_NAME = "fleet-os-2026-v6";
const API_CACHE = "fleet-api-v1";
const OFFLINE_URL = "/offline.html";

// Critical assets — instantly available
const PRECACHE_ASSETS = [
    "/",
    "/dashboard/admin/fleet",
    "/dashboard/admin/fleet/new",
    "/manifest.json",
    "/fleet-icon.svg",
    "/splash.png",
    "/offline.html",
    "/fonts/inter-var.woff2",
    "/_next/static/css/app/(fleet)/page.css", // Next.js will generate this
];

// INSTALL — Cache everything instantly
self.addEventListener("install", (event) => {
    console.log("FLEET OS 2026 SW: Installing v6...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { credentials: "same-origin" })))
                .catch(err => console.warn("Some assets failed to cache (normal in dev):", err));
        }).then(() => self.skipWaiting())
    );
});

// ACTIVATE — Take control immediately + clean old caches
self.addEventListener("activate", (event) => {
    console.log("FLEET OS 2026 SW: Activated v6");
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME && key !== API_CACHE) {
                    console.log("Deleting old cache:", key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// FETCH — Smart Strategy: Cache-First for UI, Network-First for API
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, chrome-extension, and WebSocket
    if (
        request.method !== "GET" ||
        url.protocol !== "http:" && url.protocol !== "https:" ||
        url.pathname.startsWith("/ws/") ||
        request.url.includes("chrome-extension") ||
        request.url.includes("extension")
    ) {
        return;
    }

    // === API CALLS → Network First + Cache Fallback ===
    if (url.pathname.startsWith("/api/v1/fleet/")) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(cached => {
                        if (cached) return cached;
                        return caches.match(OFFLINE_URL);
                    });
                })
        );
        return;
    }

    // In sw.js — add this to fetch handler for HTML
    if (request.headers.get("accept")?.includes("text/html")) {
        event.respondWith(
            fetch(request).then(response => {
                // If online → show online.html briefly? Or just return normal
                if (response && response.status < 400) {
                    return response;
                }
                return caches.match("/online.html"); // Optional: show celebration
            }).catch(() => caches.match("/offline.html"))
        );
    }

    // === Everything Else (JS, CSS, Images) → Cache First + Update ===
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                // Update in background
                fetch(request).then(fresh => {
                    if (fresh && fresh.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(request, fresh.clone()));
                    }
                }).catch(() => {});
                return cached;
            }

            // Not cached → fetch and cache
            return fetch(request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => caches.match(OFFLINE_URL));
        })
    );
});

// PUSH NOTIFICATIONS — Real-time Fleet Alerts
self.addEventListener("push", (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.message || "New update from FLEET OS 2026",
        icon: "/fleet-icon.svg",
        badge: "/fleet-icon.svg",
        image: data.image || "/splash.png",
        vibrate: [300, 100, 300],
        data: { url: data.url || "/dashboard/admin/fleet" },
        tag: "fleet-alert",
        renotify: true,
        requireInteraction: true,
        actions: [
            { action: "open", title: "Open Fleet OS" },
            { action: "dismiss", title: "Later" }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || "FLEET OS 2026",
            options
        )
    );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/dashboard/admin/fleet";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url.includes(url) && "focus" in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// MESSAGE FROM APP — Skip waiting
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
