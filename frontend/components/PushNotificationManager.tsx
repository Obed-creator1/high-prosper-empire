// components/ClientPushNotificationManager.tsx — HIGH PROSPER PUSH MANAGER 2026
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Bell, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function ClientPushNotificationManager() {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscriptionStatus, setSubscriptionStatus] = useState<
        "idle" | "checking" | "subscribed" | "unsubscribed" | "unsupported" | "denied" | "error"
    >("idle");
    const [isLoading, setIsLoading] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const urlBase64ToUint8Array = useCallback((base64String: string) => {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
    }, []);

    const registerServiceWorker = useCallback(async () => {
        if (!("serviceWorker" in navigator)) return false;
        try {
            const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            console.log("Service Worker registered:", registration.scope);
            return true;
        } catch (err) {
            console.error("Service Worker registration failed:", err);
            return false;
        }
    }, []);

    const checkCurrentSubscription = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();

            if (!sub) {
                setSubscriptionStatus("unsubscribed");
                return false;
            }

            console.log("Existing subscription found:", sub.toJSON());

            // Optional: verify with backend (skip if /check doesn't exist yet)
            // const res = await api.post("/notifications/subscribe/check", { endpoint: sub.endpoint });
            // if (res.data?.isValid) { ... }

            setSubscriptionStatus("subscribed");
            return true;
        } catch (err) {
            console.warn("Subscription check failed:", err);
            setSubscriptionStatus("error");
            return false;
        }
    }, []);

    const subscribe = useCallback(async () => {
        if (!VAPID_PUBLIC_KEY) {
            toast.error("Push notifications not configured — contact support");
            setSubscriptionStatus("error");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== "granted") {
                toast.error("Notifications blocked — enable them in browser settings");
                setIsLoading(false);
                return;
            }

            // 2. Register SW
            const swReady = await registerServiceWorker();
            if (!swReady) {
                toast.error("Service Worker failed to register");
                setIsLoading(false);
                return;
            }

            // 3. Subscribe with correct options
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            console.log("Subscription created successfully:", subscription.toJSON());

            // 4. Send full subscription object to backend
            const payload = {
                ...subscription.toJSON(),
                device_info: {
                    browser: navigator.userAgent.includes("Firefox") ? "Firefox" :
                        navigator.userAgent.includes("Edg") ? "Edge" : "Chrome",
                    platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? "iOS" :
                        /Android/.test(navigator.userAgent) ? "Android" : "Desktop",
                    language: navigator.language,
                    userAgent: navigator.userAgent.substring(0, 200),
                },
            };

            const res = await api.post("/api/v1/notifications/subscribe/", payload, {
                headers: { "Content-Type": "application/json" },
            });

            if (res.data?.success) {
                setSubscriptionStatus("subscribed");
                toast.success(
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span>Empire Alerts Activated!</span>
                    </div>,
                    { duration: 6000 }
                );

                // Welcome notification
                new Notification("Welcome to High Prosper 👑", {
                    body: "Real-time alerts for payments, tasks, customers & more are now active.",
                    icon: "/logo-192.png",
                    badge: "/logo-192.png",
                    tag: "welcome-empire",
                    renotify: false,
                });
            } else {
                throw new Error(res.data?.error || "Backend rejected subscription");
            }
        } catch (err: any) {
            console.error("Push subscription failed:", err);
            toast.error(
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span>{err.message || "Failed to activate alerts — try again"}</span>
                </div>
            );
            setSubscriptionStatus("error");
        } finally {
            setIsLoading(false);
        }
    }, [registerServiceWorker, urlBase64ToUint8Array]);

    // ── Lifecycle ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!("PushManager" in window) || !VAPID_PUBLIC_KEY) {
            setSubscriptionStatus("unsupported");
            return;
        }

        let mounted = true;

        const init = async () => {
            setSubscriptionStatus("checking");
            const hasSw = await registerServiceWorker();
            if (!hasSw || !mounted) {
                setSubscriptionStatus("unsupported");
                return;
            }

            const isSub = await checkCurrentSubscription();
            if (mounted) {
                setShowBanner(!isSub && permission !== "denied");
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, [registerServiceWorker, checkCurrentSubscription, permission]);

    // ── UI Render ────────────────────────────────────────────────────────────────
    if (subscriptionStatus === "subscribed") return null;
    if (subscriptionStatus === "unsupported") return null;

    if (permission === "denied") {
        return (
            <div className="fixed bottom-6 right-6 z-50 max-w-xs animate-fade-in">
                <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-red-950/70 dark:to-rose-950/70 backdrop-blur-xl rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-200">
                                Notifications Blocked
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                Please enable notifications in your browser settings to receive real-time empire alerts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main prompt
    return (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
            <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 dark:from-slate-950/95 dark:to-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-700/50 shadow-2xl p-6 w-80 sm:w-96 pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md">
                            <Bell className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white tracking-tight">
                                Empire Real-Time Alerts
                            </h3>
                            <p className="text-xs text-slate-400">Payments • Tasks • Customers • Routes</p>
                        </div>
                    </div>

                    {subscriptionStatus === "checking" && (
                        <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
                    )}
                </div>

                {/* Body */}
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    Get instant updates on your phone or desktop — even when the app is closed.
                    <span className="block mt-2 text-xs text-slate-500">
            Secure • Private • Works offline
          </span>
                </p>

                {/* Action Button */}
                <button
                    onClick={subscribe}
                    disabled={isLoading || subscriptionStatus === "checking"}
                    className={cn(
                        "w-full relative overflow-hidden rounded-xl py-4 px-6 font-semibold text-base",
                        "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600",
                        "text-white shadow-xl transition-all duration-300",
                        "hover:shadow-2xl hover:scale-[1.02] hover:brightness-110",
                        "disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100",
                        "flex items-center justify-center gap-3 group"
                    )}
                >
                    {isLoading || subscriptionStatus === "checking" ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Activating Empire Alerts...</span>
                        </>
                    ) : (
                        <>
                            <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
                            <span>Enable Real-Time Alerts</span>
                        </>
                    )}

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shine pointer-events-none" />
                </button>

                {/* Subtext */}
                <p className="text-xs text-center text-slate-500 mt-4">
                    You can unsubscribe anytime from Settings
                </p>
            </div>
        </div>
    );
}