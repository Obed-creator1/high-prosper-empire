// components/Navbar.tsx — FINAL MOBILE-OPTIMIZED + SIDEBAR INTEGRATION 2026
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {ChevronRightIcon, Menu, X } from "lucide-react";
import Cookies from "js-cookie";
import { Sun, Moon, LogOut, Settings, User, ChevronDown, Search, Users, Receipt, FileText, Truck, UserCheck, Package, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import api from "@/lib/api";

type SearchResult = {
    id: number | string;
    title: string;
    subtitle: string;
    type: "customer" | "invoice" | "vehicle" | "staff" | "item" | "supplier" | "user";
    href: string;
};

type NavbarProps = {
    title?: string;
    subtitle?: string;
    notifications?: any[];
    rightElement?: React.ReactNode;
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
};

export default function Navbar({
                                   title = "Dashboard",
                                   subtitle = "",
                                   notifications = [],
                                   rightElement = null,
                                   sidebarOpen = false,
                                   setSidebarOpen = () => {},
                               }: NavbarProps) {
    const [darkMode, setDarkMode] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const [username, setUsername] = useState("Collector");
    const [userRole, setUserRole] = useState("Field Agent");
    const [profilePic, setProfilePic] = useState("/images/avatar-placeholder.png");

    const profileRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const handleToggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // GA4 Tracking (unchanged)
    const trackSearchEvent = (query: string, filters: any, resultsCount: number) => {
        if (!window.gtag) return;
        window.gtag("event", "global_search", {
            search_term: query || "empty",
            filter_type: filters.type || "none",
            filter_status: filters.status || "none",
            date_range: filters.from && filters.to ? `${filters.from} to ${filters.to}` : "none",
            results_count: resultsCount,
            event_category: "engagement",
        });
    };

    const trackSearchClick = (result: SearchResult | string, position?: number) => {
        if (!window.gtag) return;
        const isSuggestion = typeof result === "string";
        window.gtag("event", isSuggestion ? "search_suggestion_click" : "search_result_click", {
            search_term: searchQuery,
            result_title: typeof result === "string" ? result : result.title,
            result_type: typeof result === "string" ? "suggestion" : result.type,
            result_position: position ?? highlightedSuggestion + 1,
        });
    };

    // Load user & theme (unchanged)
    useEffect(() => {
        const user = Cookies.get("username");
        const role = Cookies.get("role") || "Field Agent";
        const pic = Cookies.get("profilePic") || "/images/avatar-placeholder.png";
        if (user) setUsername(user);
        setUserRole(role);
        setProfilePic(pic);

        const saved = localStorage.getItem("theme");
        if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            document.documentElement.classList.add("dark");
            setDarkMode(true);
        }

        if (window.gtag) window.gtag("set", { user_role: role });
    }, []);

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        document.documentElement.classList.toggle("dark", newMode);
        localStorage.setItem("theme", newMode ? "dark" : "light");
    };

    const handleLogout = () => {
        ["access", "refresh", "username", "userId", "profilePic", "role"].forEach((c) => Cookies.remove(c));
        window.location.href = "/login";
    };

    // Close dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                profileRef.current && !profileRef.current.contains(e.target as Node) &&
                searchRef.current && !searchRef.current.contains(e.target as Node)
            ) {
                setProfileOpen(false);
                setSearchOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keyboard shortcuts (unchanged)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
            }
            if (e.key === "Escape") {
                setSearchOpen(false);
                setSearchQuery("");
                setSuggestions([]);
            }

            if (searchOpen && suggestions.length > 0) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedSuggestion(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedSuggestion(prev => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter" && highlightedSuggestion >= 0) {
                    e.preventDefault();
                    const selected = suggestions[highlightedSuggestion];
                    setSearchQuery(selected);
                    setSuggestions([]);
                    trackSearchClick(selected);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchOpen, suggestions, highlightedSuggestion]);

    // Reset on filter/query change (unchanged)
    useEffect(() => {
        setSearchResults([]);
        setCurrentPage(1);
        setHasMore(true);
        setSuggestions([]);
    }, [searchQuery, typeFilter, statusFilter, dateFrom, dateTo]);

    // Fetch autocomplete suggestions (unchanged)
    useEffect(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        const params = new URLSearchParams();
        params.set("q", searchQuery);
        params.set("limit", "5");

        api.get(`/users/search/?${params.toString()}`)
            .then(res => {
                const titles = (res.data.results || [])
                    .map((r: any) => r.title)
                    .filter((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
                setSuggestions(titles);
            })
            .catch(() => setSuggestions([]));
    }, [searchQuery]);

    // Infinite scroll observer (unchanged)
    const lastResultRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isSearching) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setCurrentPage(prev => prev + 1);
                }
            });
            if (node) observer.current.observe(node);
        },
        [isSearching, hasMore]
    );

    // Fetch main results (unchanged)
    useEffect(() => {
        if (!searchQuery.trim() && !typeFilter && !statusFilter && !dateFrom && !dateTo) {
            setSearchResults([]);
            setHasMore(false);
            return;
        }

        setIsSearching(true);

        const params = new URLSearchParams();
        if (searchQuery) params.set("q", searchQuery);
        if (typeFilter) params.set("type", typeFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);
        params.set("page", currentPage.toString());
        params.set("limit", "15");

        api.get(`/users/search/?${params.toString()}`)
            .then(res => {
                const newResults = res.data.results || [];
                if (currentPage === 1) {
                    setSearchResults(newResults);
                } else {
                    setSearchResults(prev => [...prev, ...newResults]);
                }
                setHasMore(res.data.has_next === true);
                trackSearchEvent(searchQuery, { type: typeFilter, status: statusFilter, from: dateFrom, to: dateTo }, newResults.length);
            })
            .catch(() => {
                setSearchResults([]);
                setHasMore(false);
            })
            .finally(() => setIsSearching(false));
    }, [searchQuery, typeFilter, statusFilter, dateFrom, dateTo, currentPage]);

    const getIcon = (type: string) => {
        switch (type) {
            case "user": return <User size={18} className="text-indigo-500" />;
            case "customer": return <Users size={18} className="text-blue-500" />;
            case "vehicle": return <Truck size={18} className="text-orange-500" />;
            case "invoice": return <Receipt size={18} className="text-green-500" />;
            case "item": return <Package size={18} className="text-purple-500" />;
            case "staff": return <UserCheck size={18} className="text-teal-500" />;
            case "supplier": return <Building2 size={18} className="text-pink-500" />;
            default: return <Search size={18} className="text-gray-500" />;
        }
    };

    const HighlightText = ({ text, query }: { text: string; query: string }) => {
        if (!query.trim()) return <>{text}</>;
        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-300 dark:bg-yellow-900/70 font-bold px-1 rounded">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    return (
        <>
            <header className="relative flex items-center justify-between px-4 md:px-6 py-4 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
                {/* Left: Smart Sidebar Toggle */}
                <div className="flex items-center">
                    {/* Mobile: Always show hamburger */}
                    <button
                        onClick={handleToggleSidebar}
                        className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all md:hidden"
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {/* Desktop: Show collapse/expand button ONLY when sidebar exists but is collapsed */}
                    <button
                        onClick={handleToggleSidebar}
                        className="hidden md:block p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                        <ChevronRightIcon size={24} className={`transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {/* Title */}
                <div className="flex-1 md:flex-none">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>

                {/* Center: Search with Autocomplete */}
                <div ref={searchRef} className="hidden md:block relative max-w-2xl w-full mx-8">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-all backdrop-blur border border-gray-200 dark:border-gray-700"
                    >
                        <Search size={20} className="text-gray-500" />
                        <span className="text-gray-500">Search the empire...</span>
                        <kbd className="ml-auto text-xs bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded">⌘K</kbd>
                    </button>

                    <AnimatePresence>
                        {searchOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-14 left-0 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                            >
                                {/* Filters */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                                            <option value="">All Types</option>
                                            <option value="customer">Customers</option>
                                            <option value="invoice">Invoices</option>
                                            <option value="vehicle">Vehicles</option>
                                            <option value="staff">Staff</option>
                                            <option value="item">Items</option>
                                            <option value="supplier">Suppliers</option>
                                        </select>
                                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
                                            <option value="">All Status</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Paid">Paid</option>
                                            <option value="Overdue">Overdue</option>
                                            <option value="active">Active</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm" />
                                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm" />
                                    </div>
                                </div>

                                {/* Input with Autocomplete */}
                                <div className="relative">
                                    <div className="flex items-center px-5 py-4">
                                        <Search size={20} className="text-gray-500 mr-3" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search customers, invoices, tasks..."
                                            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100"
                                            autoFocus
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery("")} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Autocomplete Suggestions */}
                                    <AnimatePresence>
                                        {suggestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
                                            >
                                                {suggestions.map((suggestion, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => {
                                                            const selected = suggestion;
                                                            setSearchQuery(selected);
                                                            setSuggestions([]);
                                                            trackSearchClick({
                                                                title: selected,
                                                                type: "suggestion",
                                                                href: "#",
                                                                position: index + 1
                                                            });
                                                            api.post('/users/search-click/', {
                                                                search_term: searchQuery,
                                                                result: {
                                                                    title: selected,
                                                                    type: "suggestion",
                                                                    href: "#",
                                                                    position: index + 1
                                                                }
                                                            }).catch(() => {}); // fire and forget
                                                        }}
                                                        onMouseEnter={() => setHighlightedSuggestion(index)}
                                                        className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                                                            index === highlightedSuggestion ? "bg-purple-100 dark:bg-purple-900/30" : ""
                                                        }`}
                                                    >
                                                        <Search size={16} className="text-gray-400" />
                                                        <HighlightText text={suggestion} query={searchQuery} />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Results */}
                                <div className="overflow-y-auto max-h-96">
                                    {searchResults.length === 0 && !isSearching ? (
                                        <div className="p-8 text-center text-gray-500">
                                            <Search size={48} className="mx-auto mb-4 opacity-30" />
                                            <p>No results found</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {searchResults.map((result, index) => {
                                                const isLast = index === searchResults.length - 1;
                                                return (
                                                    <div ref={isLast ? lastResultRef : null} key={`${result.type}-${result.id}`}>
                                                        <a
                                                            href={result.href}
                                                            onClick={() => {
                                                                trackSearchClick(result, index + 1);
                                                                api.post('/users/search-click/', {
                                                                    search_term: searchQuery,
                                                                    result: {
                                                                        title: result.title,
                                                                        type: result.type,
                                                                        href: result.href,
                                                                        position: index + 1
                                                                    }
                                                                }).catch(() => {}); // fire and forget
                                                            }}
                                                            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                                        >
                                                            {getIcon(result.type)}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                                    <HighlightText text={result.title} query={searchQuery} />
                                                                </p>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                    <HighlightText text={result.subtitle} query={searchQuery} />
                                                                </p>
                                                            </div>
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                            {isSearching && (
                                                <div className="p-8 text-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
                                                    <p className="mt-4 text-gray-500">Loading more...</p>
                                                </div>
                                            )}
                                            {!hasMore && searchResults.length > 0 && (
                                                <div className="p-4 text-center text-gray-500 text-sm">
                                                    End of results
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right elements */}
                <div className="flex items-center gap-4">
                    {rightElement}
                    <button onClick={() => setSearchOpen(true)} className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <Search size={20} />
                    </button>
                    <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <NotificationBell notifications={notifications} />
                    {/* Profile dropdown */}
                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setProfileOpen(!profileOpen)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                        >
                            <Image
                                src={profilePic}
                                alt={username}
                                width={40}
                                height={40}
                                className="rounded-full border-2 border-purple-500/50"
                            />
                            <div className="text-left hidden md:block">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{userRole}</p>
                            </div>
                            <ChevronDown size={16} className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                        </button>

                        <AnimatePresence>
                            {profileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-4">
                                            <Image
                                                src={profilePic}
                                                alt={username}
                                                width={64}
                                                height={64}
                                                className="rounded-full border-4 border-purple-500/30"
                                            />
                                            <div>
                                                <p className="font-bold text-lg">{username}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{userRole}</p>
                                                <p className="text-xs text-gray-400 mt-1">ID: #{Cookies.get("userId") || "000"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-2">
                                        <button
                                            onClick={() => window.location.href = "/profile"}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                        >
                                            <User size={18} />
                                            <span>My Profile</span>
                                        </button>
                                        <button
                                            onClick={() => window.location.href = "/settings"}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                        >
                                            <Settings size={18} />
                                            <span>Settings</span>
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                        >
                                            <LogOut size={18} />
                                            <span>Logout</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Mobile Full-Screen Search Modal */}
            <AnimatePresence>
                {searchOpen && (
                    <>
                        {/* Backdrop — closes only search, not sidebar */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSearchOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Search Panel — solid background, no transparency */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-50 md:hidden overflow-hidden"
                            style={{ maxHeight: "90vh" }}
                            onClick={(e) => e.stopPropagation()} // ← PREVENTS CLOSING WHEN CLICKING INSIDE
                        >
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <Search size={26} className="text-gray-500" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search the empire..."
                                        className="flex-1 bg-transparent outline-none text-lg font-medium text-gray-900 dark:text-gray-100"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setSearchOpen(false)}
                                        className="p-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                    >
                                        <X size={26} className="text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Results — solid background */}
                            <div className="overflow-y-auto bg-gray-50 dark:bg-gray-850" style={{ maxHeight: "calc(90vh - 80px)" }}>
                                {searchResults.length === 0 && !isSearching ? (
                                    <div className="p-12 text-center">
                                        <Search size={64} className="mx-auto mb-6 text-gray-300 dark:text-gray-600" />
                                        <p className="text-lg text-gray-500 dark:text-gray-400">No results found</p>
                                        <p className="text-sm text-gray-400 mt-2">Try searching for customers, invoices, or staff</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {searchResults.map((result, index) => {
                                            const isLast = index === searchResults.length - 1;
                                            return (
                                                <div ref={isLast ? lastResultRef : null} key={`${result.type}-${result.id}`}>
                                                    <a
                                                        href={result.href}
                                                        onClick={(e) => {
                                                            e.preventDefault(); // Prevent navigation if needed
                                                            trackSearchClick(result, index + 1);
                                                            api.post('/users/search-click/', {
                                                                search_term: searchQuery,
                                                                result: {
                                                                    title: result.title,
                                                                    type: result.type,
                                                                    href: result.href,
                                                                    position: index + 1
                                                                }
                                                            }).catch(() => {});
                                                            // Optional: close search after click
                                                            // setSearchOpen(false);
                                                        }}
                                                        className="flex items-center gap-5 px-6 py-5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                                    >
                                                        {getIcon(result.type)}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                                                <HighlightText text={result.title} query={searchQuery} />
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                                <HighlightText text={result.subtitle} query={searchQuery} />
                                                            </p>
                                                        </div>
                                                    </a>
                                                </div>
                                            );
                                        })}
                                        {isSearching && (
                                            <div className="p-12 text-center">
                                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
                                                <p className="mt-6 text-gray-500">Searching the empire...</p>
                                            </div>
                                        )}
                                        {!hasMore && searchResults.length > 0 && (
                                            <div className="p-6 text-center text-gray-500 text-sm">
                                                End of results
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}