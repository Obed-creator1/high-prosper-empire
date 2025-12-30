"use client";
import { useState } from "react";
import useChatWS from "@/hooks/useChatWS";

export default function ChatRoom({ roomId }: { roomId: string }) {
    const { messages, sendMessage } = useChatWS(roomId);
    const [text, setText] = useState("");

    const handleSend = () => {
        if (text.trim().length === 0) return;
        sendMessage(text);
        setText("");
    };

    return (
        <div className="p-4 space-y-4">
            <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
                {messages.map((m, i) => (
                    <div key={i} className="p-2 bg-gray-100 rounded-lg">
                        <strong>{m.sender}:</strong> {m.message}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 border p-2 rounded-lg"
                    placeholder="Write message..."
                />
                <button
                    onClick={handleSend}
                    className="bg-blue-600 text-white px-3 rounded-lg"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
