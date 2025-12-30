"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { UserCircle2 } from "lucide-react";
import Cookies from "js-cookie";
import { WSClient } from "@/lib/ws";
import api from "@/lib/api";

type User = {
    id: number;
    username: string;
    profile_picture?: string | null;
    is_online: boolean;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
};


type UsersSidebarProps = {
    selectedUser: User | null;
    onSelectUser: (user: User) => void;
};

export default function UsersSidebar({ selectedUser, onSelectUser }: UsersSidebarProps) {
    const [users, setUsers] = useState<User[]>([]);
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/users/`;

    useEffect(() => {
        // Initial fetch
        api.get("/users/sidebar-users/").then((res) => setUsers(res.data));

        // WebSocket for real-time updates
        const ws = new WSClient(wsUrl);
        ws.onMessage((data) => {
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === data.user_id
                        ? { ...u, ...data }
                        : u
                )
            );
        });

        return () => ws.close();
    }, []);

    // WebSocket for sidebar updates (online/offline + last message/unread count)
    useEffect(() => {
        const ws = new WSClient(`${process.env.NEXT_PUBLIC_WS_URL}/users/`);
        ws.onMessage((data) => {
            setUsers((prev) =>
                prev.map((u) => {
                    if (u.id === data.user_id) {
                        return { ...u, ...data };
                    }
                    return u;
                })
            );
        });

        return () => ws.close();
    }, []);

    return (
        <div className="w-1/3 min-w-[260px] border-r dark:border-gray-800 flex flex-col">
            <div className="p-4 font-semibold text-lg text-gray-900 dark:text-gray-100 border-b dark:border-gray-800">
                Chats
            </div>
            <div className="flex-1 overflow-auto">
                {users.map((u) => (
                    <div
                        key={u.id}
                        onClick={() => onSelectUser(u)}
                        className={`flex items-center gap-3 p-3 cursor-pointer ${
                            selectedUser?.id === u.id ? "bg-blue-50 dark:bg-blue-900" : "bg-transparent"
                        }`}
                    >
                        <div className="relative w-12 h-12">
                            {u.profile_picture ? (
                                <Image src={u.profile_picture} alt={u.username} width={48} height={48} className="rounded-full object-cover" />
                            ) : (
                                <UserCircle2 size={48} className="text-gray-400" />
                            )}
                            <span
                                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                                    u.is_online ? "bg-green-400" : "bg-gray-400"
                                }`}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{u.username}</div>
                            <div className="text-xs text-gray-500 truncate">
                                {u.is_online
                                    ? "Online"
                                    : u.last_message_time
                                        ? `Last seen ${new Date(u.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                        : "Offline"}
                            </div>
                        </div>
                        {u.unread_count ? (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{u.unread_count}</span>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
