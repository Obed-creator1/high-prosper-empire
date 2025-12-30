// components/NotificationBell.tsx — FULL REAL-TIME NOTIFICATION SYSTEM WITH SETTINGS
"use client";

import { useState, useEffect, useRef } from "react";
import {
    Bell, BellRing, X, Check, Circle, CheckCircle2, AlertCircle, Info,
    Clock, DollarSign, UserCheck, AlertTriangle, Sparkles, MessageSquare,
    Users, Crown, BellOff, Trash2, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

// Notification Interface
interface Notification {
    id: number;
    title?: string;
    message?: string;
    description?: string;
    unread: boolean;
    created_at: string;
    notification_type?: string;
    action_url?: string;
    image?: string;
    verb?: string;
}

// Settings Interface
interface NotificationSettings {
    notify_realtime: boolean;
    notify_browser: boolean;
    notify_sound: boolean;
    notify_payment: boolean;
    notify_customer_update: boolean;
    notify_chat: boolean;
    notify_task: boolean;
    notify_leave: boolean;
    notify_system: boolean;
    // ... add more types as needed
}

const getCategoryConfig = (type: string = "info") => {
    const configs: Record<string, any> = {
        success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50/80', dot: 'bg-green-500', ring: 'ring-green-500/20', sound: 'success' },
        error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50/80', dot: 'bg-red-500', ring: 'ring-red-500/20', sound: 'error' },
        chat: { icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50/80', dot: 'bg-pink-500', ring: 'ring-pink-500/20', sound: 'chat' },
        group: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50/80', dot: 'bg-indigo-500', ring: 'ring-indigo-500/20', sound: 'group' },
        admin: { icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-50/80', dot: 'bg-yellow-500', ring: 'ring-yellow-500/20', sound: 'admin' },
        info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50/80', dot: 'bg-blue-500', ring: 'ring-blue-500/20', sound: 'default' },
        create: { icon: Sparkles, color: 'text-green-600', bg: 'bg-green-50/80', dot: 'bg-green-500', sound: 'success' },
        update: { icon: Edit2, color: 'text-blue-600', bg: 'bg-blue-50/80', dot: 'bg-blue-500', sound: 'default' },
        delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50/80', dot: 'bg-red-500', sound: 'error' },
        payment_success: { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50/80', dot: 'bg-green-500', sound: 'success' },
        payment_pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50/80', dot: 'bg-yellow-500', sound: 'default' },
        payment_failed: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50/80', dot: 'bg-red-500', sound: 'error' },
    };
    return configs[type] || configs.info;
};

const SOUND_URLS = {
    default: "/sounds/notification.mp3",
    success: "/sounds/success.mp3",
    error: "/sounds/alert.mp3",
    chat: "/sounds/chat.mp3",
    group: "/sounds/group.mp3",
    admin: "/sounds/admin.mp3",
};

const playNotificationSound = (type: string = "default") => {
    const audio = new Audio(SOUND_URLS[type] || SOUND_URLS.default);
    audio.volume = 0.6;
    audio.play().catch(() => console.log("Sound blocked by browser"));
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Helper: Safe format date
    const safeFormatDate = (dateStr?: string) => {
        if (!dateStr) return "Just now";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "Just now";
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (err) {
            return "Just now";
        }
    };

    // Fetch user notification settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get("/users/notification-settings/");
                setSettings(res.data);
            } catch (err) {
                console.error("Failed to load settings:", err);
                toast.error("Could not load notification settings");
            }
        };
        fetchSettings();
    }, []);

    // Fetch initial notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const res = await api.get("/notifications/api/notifications/");
                const data = Array.isArray(res.data)
                    ? res.data
                    : res.data?.results || res.data?.data || [];

                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => n.unread).length);
            } catch (err) {
                console.error("Failed to load notifications:", err);
                toast.error("Could not load notifications");
            } finally {
                setIsLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    // Real-time WebSocket — Only connect if realtime is enabled
    useEffect(() => {
        if (!settings?.notify_realtime) {
            console.log("Realtime notifications disabled by user settings");
            return;
        }

        let reconnectTimeout: NodeJS.Timeout | null = null;
        const token = Cookies.get("token");

        if (!token) {
            console.warn("No auth token — notifications disabled");
            return;
        }

        const connectWebSocket = () => {
            const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/notifications/?token=${token}`;

            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log("Notification WS Connected");
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Skip if user disabled this type
                    const type = data.notification_type || data.verb || "info";
                    if (
                        (type.includes("payment") && !settings.notify_payment) ||
                        (type.includes("update") && !settings.notify_customer_update) ||
                        (type === "chat" && !settings.notify_chat) ||
                        (type === "task" && !settings.notify_task) ||
                        (type === "leave" && !settings.notify_leave) ||
                        (type === "system" && !settings.notify_system)
                    ) {
                        return; // Skip this notification
                    }

                    if (data.type === "notification") {
                        const newNotif: Notification = {
                            id: data.id || Date.now(),
                            title: data.title || data.verb || "Notification",
                            message: data.message || data.description || "New update",
                            unread: true,
                            created_at: data.timestamp || new Date().toISOString(),
                            notification_type: type,
                            action_url: data.action_url,
                            image: data.image,
                            verb: data.verb,
                        };

                        setNotifications(prev => [newNotif, ...prev]);
                        setUnreadCount(prev => prev + 1);

                        // Sound only if enabled
                        if (settings.notify_sound) {
                            const config = getCategoryConfig(type);
                            playNotificationSound(config.sound);
                        }

                        // Browser push only if enabled
                        if (settings.notify_browser && Notification.permission === "granted" && document.hidden) {
                            new Notification(newNotif.title, {
                                body: newNotif.message,
                                icon: "/icon-192x192.png",
                                badge: "/badge-72x72.png",
                                image: newNotif.image,
                                vibrate: [200, 100, 200],
                                tag: "high-prosper-notification"
                            });
                        }

                        // Toast always (non-blocking)
                        toast(newNotif.message, {
                            duration: 5000,
                            position: "top-right"
                        });
                    } else if (data.type === "unread_count") {
                        setUnreadCount(data.count);
                    }
                } catch (err) {
                    console.error("Invalid WS message:", err);
                }
            };

            wsRef.current.onerror = (err) => console.error("WS error:", err);
            wsRef.current.onclose = () => {
                console.log("WS closed");
                reconnectTimeout = setTimeout(connectWebSocket, 5000);
            };
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [settings]);

    // Mark single as read
    const markAsRead = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/mark-read/`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            await api.post("/notifications/mark_all_as_read/");  // FIXED: correct URL
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            toast.error("Failed to mark all as read");
        }
    };

    const recent = notifications.slice(0, 10);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:scale-110 transition-all">
                    {unreadCount > 0 ? (
                        <BellRing className="h-6 w-6 text-purple-600 animate-pulse" />
                    ) : (
                        <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    )}

                    {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full min-w-6 h-6 flex items-center justify-center shadow-lg animate-bounce">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 max-h-96 overflow-y-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-2 border-purple-200 dark:border-purple-800 shadow-2xl">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-2xl font-bold">Notifications</h3>
                            <p className="text-sm opacity-90">You have {unreadCount} unread</p>
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={markAllAsRead}
                                className="bg-white/20 hover:bg-white/30 text-white border-0"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>

                <DropdownMenuSeparator className="h-px bg-purple-200 dark:bg-purple-800" />

                {recent.length === 0 ? (
                    <DropdownMenuItem className="text-center py-16 text-gray-500">
                        <BellOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl font-medium">All caught up!</p>
                        <p className="text-sm">No new notifications</p>
                    </DropdownMenuItem>
                ) : (
                    <>
                        {recent.map((n) => {
                            const config = getCategoryConfig(n.notification_type || n.verb || "info");
                            const Icon = config.icon;

                            return (
                                <DropdownMenuItem
                                    key={n.id}
                                    className={`flex items-start gap-4 py-5 px-6 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                        n.unread ? `${config.bg} ${config.ring} ring-4` : ""
                                    }`}
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        if (n.unread) markAsRead(n.id);
                                        if (n.action_url) window.location.href = n.action_url;
                                    }}
                                >
                                    {n.unread && (
                                        <div className={`w-3 h-3 rounded-full ${config.dot} animate-pulse mt-2`} />
                                    )}

                                    <div className={`p-3 rounded-2xl ${config.bg} ${config.color}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-lg">{n.title || n.verb || "Notification"}</h4>
                                            <span className="text-xs text-gray-500">
                                                {safeFormatDate(n.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                            {n.message || n.description || "New update"}
                                        </p>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })}

                        {notifications.length > 10 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="justify-center font-bold text-purple-600 hover:bg-purple-50">
                                    View all notifications →
                                </DropdownMenuItem>
                            </>
                        )}
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}