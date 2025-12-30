// components/Sidebar.tsx — FINAL MODERN MOBILE + DESKTOP SIDEBAR 2026
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import {
    HomeIcon,
    UsersIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    TruckIcon,
    BanknotesIcon,
    CubeIcon,
    ShoppingCartIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    ChartBarIcon,
    BellIcon,
    // ... all your other icons
} from "@heroicons/react/24/solid";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

type MenuGroup = {
    title: string;
    icon: React.ReactNode;
    items: { title: string; href: string; icon: React.ReactNode }[];
    roles: string[];
};

type SidebarProps = {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Users Management"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [role, setRole] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        const userRole = Cookies.get("role")?.toLowerCase();
        setRole(userRole || null);
    }, []);

    // Your menuGroups array (unchanged)
    const menuGroups: MenuGroup[] = [
        // ... your full menuGroups from before
    ];

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return menuGroups.filter((g) => role && g.roles.includes(role));

        const query = searchQuery.toLowerCase();
        return menuGroups.filter((group) => {
            if (!role || !group.roles.includes(role)) return false;
            const matchesTitle = group.title.toLowerCase().includes(query);
            const matchesItem = group.items.some((item) => item.title.toLowerCase().includes(query));
            return matchesTitle || matchesItem;
        });
    }, [menuGroups, role, searchQuery]);

    // Keyboard shortcuts (unchanged)
    // ... your keyboard shortcut useEffect

    const isActive = (href: string) => pathname?.startsWith(href);

    const toggleGroup = (title: string) => {
        setOpenGroups((prev) => {
            const newSet = new Set(prev);
            newSet.has(title) ? newSet.delete(title) : newSet.add(title);
            return newSet;
        });
    };

    return (
        <>
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-950 text-white 
          transition-all duration-500 ease-in-out shadow-2xl overflow-hidden
          ${sidebarOpen
                    ? "translate-x-0 w-full max-w-md"
                    : "-translate-x-full md:translate-x-0"
                }
          ${collapsed ? "md:w-20" : "md:w-80"}
        `}
            >
                {/* Solid Background - No Glass on Mobile */}
                <div className="absolute inset-0 bg-gray-950" />

                {/* Header with Logo & Collapse Button */}
                <div className="relative flex items-center justify-between p-6 border-b border-white/10">
                    {/* Logo */}
                    <motion.div
                        className="flex items-center gap-4"
                        animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
                        transition={{ duration: 0.3 }}
                    >
                        <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                            HIGH PROSPER
                        </h1>
                    </motion.div>

                    {/* Modern Floating Collapse Button - Always Visible */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-700 shadow-xl flex items-center justify-center transition-all hover:scale-110 z-10"
                    >
                        {collapsed ? (
                            <ChevronRightIcon className="w-5 h-5 text-white" />
                        ) : (
                            <ChevronLeftIcon className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>

                {/* Search - Only when not collapsed */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="px-6 pb-4"
                        >
                            <div className="relative mt-4">
                                <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-5 h-5 text-purple-300" />
                                <input
                                    type="text"
                                    placeholder="Search menu..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 backdrop-blur-md"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3.5 text-purple-300 hover:text-white">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    <AnimatePresence>
                        {filteredGroups.map((group) => (
                            <motion.div
                                key={group.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-1"
                            >
                                {/* Group Header */}
                                <button
                                    data-group={group.title.replace(/\s+/g, "-")}
                                    onClick={() => toggleGroup(group.title)}
                                    className={`group relative w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                                        openGroups.has(group.title)
                                            ? "bg-gradient-to-r from-purple-600/50 to-pink-600/50 shadow-lg"
                                            : "hover:bg-white/10"
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative flex-shrink-0">
                                            {group.icon}
                                            {/* Tooltip */}
                                            <div
                                                className={`absolute left-full ml-3 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 backdrop-blur-md border border-white/20 shadow-xl
                          ${collapsed ? "opacity-100" : ""}
                        `}
                                            >
                                                {group.title}
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-black/90" />
                                            </div>
                                        </div>
                                        {!collapsed && <span className="font-semibold text-sm">{group.title}</span>}
                                    </div>
                                    {!collapsed && (
                                        <motion.div animate={{ rotate: openGroups.has(group.title) ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </motion.div>
                                    )}
                                </button>

                                {/* Group Items */}
                                <AnimatePresence>
                                    {openGroups.has(group.title) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className={`space-y-1 ${collapsed ? "pl-0" : "pl-12"}`}>
                                                {group.items.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className={`group relative flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm transition-all ${
                                                            isActive(item.href)
                                                                ? "bg-purple-600/50 text-white font-medium shadow-md"
                                                                : "hover:bg-white/10 text-gray-300"
                                                        }`}
                                                    >
                                                        <div className="relative flex-shrink-0">
                                                            {item.icon}
                                                            {/* Item Tooltip */}
                                                            <div
                                                                className={`absolute left-full ml-4 px-4 py-2.5 bg-black/95 text-white text-xs font-medium rounded-xl 
                                  opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out 
                                  whitespace-nowrap pointer-events-none z-50 backdrop-blur-xl 
                                  border border-white/10 shadow-2xl
                                  ${collapsed ? "opacity-100" : ""}
                                `}
                                                            >
                                                                <span>{item.title}</span>
                                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                                                                    <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-black/95" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!collapsed && <span>{item.title}</span>}
                                                    </Link>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </nav>

                {/* Footer */}
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-6 border-t border-white/10 text-center"
                        >
                            <p className="text-xs text-purple-300">© 2025 High Prosper Services Ltd</p>
                            <p className="text-xs text-cyan-400 mt-1 font-bold">Vision Pro • Intelligence Engine</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </aside>

            {/* Mobile Overlay - Closes Sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </>
    );
}