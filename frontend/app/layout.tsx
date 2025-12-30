// app/layout.tsx — Optimized Root Layout (Next.js 16.1.1 – Dec 2025)
import "./globals.css";
import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import TopLoadingBar from "@/components/TopLoadingBar";
import ClientPushNotificationManager from "@/components/ClientPushNotificationManager";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
    title: { default: "HIGH PROSPER 2026", template: "%s | HIGH PROSPER 2026" },
    description: "Africa's Self-Aware Business Empire",
    manifest: "/manifest.json",
    icons: { icon: "/favicon.ico", apple: "/logo-192.png" },
    // themeColor removed → now handled in viewport
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#000000", // ← Correct place (generates <meta name="theme-color">)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            {/* iOS PWA specific meta tags (Next.js doesn't auto-generate these) */}
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

            {/* Leaflet CSS (latest stable: 1.9.4) */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                crossOrigin=""
            />
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
                crossOrigin=""
            />
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"
                crossOrigin=""
            />
        </head>

        <body className="bg-black text-white min-h-screen antialiased">
        <TopLoadingBar />
        <GoogleAnalytics />

        {/* Client-only push notification manager */}
        <ClientPushNotificationManager />

        <Suspense
            fallback={
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto mb-6"></div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Loading Empire...
                        </p>
                    </div>
                </div>
            }
        >
            {children}
        </Suspense>
        </body>
        </html>
    );
}