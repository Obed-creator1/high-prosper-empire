// app/dashboard/layout.tsx — MAXIMIZED CONTENT AREA 2026
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
            {/* Sidebar */}
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            {/* Main Content Area - Maximized */}
            <div className="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out">
                {/* Navbar */}
                <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                {/* Page Content - Wider & More Spacious */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 2xl:p-16
                          max-w-screen-xl lg:max-w-screen-xl xl:max-w-screen-2xl 2xl:max-w-screen-2xl
                          mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}