// NOTIFICATION SYSTEM — THE ULTIMATE ALERT & ENGAGEMENT ENGINE

import { Bell, BellRing, X, CheckCircle, AlertCircle, Info, Zap } from "lucide-react";

const [notifications, setNotifications] = useState<Notification[]>([]);
const [showNotifications, setShowNotifications] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

interface Notification {
    id: number;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "alert";
    timestamp: string;
    read: boolean;
}

// Simulate real-time notifications (replace with WebSocket later)
useEffect(() => {
    const sampleNotifications = [
        { id: 1, title: "New Member Joined", message: "Sarah Chen joined the group", type: "success" as const, timestamp: "2 minutes ago", read: false },
        { id: 2, title: "Message Reaction", message: "Alex reacted with to your message", type: "info" as const, timestamp: "5 minutes ago", read: false },
        { id: 3, title: "Group Announcement", message: "New weekly meeting schedule posted", type: "alert" as const, timestamp: "1 hour ago", read: false },
        { id: 4, title: "Bulk Message Sent", message: "Your message reached 342 members", type: "success" as const, timestamp: "2 hours ago", read: true },
    ];

    setNotifications(sampleNotifications);
    setUnreadCount(sampleNotifications.filter(n => !n.read).length);
}, []);

// Mark all as read
const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
};

// Clear notification
const clearNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
};

{/* NOTIFICATION BELL ICON — ADD TO YOUR HEADER */}
<div className="relative">
    <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all transform hover:scale-110"
    >
        {unreadCount > 0 ? (
            <BellRing size={28} className="text-purple-600 animate-pulse" />
        ) : (
            <Bell size={28} className="text-gray-600 dark:text-gray-300" />
        )}

        {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-bounce">
                {unreadCount > 99 ? "99+" : unreadCount}
            </div>
        )}
    </button>

    {/* NOTIFICATIONS PANEL */}
    {showNotifications && (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
            />

            {/* Panel */}
            <div className="absolute right-4 top-20 w-96 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-slide-down">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">Notifications</h3>
                        <div className="flex items-center gap-3">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition"
                                >
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setShowNotifications(false)}
                                className="p-2 hover:bg-white/20 rounded-full transition"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center">
                            <BellOff size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-xl text-gray-500 dark:text-gray-400">All caught up!</p>
                            <p className="text-gray-400 mt-2">No new notifications</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                className={`p-6 border-b border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                    !notif.read ? "bg-purple-50/50 dark:bg-purple-900/20" : ""
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`p-3 rounded-2xl ${
                                        notif.type === "success" ? "bg-green-100 text-green-600" :
                                            notif.type === "alert" ? "bg-red-100 text-red-600" :
                                                notif.type === "warning" ? "bg-yellow-100 text-yellow-600" :
                                                    "bg-blue-100 text-blue-600"
                                    }`}>
                                        {notif.type === "success" && <CheckCircle size={28} />}
                                        {notif.type === "alert" && <AlertCircle size={28} />}
                                        {notif.type === "warning" && <Zap size={28} />}
                                        {notif.type === "info" && <Info size={28} />}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-lg">{notif.title}</h4>
                                            {!notif.read && (
                                                <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                                            )}
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 mt-2">{notif.message}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">{notif.timestamp}</p>
                                    </div>

                                    <button
                                        onClick={() => clearNotification(notif.id)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition opacity-0 group-hover:opacity-100"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 text-center">
                    <button className="text-purple-600 dark:text-purple-400 font-bold hover:underline">
                        View all notifications →
                    </button>
                </div>
            </divName>
        </>
    )}
</div>