// public/sw.js — HIGH PROSPER EMPIRE SERVICE WORKER 2026 (ULTIMATE COMBINED v6.0)
// Supports: Dashboard, Customers, Collectors, Fleet, Payments, HR, Maps, Notifications

const CACHE_NAME = "highprosper-empire-2026-v6.0";
const API_CACHE = "highprosper-api-v1";
const OFFLINE_URL = "/offline.html";
const ONLINE_URL = "/online.html"; // Optional celebration page

// Detect development
const IS_DEVELOPMENT = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

// Core static assets — always cached
const PRECACHE_ASSETS = [
    "/",
    "/manifest.json",
    "/favicon.ico",
    "/logo192.png",
    "/logo512.png",
    "/fleet-icon.svg",
    "/splash.png",
    "/static/images/offline.jpg",
    "/dashboard",
    "/customers",
    "/collectors",
    "/fleet",
    "/payments",
    "/hr",
    "/notifications",
    "/maps/customers",
    "/maps/collectors",
    "/dashboard/admin/fleet",
    "/dashboard/admin/fleet/new",
];

// Only cache offline page in production
if (!IS_DEVELOPMENT) {
    PRECACHE_ASSETS.push(OFFLINE_URL);
    PRECACHE_ASSETS.push(ONLINE_URL);
}

// INSTALL — Cache core assets immediately
self.addEventListener("install", (event) => {
    console.log("🟢 High Prosper Empire SW v6.0: Installing...");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log("Caching core assets...");
                return cache.addAll(PRECACHE_ASSETS.map(url =>
                    new Request(url, { credentials: "same-origin" })
                )).catch(err => {
                    console.warn("Some assets failed to precache (normal in dev):", err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('notificationclick', event => {
    const action = event.action;
    const notification = event.notification;

    if (action === 'unsubscribe') {
        const unsubscribeUrl = notification.data.unsubscribe_endpoint;
        if (unsubscribeUrl) {
            clients.openWindow(unsubscribeUrl);
        }
    } else {
        clients.openWindow(notification.data.url || '/');
    }

    notification.close();
});

// ACTIVATE — Immediate control + clean old caches
self.addEventListener("activate", (event) => {
    console.log("🟢 High Prosper Empire SW v6.0: Activated");
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME && key !== API_CACHE) {
                    console.log("🗑️ Deleting old cache:", key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// FETCH — Smart hybrid strategy
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET, extensions, websockets
    if (
        request.method !== "GET" ||
        url.protocol === "chrome-extension:" ||
        url.pathname.startsWith("/ws/")
    ) {
        return;
    }

    // === API CALLS → Network First + Cache Fallback ===
    if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(API_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        if (cached) return cached;
                        return new Response(JSON.stringify({
                            error: "You are offline",
                            offline: true,
                            timestamp: new Date().toISOString()
                        }), {
                            status: 503,
                            headers: { "Content-Type": "application/json" }
                        });
                    });
                })
        );
        return;
    }

    // === HTML Navigation → Network First (with offline fallback) ===
    if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status < 400) {
                        // Optional: briefly show online celebration
                        if (!IS_DEVELOPMENT) {
                            caches.match(ONLINE_URL).then(cached => {
                                if (cached) return cached;
                            });
                        }
                        return response;
                    }
                    return caches.match(OFFLINE_URL);
                })
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // === Static Assets (JS, CSS, Images, Fonts) → Cache First + Background Update ===
    event.respondWith(
        caches.match(request)
            .then((cached) => {
                // Return cached version immediately
                if (cached) {
                    // Update in background
                    fetch(request)
                        .then((fresh) => {
                            if (fresh && fresh.status === 200) {
                                caches.open(CACHE_NAME).then(cache => cache.put(request, fresh.clone()));
                            }
                        })
                        .catch(() => {}); // Silent fail
                    return cached;
                }

                // Not cached → fetch and cache
                return fetch(request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Fallback for images/fonts
                        if (request.destination === "image") {
                            return caches.match("/static/images/offline.jpg");
                        }
                        return new Response("Offline", { status: 503 });
                    });
            })
    );
});

// PUSH NOTIFICATIONS — Real-time Empire Alerts
self.addEventListener("push", (event) => {
    let data = { title: "High Prosper Empire", body: "New update available" };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            // Fallback
        }
    }

    const options = {
        body: data.body || "You have a new notification",
        icon: data.icon || "/logo512.png",
        badge: data.badge || "/logo192.png",
        image: data.image || "/splash.png",
        vibrate: data.vibrate || [300, 100, 300],
        tag: data.tag || "high-prosper-empire",
        renotify: true,
        requireInteraction: true,
        actions: data.actions || [
            { action: "open", title: "Open Empire" },
            { action: "dismiss", title: "Later" }
        ],
        data: { url: data.url || "/dashboard" },
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/dashboard";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
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

// ONLINE / OFFLINE STATUS NOTIFICATIONS (Production only)
if (!IS_DEVELOPMENT) {
    self.addEventListener("online", () => {
        console.log("🟢 Empire Online — Syncing live data");
        showStatusNotification("Empire Online", "Connection restored. Syncing...");
        self.registration.sync.register("sync-offline-actions").catch(() => {});
        self.registration.sync.register("sync-collector-visits").catch(() => {});
    });

    self.addEventListener("offline", () => {
        console.log("🔴 Empire Offline — Running locally");
        showStatusNotification("Offline Mode", "Your empire continues offline");
    });
}

function showStatusNotification(title, body) {
    self.registration.showNotification(title, {
        body,
        icon: "/logo512.png",
        badge: "/logo192.png",
        tag: "empire-connection-status",
        renotify: true,
        vibrate: [200, 100, 200],
    });
}

// BACKGROUND SYNC
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-offline-actions") {
        event.waitUntil(syncOfflineActions());
    }
    if (event.tag === "sync-collector-visits") {
        event.waitUntil(syncCollectorVisits());
    }
});

async function syncOfflineActions() {
    console.log("🔄 Syncing offline actions...");
    if (!IS_DEVELOPMENT) showStatusNotification("Syncing", "Processing queued actions...");
    // Your offline action sync logic here
    if (!IS_DEVELOPMENT) showStatusNotification("Sync Complete", "All actions updated");
}

async function syncCollectorVisits() {
    console.log("🔄 Syncing collector visits...");
    // Your visit sync logic here
}

// MESSAGE FROM APP — Update ready
self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});