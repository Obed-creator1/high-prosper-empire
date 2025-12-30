"use client";

import React, { useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Loader from "@/components/Loader";
import MessageComposer from "@/components/MessageComposer";
import { Pencil, Check, CheckCheck, Info, Edit, Share, Trash2 } from "lucide-react";
import UsersSidebar from "@/components/UsersSidebar"; // ✅ Sidebar component

type User = {
    id: number;
    username: string;
    profile_picture?: string | null;
    last_seen?: string | null;
    is_online?: boolean;
    last_message?: string | null;
    unread_count?: number;
};

type ChatMessage = {
    id?: number;
    sender_id: number;
    receiver_id: number;
    message?: string;
    attachment_url?: string | null;
    attachment_type?: string | null;
    timestamp?: string;
    delivered_at?: string | null;
    seen_at?: string | null;
};

export default function ChatPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [selectedMessages, setSelectedMessages] = useState<number[]>([]);
    const [myId, setMyId] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const token = Cookies.get("token");

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    // Load myId from cookie
    useEffect(() => {
        const id = Number(Cookies.get("userId"));
        if (!isNaN(id)) setMyId(id);
    }, []);

    // Fetch users
    useEffect(() => {
        if (!token) return;
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const res = await api.get("/users/chat-users/", {
                    headers: { Authorization: `Token ${token}` },
                });
                const userList = res.data.map((u: any) => ({
                    ...u,
                    is_online: u.last_seen
                        ? Date.now() - new Date(u.last_seen).getTime() < 5 * 60 * 1000
                        : false,
                }));
                setUsers(userList);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [token]);

    // Fetch messages for selected user
    useEffect(() => {
        if (!selectedUser || myId === null) return;
        const fetchMessages = async () => {
            try {
                const res = await api.get(`users/messages/?recipient=${selectedUser.id}`, {
                    headers: { Authorization: `Token ${token}` },
                });
                setMessages(res.data);
                scrollToBottom();
            } catch (err) {
                console.error(err);
            }
        };
        fetchMessages();
    }, [selectedUser, myId, token]);

    // WebSocket connection for chat
    useEffect(() => {
        if (!selectedUser || myId === null) return;
        const roomName = [myId, selectedUser.id].sort().join("_");
        const socket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomName}/`);
        setWs(socket);

        socket.onmessage = (ev) => {
            const data = JSON.parse(ev.data);
            if (data.type === "chat.message") {
                const incoming: ChatMessage = { ...data };
                if (incoming.sender_id === selectedUser.id || incoming.receiver_id === selectedUser.id) {
                    setMessages((prev) => [...prev, incoming]);
                    scrollToBottom();
                }
            }
        };

        return () => {
            socket.close();
            setWs(null);
        };
    }, [selectedUser, myId]);

    const handleSendMessage = async (payload: any) => {
        if (!selectedUser || myId === null) return;

        if (ws?.readyState === WebSocket.OPEN) {
            const message = {
                sender_id: myId,
                receiver_id: selectedUser.id,
                message: payload.message,
                timestamp: new Date().toISOString(),
            };
            ws.send(JSON.stringify(message));
            setMessages((prev) => [...prev, message]);
            scrollToBottom();
        }
    };

    const handleSendVoice = (file: File) => handleSendMessage({ attachments: [file] });

    const toggleMessageSelection = (msgId: number) => {
        setSelectedMessages((prev) =>
            prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
        );
    };

    // ---------------- Custom Toolbar ----------------
    const SelectedMessageToolbar = () => {
        if (selectedMessages.length === 0) return null;
        return (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-gray-800 p-2 rounded-xl shadow-lg flex gap-3 z-50">
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                    <Edit size={18} />
                </button>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                    <Share size={18} />
                </button>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                    <Info size={18} />
                </button>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                    <Trash2 size={18} />
                </button>
            </div>
        );
    };

    if (loading || myId === null) return <Loader />;

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900 relative">
            {/* ✅ Pass required props to UsersSidebar */}
            <UsersSidebar
                users={users}
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
            />

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative">
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800">
                    {selectedUser ? (
                        messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${m.sender_id === myId ? "justify-end" : "justify-start"} relative`}
                                onClick={() => m.id && toggleMessageSelection(m.id)}
                            >
                                {m.id && selectedMessages.includes(m.id) && (
                                    <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-2xl" />
                                )}
                                <div
                                    className={`max-w-[70%] p-3 rounded-2xl shadow-md relative ${
                                        m.sender_id === myId
                                            ? "bg-green-500 text-white rounded-br-none"
                                            : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                                    }`}
                                >
                                    {m.message && <div>{m.message}</div>}
                                    {m.timestamp && (
                                        <div className="flex justify-end text-[10px] opacity-75">
                                            {new Date(m.timestamp).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                            {m.sender_id === myId &&
                                                (m.seen_at ? <CheckCheck size={12} className="text-blue-400" /> : <Check size={12} />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">
                            Select a chat to start messaging
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                {selectedUser && (
                    <div className="border-t dark:border-gray-800 bg-white dark:bg-gray-900">
                        <MessageComposer
                            token={token || ""}
                            myId={myId}
                            selectedUserId={selectedUser.id}
                            TENOR_KEY={process.env.NEXT_PUBLIC_TENOR_API_KEY || ""}
                            onSendMessage={handleSendMessage}
                            onSendVoice={handleSendVoice}
                        />
                    </div>
                )}

                <SelectedMessageToolbar />
            </div>
        </div>
    );
}
