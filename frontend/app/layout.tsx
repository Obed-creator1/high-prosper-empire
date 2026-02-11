// app/layout.tsx — HIGH PROSPER EMPIRE 2026 ROOT LAYOUT (Production Ready – Dec 2025)
import "./globals.css"
import 'antd/dist/antd.css';
import { Metadata, Viewport } from "next";
import { Suspense } from "react";
import TopLoadingBar from "@/components/TopLoadingBar";
import ClientPushNotificationManager from "@/components/ClientPushNotificationManager";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import OfflineManager from "@/components/OfflineManager"; // We'll create this next

export const metadata: Metadata = {
    title: {
        default: "HIGH PROSPER EMPIRE 2026",
        template: "%s | HIGH PROSPER 2026",
    },
    description: "Africa's Self-Aware AI Business Empire — Offline-First • Real-Time • Unstoppable",
    keywords: ["finance", "ai", "fleet", "collectors", "payments", "hr", "business", "pwa"],
    authors: [{ name: "Obed Ibyishatse" }],
    creator: "Obed Ibyishatse",
    publisher: "High Prosper Empire",
    metadataBase: new URL("https://highprosper.com"), // Replace with your domain
    manifest: "/manifest.json",
    icons: {
        icon: ["/favicon.ico", "/icons/icon-192x192.png", "/icons/icon-512x512.png"],
        shortcut: "/favicon.ico",
        apple: "/logo-192.png",
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        siteName: "HIGH PROSPER EMPIRE 2026",
        title: "HIGH PROSPER EMPIRE 2026",
        description: "Your Self-Aware Business Empire — Works Offline • AI-Powered • Unstoppable",
    },
    twitter: {
        card: "summary_large_image",
        title: "HIGH PROSPER EMPIRE 2026",
        description: "Africa's Self-Aware AI Business Empire",
        creator: "@obed", // Update if you have one
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#000000" },
        { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
    colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            {/* PWA iOS Support */}
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content="ProsperAI" />
            <link rel="apple-touch-icon" href="/logo-192.png" />

            {/* Leaflet CSS (CDN – latest stable) */}
            <link
                rel="stylesheet"
                href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                integrity="sha256-sA+zWATbFveLLNqWO2gtiw3HL/lh1giY/Inf1BJ0z14="
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

            {/* Preload critical resources */}
            <link rel="preload" href="/fonts/GeistVF.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        </head>

        <body className="bg-black text-white min-h-screen antialiased">
        {/* Global Components */}
        <TopLoadingBar />
        <GoogleAnalytics />
        <ClientPushNotificationManager />

        {/* Offline/Online Status Manager with Auto-Redirect */}
        <OfflineManager />

        {/* Main Content with Smooth Loading */}
        <Suspense
            fallback={
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 backdrop-blur-md">
                    <div className="text-center">
                        <div className="animate-pulse mb-8">
                            <div className="text-6xl font-black bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                EMPIRE
                            </div>
                        </div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
                            Initializing Core Systems...
                        </div>
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