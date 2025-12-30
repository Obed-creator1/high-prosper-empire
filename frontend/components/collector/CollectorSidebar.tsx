// components/collector/CollectorSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Users, Target, Calendar, MapPin, BarChart,
    Settings, LogOut, MessageSquare
} from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/dashboard/collector", icon: LayoutDashboard },
    { name: "Collectors", href: "/dashboard/collector/collectors", icon: Users },
    { name: "Targets", href: "/dashboard/collector/targets", icon: Target },
    { name: "Schedules", href: "/dashboard/collector/schedules", icon: Calendar },
    { name: "Live GPS", href: "/dashboard/collector/live-gps", icon: MapPin },
    { name: "Analytics", href: "/dashboard/collector/analytics", icon: BarChart },
    { name: "Chats", href: "/dashboard/collector/chats", icon: MessageSquare },
    { name: "Settings", href: "/dashboard/collector/settings", icon: Settings },
];

export default function CollectorSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Collector Hub
                </h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                                isActive
                                    ? "bg-purple-600 text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button className="flex items-center w-full px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <LogOut className="w-5 h-5 mr-3" />
                    Logout
                </button>
            </div>
        </aside>
    );
}