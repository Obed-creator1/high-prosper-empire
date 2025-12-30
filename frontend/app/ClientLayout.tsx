// app/ClientLayout.tsx — FLEET OS 2026 FINAL CLIENT CORE (December 2025)
"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import DashboardLayout from "./DashboardLayout";
import OfflineBanner from "@/components/OfflineBanner";
import { useEffect } from "react";

// React Query Client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    // Register Service Worker (PWA + Offline)
    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/sw.js").catch(console.error);
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                {/* Offline Banner */}
                <OfflineBanner />

                {/* Main App Layout */}
                <DashboardLayout>{children}</DashboardLayout>

                {/* Cyberpunk Toasts */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 5000,
                        style: {
                            background: "rgba(26, 0, 51, 0.95)",
                            color: "#00F0FF",
                            border: "1px solid #9D00FF",
                            borderRadius: "16px",
                            fontWeight: "bold",
                            boxShadow: "0 0 30px rgba(157, 0, 255, 0.4)",
                            backdropFilter: "blur(10px)",
                        },
                        success: {
                            icon: "Live",
                            style: { borderColor: "#00FF9D" },
                        },
                        error: {
                            icon: "Warning",
                            style: { borderColor: "#FF0055" },
                        },
                    }}
                />

                {/* React Query DevTools (dev only) */}
                {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
            </ThemeProvider>
        </QueryClientProvider>
    );
}