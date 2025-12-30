// components/PushNotificationManager.tsx — FINAL PREMIUM PUSH MANAGER 2026 (SUBSCRIBE OPTIMIZED)
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

export default function PushNotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOfflineSupported, setIsOfflineSupported] = useState(false);

    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            console.warn("Push notifications not supported in this browser");
            return;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY missing — check .env.local");
            toast.error("Push notifications disabled — server configuration missing");
            return;
        }

        initializePush();
    }, []);

    const initializePush = async () => {
        try {
            await registerServiceWorker();
            await checkSubscriptionStatus();
        } catch (err) {
            console.error("Push initialization failed:", err);
        }
    };

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            console.log("Service Worker registered:", registration);

            registration.addEventListener("updatefound", () => {
                toast.info("New version available — refresh to update the empire");
            });

            setIsOfflineSupported("caches" in window);
        } catch (err) {
            console.error("Service Worker registration failed:", err);
            toast.error("Offline support unavailable");
        }
    };

    const checkSubscriptionStatus = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
            setPermission(Notification.permission);
        } catch (err) {
            console.warn("Failed to check subscription status:", err);
        }
    };

    const subscribeToPush = async () => {
        if (!VAPID_PUBLIC_KEY) {
            toast.error("Push configuration missing");
            return;
        }

        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== "granted") {
                toast.error("Notification permission denied by user");
                setIsLoading(false);
                return;
            }

            toast.loading("Subscribing to empire alerts...", { id: "subscribe-toast" });

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            const subscriptionData = {
                ...subscription.toJSON(),
                phone: localStorage.getItem("customer_phone") || "",
                device_id: localStorage.getItem("device_id") || crypto.randomUUID(),
                browser: /firefox/i.test(navigator.userAgent) ? "Firefox" : "Chrome",
                platform: /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ? "Mobile" : "Desktop",
            };

            const response = await api.post("/notifications/subscribe/", subscriptionData);

            toast.dismiss("subscribe-toast");

            if (response.status === 200 || response.status === 201) {
                setIsSubscribed(true);
                toast.success("🎉 Empire alerts activated! You will now receive real-time updates.");
            } else {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (err: any) {
            toast.dismiss("subscribe-toast");
            console.error("Push subscription failed:", err);
            toast.error("Failed to activate alerts — please try again later");
        } finally {
            setIsLoading(false);
        }
    };

    const unsubscribeFromPush = async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                toast.info("No active subscription found");
                setIsSubscribed(false);
                setIsLoading(false);
                return;
            }

            await subscription.unsubscribe();

            const endpointId = subscription.endpoint.split("/").pop();

            try {
                await api.delete(`/notifications/subscriptions/${endpointId}/`);
                toast.success("Empire alerts successfully deactivated");
            } catch (err) {
                console.warn("Backend cleanup failed", err);
                toast.success("Alerts disabled locally (server sync pending)");
            }

            setIsSubscribed(false);
        } catch (err) {
            console.error("Unsubscribe failed:", err);
            toast.error("Failed to disable alerts");
        } finally {
            setIsLoading(false);
        }
    };

    function urlBase64ToUint8Array(base64String: string): Uint8Array {
        const clean = base64String.trim().replace(/-/g, "+").replace(/_/g, "/");
        const padding = "=".repeat((4 - clean.length % 4) % 4);
        const base64 = clean + padding;
        const binary = window.atob(base64);
        return Uint8Array.from(Array.from(binary).map((c) => c.charCodeAt(0)));
    }

    if (isSubscribed === null) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
            <div className="pointer-events-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 bg-clip-text text-transparent">
                        Empire Alerts
                    </h3>
                    {isOfflineSupported && (
                        <div className="flex items-center gap-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-full animate-pulse">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Offline Ready
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span>Status:</span>
                        <span className={`font-bold ${permission === "granted" ? "text-green-500" : permission === "denied" ? "text-red-500" : "text-amber-500"}`}>
              {permission === "granted" ? "✓ Active" : permission === "denied" ? "✗ Blocked" : "? Pending"}
            </span>
                    </div>

                    {isSubscribed ? (
                        <button
                            onClick={unsubscribeFromPush}
                            disabled={isLoading}
                            className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all transform hover:scale-105 disabled:opacity-70 shadow-lg"
                        >
                            {isLoading ? "Disabling..." : "Disable Empire Alerts"}
                        </button>
                    ) : (
                        <button
                            onClick={subscribeToPush}
                            disabled={isLoading || permission === "denied"}
                            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-700 hover:via-pink-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 relative overflow-hidden"
                        >
              <span className="relative z-10">
                {isLoading ? "Activating..." : permission === "denied" ? "Blocked by Browser" : "Activate Real-Time Empire Alerts"}
              </span>
                            {!isLoading && permission !== "denied" && (
                                <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                            )}
                        </button>
                    )}

                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed text-center">
                        Receive instant updates for <strong>payments</strong>, <strong>tasks</strong>, <strong>routes</strong>, and <strong>HR</strong> — across the entire empire.
                    </p>
                </div>
            </div>
        </div>
    );
}