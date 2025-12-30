"use client";
import React, { useState, useRef, useEffect } from "react";
import { useWS } from "@/context/WSProvider";
import { Send } from "lucide-react";

interface Props {
    selectedUser: any;
    myId: number;
}

export default function ChatWindow({ selectedUser, myId }: Props) {
    const { chatMessages, sendMessage } = useWS();
    const [text, setText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const roomId = selectedUser?.id?.toString();
    const messages = chatMessages[roomId] || [];

    const handleSend = () => {
        if (!text.trim()) return;
        sendMessage(roomId, text);
        setText("");
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col">
            <div className="border-b p-4 flex items-center gap-3">
                <h3 className="font-semibold">{selectedUser.username}</h3>
                <span className="text-xs text-gray-500">
                    {selectedUser.is_online ? "Online" : "Offline"}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${
                            msg.sender_id === myId ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-xs px-4 py-2 rounded-2xl ${
                                msg.sender_id === myId
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                            }`}
                        >
                            {msg.message}
                            <div className="text-[10px] text-right opacity-70 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3 flex items-center gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-full px-4 py-2 focus:outline-none"
                />
                <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-full">
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
