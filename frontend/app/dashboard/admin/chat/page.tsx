"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Image from "next/image";
import api from "@/lib/api";
import ChatInputToolbar from "@/components/ChatInputToolbar";
import { User, Message } from "@/types";

function UsersSidebar({ users, selectedUser, onSelectUser }: { users: User[]; selectedUser: User | null; onSelectUser: (u: User) => void }) {
    return (
        <div className="p-3">
            <h2 className="p-2 font-semibold text-lg">Users</h2>
            {users.map((u) => (
                <div
                    key={u.id}
                    onClick={() => onSelectUser(u)}
                    className={`p-2 flex items-center space-x-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedUser?.id === u.id ? "bg-gray-200 dark:bg-gray-700" : ""}`}
                >
                    <Image src={u.profile_picture || "/default-avatar.png"} width={42} height={42} alt={u.username} className="rounded-full" />
                    <div>
                        <div className="font-medium">{u.username}</div>
                        <div className="text-xs text-gray-500">
                            {u.last_message}
                            {u.unread_count > 0 && ` (${u.unread_count})`}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ChatPage() {
    const token = Cookies.get("token")!;
    const userId = Number(Cookies.get("user_id"));
    const wsBase = process.env.NEXT_PUBLIC_WS_URL;

    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [typing, setTyping] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Load sidebar users + live WS updates
    useEffect(() => {
        api.get("/users/sidebar-users/", { headers: { Authorization: `Token ${token}` } })
            .then((res) => setUsers(res.data))
            .catch((err) => console.error("Sidebar fetch error:", err));

        const wsUsers = new WebSocket(`${wsBase}/ws/users/`);
        wsUsers.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setUsers((prev) => prev.map((u) => (u.id === data.user_id ? { ...u, ...data } : u)));
        };

        return () => wsUsers.close();
    }, []);

    // Load messages whenever selected user changes
    useEffect(() => {
        if (!selectedUser) return;

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/users/messages/?recipient=${selectedUser.id}`, {
                    headers: { Authorization: `Token ${token}` },
                });
                setMessages(res.data);
            } catch (err) {
                console.error("Message fetch error:", err);
            }
        };

        fetchMessages();

        // Close old WS and open chat WS
        if (ws) ws.close();

        const chatWS = new WebSocket(`${wsBase}/ws/chat/${selectedUser.id}/`);
        chatWS.onopen = () => console.log("Chat WS connected");
        chatWS.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "chat.message") setMessages((prev) => [...prev, data]);
            if (data.type === "typing") setTyping(data.is_typing && data.sender_id === selectedUser.id);
        };
        setWs(chatWS);

        return () => chatWS.close();
    }, [selectedUser]);

    const handleSelectUser = (user: User) => setSelectedUser(user);

    const sendMessage = (payload: any) => {
        if (!ws) return;
        ws.send(JSON.stringify(payload));
        setMessages((prev) => [...prev, { ...payload, id: Date.now(), timestamp: new Date().toISOString() }]);
    };

    const handleTyping = () => {
        if (!ws || !selectedUser) return;
        ws.send(JSON.stringify({ type: "typing", is_typing: true, receiver_id: selectedUser.id }));
        setTimeout(() => ws.send(JSON.stringify({ type: "typing", is_typing: false, receiver_id: selectedUser.id })), 800);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <div className={`fixed inset-y-0 left-0 z-20 w-64 bg-white dark:bg-gray-800 border-r transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <UsersSidebar users={users} selectedUser={selectedUser} onSelectUser={handleSelectUser} />
            </div>

            {sidebarOpen && <div className="fixed inset-0 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

            <div className="flex-1 flex flex-col ml-0 md:ml-64">
                <div className="p-2 border-b bg-white dark:bg-gray-800 flex justify-between md:hidden">
                    <button onClick={() => setSidebarOpen(true)}>☰</button>
                    <div className="font-medium">{selectedUser?.username || "Select a user"}</div>
                    <div></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((m) => (
                        <div key={m.id} className={`${m.sender_id === userId ? "text-right" : "text-left"}`}>
                            {["image", "sticker", "gif", "emoji"].includes(m.attachment_type || "text") ? (
                                <img src={m.message} className="max-w-xs rounded" alt="attachment" />
                            ) : (
                                <span className="inline-block bg-gray-100 dark:bg-gray-700 p-2 rounded">{m.message}</span>
                            )}
                            <div className="text-xs text-gray-400">{new Date(m.timestamp).toLocaleTimeString()}</div>
                        </div>
                    ))}

                    {typing && <div className="text-sm italic text-gray-500">{selectedUser?.username} is typing…</div>}
                </div>

                {selectedUser && <ChatInputToolbar token={token} userId={userId} selectedUserId={selectedUser.id} sendMessage={sendMessage} handleTyping={handleTyping} />}
            </div>
        </div>
    );
}
