// app/chat/page.tsx — THE ULTIMATE 2025 CHAT EXPERIENCE (FINAL MASTERPIECE)
"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import Image from "next/image";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
    MoreVertical, Phone, Video, Camera, Search, Settings,
    Users, Crown, Bell, MessageSquare, Plus, ArrowRight
} from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import api from "@/lib/api";
import ChatInputToolbar from "@/components/ChatInputToolbar";
import NotificationBell from "@/components/NotificationBell";

interface User {
    id: number;
    username: string;
    profile_picture: string | null;
    is_online: boolean;
    last_seen?: string;
}

interface Group {
    id: number;
    name: string;
    image: string | null;
    room_id: string;
    member_count: number;
    online_count: number;
    is_admin: boolean;
}

interface Message {
    id: number;
    message: string;
    sender_id: number;
    sender?: { username: string; profile_picture: string | null };
    receiver_id?: number;
    room_id?: string;
    timestamp: string;
    attachment?: string;
    attachment_type?: "image" | "video" | "audio" | "file";
    seen_at?: string | null;
    delivered_at?: string | null;
}

type ChatTarget = User | Group;

export default function ChatPage() {
    const token = Cookies.get("token")!;
    const currentUserId = Number(Cookies.get("user_id"));
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

    const [sidebarUsers, setSidebarUsers] = useState<User[]>([]);
    const [sidebarGroups, setSidebarGroups] = useState<Group[]>([]);
    const [selectedChat, setSelectedChat] = useState<ChatTarget | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => scrollToBottom(), [messages]);

    // Load sidebar
    useEffect(() => {
        const loadSidebar = async () => {
            try {
                const [usersRes, groupsRes] = await Promise.all([
                    api.get("/users/sidebar-users/"),
                    api.get("/users/groups/my/")
                ]);
                setSidebarUsers(usersRes.data);
                setSidebarGroups(groupsRes.data);
            } catch (err) {
                console.error("Sidebar load failed", err);
            }
        };
        loadSidebar();
    }, []);

    // WebSocket connection
    useEffect(() => {
        if (!selectedChat) return;

        const wsUrl = "room_id" in selectedChat
            ? `${wsBase}/ws/group/${selectedChat.room_id}/`
            : `${wsBase}/ws/chat/${selectedChat.id}/?token=${token}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log("WebSocket Connected");
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "chat.message") {
                setMessages(prev => [...prev, data.payload]);
            }
            if (data.type === "typing_indicator") {
                if (data.is_typing) {
                    setTypingUsers(prev => new Set([...prev, data.username]));
                } else {
                    setTypingUsers(prev => {
                        const next = new Set(prev);
                        next.delete(data.username);
                        return next;
                    });
                }
            }
        };

        setWs(socket);
        return () => socket.close();
    }, [selectedChat, token, wsBase]);

    const sendMessage = (payload: any) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: "chat.message", ...payload }));
    };

    const isGroup = (chat: ChatTarget): chat is Group => "room_id" in chat;

    return (
        <div className="flex h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
            {/* Sidebar */}
            <div className="w-96 bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Header */}
                <motion.div
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl border-b border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex items-center justify-between"
                >
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        High Prosper Chat
                    </h1>

                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <NotificationBell />

                        {/* Groups Button */}
                        <Link href="/groups">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all"
                            >
                                <Users size={28} />
                                My Groups
                                <ArrowRight size={24} />
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>

                {/* Search */}
                <div className="p-6">
                    <div className="relative">
                        <Search className="absolute left-6 top-6 text-gray-400" size={28} />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-20 pr-6 py-6 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-xl rounded-3xl outline-none focus:ring-4 focus:ring-purple-400 text-xl shadow-2xl"
                        />
                    </div>
                </div>

                {/* Groups Section */}
                <div className="px-6 mb-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <Users size={32} className="text-indigo-600" />
                            Your Groups
                        </h2>
                        <Link href="/groups">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all"
                            >
                                <Plus size={24} />
                            </motion.button>
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {sidebarGroups.map(group => (
                            <motion.div
                                key={group.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedChat(group)}
                                className={`p-5 rounded-3xl cursor-pointer transition-all group ${
                                    selectedChat?.id === group.id
                                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-3xl ring-4 ring-purple-500/50"
                                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-xl"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Image
                                            src={group.image || "/group-avatar.png"}
                                            width={60}
                                            height={60}
                                            alt={group.name}
                                            className="rounded-full ring-4 ring-white dark:ring-gray-800"
                                        />
                                        <div>
                                            <h3 className="text-xl font-bold">{group.name}</h3>
                                            <p className={`text-sm ${selectedChat?.id === group.id ? "text-white/90" : "text-gray-600 dark:text-gray-400"}`}>
                                                {group.member_count} members • {group.online_count} online
                                            </p>
                                        </div>
                                    </div>
                                    {group.is_admin && <Crown className="text-yellow-400" size={28} />}
                                </div>

                                {/* Settings Link for Admin */}
                                {group.is_admin && selectedChat?.id === group.id && (
                                    <Link href={`/groups/${group.room_id}/settings`}>
                                        <motion.button
                                            whileHover={{ scale: 1.2, rotate: 360 }}
                                            className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-xl rounded-full shadow-2xl"
                                        >
                                            <Settings size={24} className="text-white" />
                                        </motion.button>
                                    </Link>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Direct Messages */}
                <div className="px-6">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                        <MessageSquare size={32} className="text-purple-600" />
                        Direct Messages
                    </h2>
                    <div className="space-y-3">
                        {sidebarUsers.map(user => (
                            <motion.div
                                key={user.id}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => setSelectedChat(user)}
                                className={`p-5 rounded-3xl cursor-pointer transition-all ${
                                    selectedChat?.id === user.id
                                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-3xl ring-4 ring-purple-500/50"
                                        : "bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-xl"
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Image
                                            src={user.profile_picture || "/default-avatar.png"}
                                            width={60}
                                            height={60}
                                            alt={user.username}
                                            className="rounded-full ring-4 ring-purple-300 dark:ring-purple-600"
                                        />
                                        {user.is_online && (
                                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 animate-pulse"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{user.username}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {user.is_online ? "Online" : "Offline"}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <motion.div
                            initial={{ y: -50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl border-b border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-6">
                                <Image
                                    src={isGroup(selectedChat) ? selectedChat.image || "/group-avatar.png" : selectedChat.profile_picture || "/default-avatar.png"}
                                    width={70}
                                    height={70}
                                    alt="avatar"
                                    className="rounded-full ring-8 ring-purple-300 dark:ring-purple-900 shadow-2xl"
                                />
                                <div>
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                        {isGroup(selectedChat) ? selectedChat.name : selectedChat.username}
                                    </h2>
                                    <p className="text-lg text-gray-600 dark:text-gray-400">
                                        {typingUsers.size > 0
                                            ? `${Array.from(typingUsers).join(", ")} is typing...`
                                            : isGroup(selectedChat)
                                                ? `${selectedChat.online_count} online`
                                                : (selectedChat as User).is_online ? "Online" : "Offline"
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {isGroup(selectedChat) && selectedChat.is_admin && (
                                    <Link href={`/groups/${selectedChat.room_id}/settings`}>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 360 }}
                                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-2xl hover:shadow-3xl transition-all"
                                        >
                                            <Settings size={28} />
                                            Group Settings
                                        </motion.button>
                                    </Link>
                                )}
                                <button className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all hover:scale-110">
                                    <Phone size={28} />
                                </button>
                                <button className="p-4 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all hover:scale-110">
                                    <Video size={28} />
                                </button>
                            </div>
                        </motion.div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gradient-to-b from-purple-50/50 to-pink-50/50 dark:from-gray-900 dark:to-black">
                            <AnimatePresence>
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className={`max-w-2xl px-8 py-6 rounded-3xl shadow-2xl ${
                                                msg.sender_id === currentUserId
                                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                                                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700"
                                            }`}
                                        >
                                            {msg.attachment_type === "image" && (
                                                <Image src={msg.attachment!} width={500} height={400} alt="sent" className="rounded-2xl shadow-lg mb-4" />
                                            )}
                                            <p className="text-xl leading-relaxed">{msg.message}</p>
                                            <div className="flex items-center justify-between mt-4">
                        <span className="text-sm opacity-70">
                          {format(new Date(msg.timestamp), "h:mm a")}
                        </span>
                                                {msg.sender_id === currentUserId && (
                                                    <span className="text-sm">
                            {msg.seen_at ? "✓✓" : msg.delivered_at ? "✓" : "✓"}
                          </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <ChatInputToolbar
                            token={token}
                            currentUserId={currentUserId}
                            selectedUserId={!isGroup(selectedChat) ? selectedChat.id : undefined}
                            roomId={isGroup(selectedChat) ? selectedChat.room_id : undefined}
                            sendMessage={sendMessage}
                            socket={ws}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="text-9xl mb-8">💬</div>
                            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
                                High Prosper Chat
                            </h1>
                            <p className="text-2xl text-gray-600 dark:text-gray-400">
                                Select a conversation or group to start messaging
                            </p>
                            <div className="flex items-center justify-center gap-8 mt-12">
                                <Link href="/groups">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-4 px-12 py-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl font-bold text-2xl shadow-3xl hover:shadow-4xl transition-all"
                                    >
                                        <Users size={48} />
                                        Join Groups
                                    </motion.button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}