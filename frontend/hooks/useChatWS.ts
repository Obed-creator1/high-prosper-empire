// hooks/useChatWS.ts
"use client";
import { useState, useEffect } from "react";
import { WSClient } from "@/lib/ws";

export default function useChatWS(roomId: string | number) {
    const [messages, setMessages] = useState<any[]>([]);
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/chat/${roomId}/`;

    useEffect(() => {
        const client = new WSClient(wsUrl);

        client.onMessage((data) => {
            if (data.type === "chat_message") {
                setMessages((prev) => [...prev, data]);
            }
        });

        return () => client.close();
    }, [roomId]);

    const sendMessage = (text: string) => {
        const data = { message: text };
        // sending JSON → WS server
        const client = new WSClient(wsUrl);
        client.send(data);
    };

    return { messages, sendMessage };
}
