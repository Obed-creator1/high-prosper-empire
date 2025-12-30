// app/ClientDashboardWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function ClientDashboardWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [wsNotifications, setWsNotifications] = useState<any[]>([]);
    const [isReady, setIsReady] = useState(false);

    const isDashboardRoute = pathname?.startsWith("/dashboard");

    useEffect(() => {
        if (!isDashboardRoute) {
            setIsReady(true);
            return;
        }

        const token = Cookies.get("access");
        if (!token) {
            setIsReady(true);
            return;
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, "ws")}/ws/notifications/`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log("%cWebSocket Connected", "color: #10b981");
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.title) {
                    setWsNotifications(prev => [{
                        id: data.id || Date.now(),
                        title: data.title,
                        message: data.message || "New notification",
                        is_read: false,
                        created_at: new Date().toISOString(),
                        notification_type: data.notification_type || "info"
                    }, ...prev]);
                }
            } catch (err) {
                console.error("Invalid WS message:", e.data);
            }
        };

        ws.onerror = () => {};
        ws.onclose = () => {};

        setIsReady(true);
        return () => ws.close();
    }, [isDashboardRoute]);

    // Show loading only on dashboard routes (client-side only)
    if (!isReady && isDashboardRoute) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-black">
                <div className="text-4xl md:text-6xl font-black text-white animate-pulse tracking-wider">
                    HIGH PROSPER 2025
                </div>
            </div>
        );
    }

    // Only render full dashboard layout on /dashboard/*
    if (isDashboardRoute) {
        return (
            <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="flex-1 flex flex-col">
                    <main className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-black/95">
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    // Public pages (login, etc.) — no layout
    return <>{children}</>;
}