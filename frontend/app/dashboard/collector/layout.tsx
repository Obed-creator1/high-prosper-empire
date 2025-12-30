// app/dashboard/collector/layout.tsx — PREMIUM COLLECTOR LAYOUT 2026
"use client";

import { useState, useEffect } from "react";
import CollectorSidebar from "@/components/collector/CollectorSidebar";
import CollectorNavbar from "@/components/collector/CollectorNavbar";
import CollectorFooter from "@/components/collector/CollectorFooter";
import PushNotificationManager from "@/components/PushNotificationManager";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CollectorLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Close sidebar when clicking outside on mobile
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-gray-100 dark:from-gray-950 dark:via-purple-950/20 dark:to-black text-gray-900 dark:text-gray-100 transition-all duration-500">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden transition-opacity duration-300"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-label="Sidebar"
            >
                <CollectorSidebar />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Navbar */}
                <header className="sticky top-0 z-30">
                    <CollectorNavbar />
                </header>

                {/* Mobile Menu Toggle */}
                <div className="md:hidden fixed top-4 left-4 z-50">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-lg border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all"
                        aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
                    >
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-950/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="animate-fade-in">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                    <CollectorFooter />
                </footer>
            </div>

            {/* Global Push Notification Manager */}
            <PushNotificationManager />
        </div>
    );
}