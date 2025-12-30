"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Message = {
    id: number;
    sender_name: string;
    receiver_name: string;
    message: string;
    timestamp: string;
};

export default function SupportChat({ userId }: { userId: number }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");

    const fetchMessages = async () => {
        try {
            const res = await api.get(`/users/messages/?recipient=${userId}`);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        try {
            await api.post("/users/messages/", { receiver_id: userId, message: input });
            setInput("");
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-[400px] w-full border rounded p-2 dark:bg-gray-800">
            <div className="flex-1 overflow-y-auto space-y-2">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`p-2 rounded ${
                            m.sender_name === "You" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                    >
                        <p>{m.message}</p>
                        <span className="text-xs text-gray-500">{m.timestamp}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mt-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <Button onClick={sendMessage}>Send</Button>
            </div>
        </div>
    );
}
