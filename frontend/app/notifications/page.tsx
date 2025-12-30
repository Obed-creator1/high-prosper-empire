// app/notifications/page.tsx — THE ULTIMATE NOTIFICATIONS CENTER 2025
"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell, BellRing, Check, X, Search, Filter, Clock, AlertCircle,
    CheckCircle2, Info, Zap, MessageSquare, Users, Crown,
    Settings, ChevronLeft, Trash2, Archive, BellOff, Reply,
    Star, Send, Volume2, VolumeX, Cog
} from "lucide-react";
import api from "@/lib/api";

// HAPTIC FEEDBACK — GOD-TIER VIBRATION
const useHaptics = () => {
    const trigger = (pattern: "light" | "medium" | "heavy" | "success" | "error" = "light") => {
        if ("vibrate" in navigator) {
            const patterns: Record<string, number | number[]> = {
                light: 50,
                medium: 100,
                heavy: 200,
                success: [100, 50, 100],
                error: [200, 100, 200],
            };
            navigator.vibrate(patterns[pattern] || 50);
        }
    };
    return { trigger };
};

// SOUND EFFECTS
const SOUND_URLS = {
    default: "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3",
    chat: "https://assets.mixkit.co/sfx/preview/mixkit-message-pop-alert-2353.mp3",
    success: "https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3",
    error: "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3",
    group: "https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3",
};

const playSound = (type: string) => {
    const audio = new Audio(SOUND_URLS[type] || SOUND_URLS.default);
    audio.volume = 0.6;
    audio.play().catch(() => {});
};

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    notification_type: 'info' | 'success' | 'warning' | 'error' | 'chat' | 'group' | 'admin' | 'system';
    action_url?: string;
    sender?: { id: number; username: string; profile_picture: string | null };
}

const getTypeConfig = (type: string) => {
    const configs = {
        success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", ring: "ring-green-500/20", sound: "success", haptic: "success" },
        error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", ring: "ring-red-500/20", sound: "error", haptic: "error" },
        warning: { icon: Zap, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-500/20", sound: "default", haptic: "medium" },
        chat: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", ring: "ring-purple-500/20", sound: "chat", haptic: "light" },
        group: { icon: Users, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", ring: "ring-indigo-500/20", sound: "group", haptic: "medium" },
        admin: { icon: Crown, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", ring: "ring-yellow-500/20", sound: "success", haptic: "heavy" },
        system: { icon: Settings, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200", ring: "ring-cyan-500/20", sound: "default", haptic: "light" },
        info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", ring: "ring-blue-500/20", sound: "default", haptic: "light" },
    };
    return configs[type] || configs.info;
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filtered, setFiltered] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const haptic = useHaptics().trigger;

    const token = Cookies.get("token");

    // Fetch initial notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await api.get("/inbox/notifications/");
                const data = res.data.results || res.data || [];
                setNotifications(data);
                setFiltered(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load notifications");
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    // REAL-TIME NOTIFICATIONS + SOUND + HAPTIC
    useEffect(() => {
        if (!token) return;

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL?.replace(/^http/, 'ws')}/ws/notifications/?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log("Real-time notifications connected");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "notification") {
                const newNotif: Notification = {
                    id: data.id || Date.now(),
                    title: data.title,
                    message: data.message,
                    is_read: false,
                    created_at: new Date().toISOString(),
                    notification_type: data.notification_type || "info",
                    action_url: data.action_url,
                    sender: data.sender
                };

                setNotifications(prev => [newNotif, ...prev]);

                // Sound + Haptic
                if (soundEnabled) {
                    const config = getTypeConfig(newNotif.notification_type);
                    playSound(config.sound);
                    haptic(config.haptic as any);
                }

                // Browser notification
                if (Notification.permission === "granted" && document.hidden) {
                    new Notification(data.title, {
                        body: data.message,
                        icon: "/icon-192x192.png",
                        vibrate: [200, 100, 200],
                        tag: "realtime"
                    });
                }
            }
        };

        return () => ws.close();
    }, [token, soundEnabled, haptic]);

    // Search & Filter
    useEffect(() => {
        let result = notifications;

        if (searchQuery) {
            result = result.filter(n =>
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.message.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterType !== "all") {
            result = result.filter(n => n.notification_type === filterType);
        }

        setFiltered(result);
    }, [searchQuery, filterType, notifications]);

    const markAsRead = async (id: number) => {
        await api.post(`/inbox/notifications/${id}/mark_as_read/`);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        haptic("success");
    };

    const markAllAsRead = async () => {
        await api.post("/inbox/notifications/mark_all_as_read/");
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        haptic("success");
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
        if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
        return formatDistanceToNow(d, { addSuffix: true });
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:to-black">
            {/* Header */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-2xl sticky top-0 z-40"
            >
                <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-6"
                    >
                        <button onClick={() => window.history.back()} className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all hover:scale-110">
                            <ChevronLeft size={36} />
                        </button>
                        <div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Notifications
                            </h1>
                            <p className="text-xl text-gray-600 dark:text-gray-400 mt-2">
                                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-4 rounded-full transition-all hover:scale-110 ${soundEnabled ? "bg-purple-100 text-purple-600" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}
                        >
                            {soundEnabled ? <Volume2 size={28} /> : <VolumeX size={28} />}
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-3 px-6 py-4 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:shadow-xl transition-all hover:scale-105"
                        >
                            <Filter size={24} />
                            Filters
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105"
                            >
                                <Check size={24} />
                                Mark All Read
                            </button>
                        )}
                        <Link href="/notifications/settings">
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 360 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all group"
                            >
                                <Cog size={28} className="group-hover:animate-spin" />
                                Settings
                            </motion.button>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Search */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <div className="relative">
                        <Search className="absolute left-6 top-6 text-gray-400" size={28} />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-20 pr-6 py-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl outline-none focus:ring-4 focus:ring-purple-400 text-xl shadow-2xl"
                        />
                    </div>
                </motion.div>

                {/* Notifications List */}
                <AnimatePresence>
                    {loading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                            <div className="animate-spin rounded-full h-20 w-20 border-8 border-purple-600 border-t-transparent mx-auto"></div>
                            <p className="text-2xl text-gray-600 dark:text-gray-400 mt-8">Loading your notifications...</p>
                        </motion.div>
                    ) : filtered.length === 0 ? (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-24">
                            <BellOff size={140} className="mx-auto text-gray-300 dark:text-gray-600 mb-8" />
                            <h3 className="text-4xl font-bold text-gray-500 dark:text-gray-400 mb-4">
                                {searchQuery || filterType !== "all" ? "No matching notifications" : "All caught up!"}
                            </h3>
                        </motion.div>
                    ) : (
                        filtered.map((notif, index) => {
                            const config = getTypeConfig(notif.notification_type);
                            const Icon = config.icon;

                            return (
                                <motion.div
                                    key={notif.id}
                                    layout
                                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -300, scale: 0.8 }}
                                    transition={{
                                        duration: 0.6,
                                        delay: index * 0.1,
                                        type: "spring",
                                        stiffness: 100
                                    }}
                                    whileHover={{
                                        scale: 1.02,
                                        boxShadow: "0 30px 60px rgba(139, 92, 246, 0.25)"
                                    }}
                                    className={`relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-4 transition-all ${
                                        !notif.is_read
                                            ? `${config.border} ${config.ring} ring-8`
                                            : "border-gray-200 dark:border-gray-700"
                                    }`}
                                >
                                    {/* Floating particles for unread */}
                                    {!notif.is_read && (
                                        <div className="absolute inset-0 pointer-events-none">
                                            <motion.div
                                                animate={{ y: [-20, -60], opacity: [1, 0] }}
                                                transition={{ repeat: Infinity, duration: 3 }}
                                                className="absolute top-8 right-12 w-4 h-4 bg-purple-500 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ y: [-30, -80], opacity: [1, 0] }}
                                                transition={{ repeat: Infinity, duration: 4, delay: 1 }}
                                                className="absolute top-16 right-20 w-3 h-3 bg-pink-500 rounded-full"
                                            />
                                        </div>
                                    )}

                                    <div className="relative z-10 flex items-start gap-6">
                                        <motion.div
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 0.6 }}
                                            className={`p-5 rounded-3xl ${config.bg} ${config.color} shadow-2xl`}
                                        >
                                            <Icon size={48} />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex-1"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.4 }}
                                                        className="flex items-center gap-4"
                                                    >
                                                        <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                                            {notif.title}
                                                        </h3>
                                                        {!notif.is_read && (
                                                            <motion.div
                                                                animate={{ scale: [1, 1.4, 1] }}
                                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                                className="w-5 h-5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg"
                                                            />
                                                        )}
                                                    </motion.div>

                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.5 }}
                                                        className="text-xl text-gray-700 dark:text-gray-300 mt-4 leading-relaxed"
                                                    >
                                                        {notif.message}
                                                    </motion.p>

                                                    {notif.sender && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ type: "spring", delay: 0.6 }}
                                                            className="flex items-center gap-4 mt-6"
                                                        >
                                                            <Image
                                                                src={notif.sender.profile_picture || "/default-avatar.png"}
                                                                width={56}
                                                                height={56}
                                                                alt={notif.sender.username}
                                                                className="rounded-full ring-4 ring-purple-300 shadow-xl"
                                                            />
                                                            <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {notif.sender.username}
                              </span>
                                                        </motion.div>
                                                    )}

                                                    {/* ACTIONS */}
                                                    <motion.div
                                                        initial={{ y: 30, opacity: 0 }}
                                                        animate={{ y: 0, opacity: 1 }}
                                                        transition={{ delay: 0.7 }}
                                                        className="flex items-center gap-4 mt-8"
                                                    >
                                                        {notif.action_url && (
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    window.location.href = notif.action_url!;
                                                                    if (!notif.is_read) markAsRead(notif.id);
                                                                }}
                                                                className="flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all"
                                                            >
                                                                <MessageSquare size={28} />
                                                                Open Chat
                                                            </motion.button>
                                                        )}

                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className="flex items-center gap-3 px-6 py-5 bg-gray-100 dark:bg-gray-700 rounded-2xl font-bold hover:shadow-2xl transition-all"
                                                        >
                                                            <Reply size={26} />
                                                            Reply
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.3, rotate: 360 }}
                                                            whileTap={{ scale: 0.8 }}
                                                            className="p-5 bg-yellow-100 dark:bg-yellow-900/50 rounded-2xl hover:shadow-2xl transition-all"
                                                        >
                                                            <Star size={28} className="text-yellow-600" />
                                                        </motion.button>

                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            className="p-5 bg-red-100 dark:bg-red-900/50 rounded-2xl hover:shadow-2xl transition-all"
                                                        >
                                                            <Trash2 size={28} className="text-red-600" />
                                                        </motion.button>
                                                    </motion.div>
                                                </div>

                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.8 }}
                                                    className="text-right"
                                                >
                                                    <p className="text-lg text-gray-500 dark:text-gray-400">
                                                        {formatDate(notif.created_at)}
                                                    </p>
                                                    {!notif.is_read && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            onClick={() => markAsRead(notif.id)}
                                                            className="mt-4 text-lg font-bold text-purple-600 hover:text-purple-700"
                                                        >
                                                            Mark as read
                                                        </motion.button>
                                                    )}
                                                </motion.div>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}