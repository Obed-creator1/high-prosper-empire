// components/OfflineManager.tsx — HIGH PROSPER OFFLINE MANAGER 2026
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OfflineManager() {
    const [isOnline, setIsOnline] = useState(true);
    const [showOnlineBanner, setShowOnlineBanner] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Initial status
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowOnlineBanner(true);

            // Trigger background sync if supported
            if ("serviceWorker" in navigator && "sync" in (navigator.serviceWorker as any).controller?.scriptURL) {
                navigator.serviceWorker.ready.then((reg: ServiceWorkerRegistration) => {
                    // Register sync tags
                    reg.sync.register("sync-offline-actions").catch(() => {});
                    reg.sync.register("sync-collector-visits").catch(() => {});
                }).catch(err => {
                    console.warn("Background sync not available:", err);
                });
            }

            // Hide banner after 5 seconds
            setTimeout(() => setShowOnlineBanner(false), 5000);

            // Refresh dashboard after brief celebration
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [router]);

    return (
        <>
            {/* Offline Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-600 to-red-600 text-white text-center py-3 px-4 z-50 shadow-lg font-bold text-sm md:text-base">
                    ⚠️ OFFLINE MODE — Your actions are saved locally. Reconnect to sync.
                </div>
            )}

            {/* Online Celebration Banner */}
            {showOnlineBanner && (
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center py-3 px-4 z-50 shadow-lg font-bold text-sm md:text-base animate-pulse">
                    ✓ BACK ONLINE — Syncing your empire's data now...
                </div>
            )}
        </>
    );
}