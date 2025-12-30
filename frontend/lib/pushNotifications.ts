import api from "./api";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator)) return null;

    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service Worker registered:", registration);
    return registration;
}

/**
 * Convert Base64 VAPID key to ArrayBuffer
 */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const array = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        array[i] = rawData.charCodeAt(i);
    }
    return array.buffer; // ✅ ArrayBuffer type
}

/**
 * Subscribe the user to push notifications
 */
export async function subscribeUserToPush(userId: number) {
    const registration = await registerServiceWorker();
    if (!registration || !("PushManager" in window)) return;

    // Subscribe using the correct ArrayBuffer type
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(publicVapidKey), // ✅ No more type errors
    });

    const subData = subscription.toJSON();

    if (!subData.keys) {
        console.error("Subscription keys missing!");
        return;
    }

    // Send subscription to backend
    await api.post("/hr/push-subscriptions/", {
        user: userId,
        endpoint: subData.endpoint,
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth,
    });

    console.log("Push subscription sent to backend.");
}
