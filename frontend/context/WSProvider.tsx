"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { WSClient } from "@/lib/ws";

interface WSContextType {
    onlineUsers: any[];
    chatMessages: Record<string, any[]>;
    sendMessage: (roomId: string, message: string) => void;
}

const WSContext = createContext<WSContextType>({
    onlineUsers: [],
    chatMessages: {},
    sendMessage: () => {},
});

export const WSProvider = ({ children }: { children: React.ReactNode }) => {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [chatMessages, setChatMessages] = useState<Record<string, any[]>>({});

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    useEffect(() => {
        // Users WS
        const usersWS = new WSClient(`${wsUrl}/ws/users/`);
        usersWS.onMessage((data) => {
            if (data.type === "online_users") setOnlineUsers(data.users);
        });

        // Chat WS (global room subscription example)
        const chatWS = new WSClient(`${wsUrl}/ws/chat/global/`);
        chatWS.onMessage((data) => {
            if (data.type === "chat_message") {
                const room = data.room || "global";
                setChatMessages((prev) => ({
                    ...prev,
                    [room]: [...(prev[room] || []), data],
                }));
            }
        });

        return () => {
            usersWS.close();
            chatWS.close();
        };
    }, [wsUrl]);

    const sendMessage = (roomId: string, message: string) => {
        const client = new WSClient(`${wsUrl}/ws/chat/${roomId}/`);
        client.send({ message });
    };

    return (
        <WSContext.Provider value={{ onlineUsers, chatMessages, sendMessage }}>
            {children}
        </WSContext.Provider>
    );
};

export const useWS = () => useContext(WSContext);
