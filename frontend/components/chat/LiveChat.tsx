"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import Cookies from "js-cookie";

interface Message {
    id: number;
    message: string;
    sender_name: string;
    timestamp: string;
    is_me: boolean;
}

export default function LiveChat({ customerId }: { customerId: number }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const token = Cookies.get("token");
        ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${customerId}/?token=${token}`);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, {
                ...data,
                is_me: data.sender === "me"
            }]);
        };

        // Load history
        api.get("/customers/chat/").then(res => setMessages(res.data));

        return () => ws.current?.close();
    }, [customerId]);

    const sendMessage = () => {
        if (!input.trim() || !ws.current) return;
        ws.current.send(JSON.stringify({ message: input }));
        setInput("");
    };

    return (
        <div className="flex flex-col h-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="p-4 border-b">
                <h3 className="font-bold">Chat with Your Collector</h3>
            </div>
            <ScrollArea className="flex-1 p-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`mb-4 flex ${msg.is_me ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.is_me ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                            <p className="text-sm font-medium">{msg.sender_name}</p>
                            <p>{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
            </ScrollArea>
            <div className="p-4 border-t flex gap-2">
                <Input
                    placeholder="Type a message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                />
                <Button size="icon"><Paperclip className="w-5 h-5" /></Button>
                <Button size="icon" onClick={sendMessage}><Send className="w-5 h-5" /></Button>
            </div>
        </div>
    );
}