// components/NotificationBell.tsx — HIGH PROSPER NOTIFICATION BELL 2026
"use client";

import { useState, useEffect, useRef } from "react";
import {
    Bell, BellRing, X, Check, Circle, CheckCircle2, AlertCircle, Info,
    Clock, DollarSign, UserCheck, AlertTriangle, Sparkles, MessageSquare,
    Users, Crown, BellOff, Trash2, Edit2, MoreVertical, Eye, EyeOff
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

interface Notification {
    id: number;
    title?: string;
    message?: string;
    description?: string;
    unread: boolean;
    created_at: string;
    notification_type?: string;
    action_url?: string;
    verb?: string;
}

const getCategoryConfig = (type: string = "info") => {
    const configs: Record<string, any> = {
        success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
        error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
        warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' },
        chat: { icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50', dot: 'bg-pink-500' },
        group: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', dot: 'bg-indigo-500' },
        admin: { icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
        create: { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
        update: { icon: Edit2, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
        delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
        sector: { icon: Crown, color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-600' },
        cell: { icon: Users, color: 'text-indigo-700', bg: 'bg-indigo-50', dot: 'bg-indigo-600' },
        village: { icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50', dot: 'bg-teal-500' },
        info: { icon: Info, color: 'text-cyan-600', bg: 'bg-cyan-50', dot: 'bg-cyan-500' },
    };
    return configs[type.toLowerCase()] || configs.info;
};

export default function NotificationBell() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const wsRef = useRef<WebSocket | null>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoading(true);
            try {
                const res = await api.get("/notifications/api/notifications/");
                const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
                const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setNotifications(sorted);
                setUnreadCount(sorted.filter((n: Notification) => n.unread).length);
            } catch (err) {
                toast.error("Failed to load notifications");
            } finally {
                setIsLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) return;

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/notifications/?token=${token}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "notification") {
                    const newNotif: Notification = {
                        id: data.id || Date.now(),
                        title: data.title || "New Update",
                        message: data.message || data.description,
                        unread: true,
                        created_at: data.timestamp || new Date().toISOString(),
                        notification_type: data.notification_type || data.verb,
                        action_url: data.action_url,
                        verb: data.verb,
                    };
                    setNotifications(prev => {
                        const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id)];
                        return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    });
                    setUnreadCount(prev => prev + 1);
                    toast(newNotif.title, { description: newNotif.message, duration: 6000 });
                }
            } catch (err) {
                console.error("WS error:", err);
            }
        };

        return () => wsRef.current?.close();
    }, []);

    // Auto-update time every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Updated safeFormatDate — uses current time
    const safeFormatDate = (dateStr?: string) => {
        if (!dateStr) return "Just now";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "Just now";
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return "Just now";
        }
    };

    const markAsRead = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/mark-read/`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            toast.error("Failed");
        }
    };

    const deleteNotification = async (id: number) => {
        try {
            await api.delete(`/notifications/${id}/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => prev - (notifications.find(n => n.id === id)?.unread ? 1 : 0));
            toast.success("Deleted");
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post("/notifications/mark_all_as_read/");
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
            setUnreadCount(0);
            toast.success("All marked as read");
        } catch (err) {
            toast.error("Failed");
        }
    };

    const displayedNotifications = activeTab === "unread"
        ? notifications.filter(n => n.unread)
        : notifications;

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
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-bounce">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-96 max-h-[80vh] p-0 bg-white dark:bg-gray-900 shadow-2xl border border-purple-200 dark:border-purple-800">
                {/* Professional Header */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-black">Notifications Center</h2>
                            <p className="text-sm opacity-90">Stay updated with real-time alerts</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black">{unreadCount}</p>
                            <p className="text-xs opacity-80">Unread</p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <Button variant="secondary" size="sm" onClick={markAllAsRead} className="w-full bg-white/20 hover:bg-white/30">
                            <Check className="h-4 w-4 mr-2" /> Mark All as Read
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-none bg-gray-100 dark:bg-gray-800">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-0">
                        <ScrollArea className="h-96">
                            {isLoading ? (
                                <div className="p-12 text-center text-gray-500">Loading notifications...</div>
                            ) : displayedNotifications.length === 0 ? (
                                <div className="p-16 text-center">
                                    <BellOff className="h-20 w-20 mx-auto text-gray-300 mb-4" />
                                    <p className="text-xl font-medium text-gray-600 dark:text-gray-400">
                                        {activeTab === "unread" ? "No unread notifications" : "All caught up!"}
                                    </p>
                                </div>
                            ) : (
                                displayedNotifications.map((n) => {
                                    const config = getCategoryConfig(n.notification_type || n.verb || "info");
                                    const Icon = config.icon;

                                    return (
                                        <div
                                            key={n.id}
                                            className={`relative p-5 border-b border-gray-200 dark:border-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all cursor-pointer ${
                                                n.unread ? "bg-purple-50/50 dark:bg-purple-900/20" : ""
                                            }`}
                                            onClick={() => {
                                                if (n.unread) markAsRead(n.id);
                                                if (n.action_url) router.push(n.action_url);
                                            }}
                                        >
                                            {/* Unread dot */}
                                            {n.unread && (
                                                <div className={`absolute left-3 top-8 w-3 h-3 rounded-full ${config.dot} animate-pulse`} />
                                            )}

                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${config.bg} flex-shrink-0`}>
                                                    <Icon className={`h-6 w-6 ${config.color}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <h4 className={`font-bold ${n.unread ? "text-purple-900 dark:text-purple-100" : "text-gray-900 dark:text-gray-100"}`}>
                                                            {n.title || "System Update"}
                                                        </h4>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-60 hover:opacity-100">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {n.unread ? (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>
                                                                        <Check className="h-4 w-4 mr-2" /> Mark as Read
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>
                                                                        <Eye className="h-4 w-4 mr-2" /> Mark as Unread
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {n.action_url && (
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(n.action_url); }}>
                                                                        <Eye className="h-4 w-4 mr-2" /> View Details
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line">
                                                        {n.message || n.description || "No message"}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-3">
                                                        {safeFormatDate(n.created_at)}
                                                        {/* Hidden dependency to trigger re-render */}
                                                        <span className="hidden">{currentTime}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                {notifications.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
                        <Button
                            variant="ghost"
                            className="text-purple-600 hover:text-purple-700 font-medium"
                            onClick={() => router.push("/dashboard/notifications")}
                        >
                            View All Notifications →
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}