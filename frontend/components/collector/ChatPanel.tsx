// components/collector/ChatPanel.tsx
"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChatPanel() {
    const [chats] = useState([
        { id: 1, name: "John Doe", lastMessage: "Payment received", time: "2 min ago" },
        { id: 2, name: "Jane Smith", lastMessage: "Need schedule update", time: "1 hr ago" },
    ]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Recent Chats
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {chats.map((chat) => (
                        <div key={chat.id} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <div>
                                <p className="font-medium">{chat.name}</p>
                                <p className="text-sm text-gray-500">{chat.lastMessage}</p>
                            </div>
                            <span className="text-xs text-gray-400">{chat.time}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}