// components/dashboard/NeuralSidebar.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiHome, FiDollarSign, FiUsers, FiSettings, FiLogOut, FiChevronLeft } from "react-icons/fi";
import Cookies from "js-cookie";

const navItems = [
    { name: "Overview", icon: FiHome, href: "/dashboard/accounting" },
    { name: "Accounting", icon: FiDollarSign, href: "/dashboard/accounting" },
    { name: "Team", icon: FiUsers, href: "/dashboard/team" },
    { name: "AI Insights", icon: FiDollarSign, href: "/dashboard/ai-insights" },
    { name: "Settings", icon: FiSettings, href: "/dashboard/settings" },
];

export default function NeuralSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = () => {
        Cookies.remove("token");
        Cookies.remove("role");
        Cookies.remove("username");
        window.location.href = "/login";
    };

    return (
        <aside className={`fixed left-0 top-0 h-full bg-black/90 backdrop-blur-2xl border-r border-purple-500/30 
      transition-all duration-700 z-50 ${collapsed ? "w-20" : "w-80"}`}>
            <div className="p-6 flex items-center justify-between">
                <h2 className={`font-black text-2xl bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent 
          transition-opacity ${collapsed ? "opacity-0" : "opacity-100"}`}>
                    PROSPER AI
                </h2>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 hover:bg-purple-900/50 rounded-xl transition"
                >
                    <FiChevronLeft className={`text-xl transition-transform ${collapsed ? "rotate-180" : ""}`} />
                </button>
            </div>

            <nav className="mt-12 px-6 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group
                ${active
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-2xl shadow-purple-600/50"
                                : "hover:bg-white/5 hover:translate-x-2"}`}
                        >
                            <Icon className={`text-2xl ${active ? "text-white" : "text-purple-400"}`} />
                            <span className={`font-medium transition-opacity ${collapsed ? "opacity-0" : "opacity-100"}`}>
                {item.name}
              </span>
                            {active && <div className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                        </Link>
                    );
                })}
            </nav>

            <button
                onClick={handleLogout}
                className="absolute bottom-8 left-6 right-6 flex items-center gap-4 px-6 py-4
          bg-red-900/30 hover:bg-red-900/60 rounded-2xl transition-all group"
            >
                <FiLogOut className="text-2xl text-red-400" />
                <span className={`text-red-400 font-medium transition-opacity ${collapsed ? "opacity-0" : "opacity-100"}`}>
          Terminate Session
        </span>
            </button>
        </aside>
    );
}