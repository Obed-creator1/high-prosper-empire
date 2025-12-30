"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
    Image as ImageIcon,
    Video,
    FileText,
    Mic,
    Paperclip,
    Send,
    Smile,
} from "lucide-react";
import api from "@/lib/api";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

type ChatInputToolbarProps = {
    token: string;
    userId: number;
    selectedUserId: number;
    sendMessage: (msg: any) => void;
    socket: any; // Your WebSocket instance
};

export default function ChatInputToolbar({
                                             token,
                                             selectedUserId,
                                             sendMessage,
                                             socket,
                                         }: ChatInputToolbarProps) {
    const [message, setMessage] = useState("");
    const [attachmentMenu, setAttachmentMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // DEBOUNCED TYPING INDICATOR — WHATSAPP STYLE
    const sendTypingIndicator = useCallback((isTyping: boolean) => {
        if (!socket || !socket.connected || !selectedUserId) return;

        socket.emit("typing", {
            recipientId: selectedUserId,
            isTyping,
        });
    }, [socket, selectedUserId]);

    const handleTyping = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Send typing = true immediately
        sendTypingIndicator(true);

        // Stop typing after 1.5 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(false);
        }, 1500);
    }, [sendTypingIndicator]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                sendTypingIndicator(false); // Clean stop
            }
        };
    }, [sendTypingIndicator]);

    const sendText = () => {
        if (!message.trim()) return;

        sendMessage({
            type: "chat.message",
            message: message.trim(),
            receiver_id: selectedUserId,
            attachment_type: "text",
        });

        setMessage("");
        sendTypingIndicator(false); // Stop typing when sending
    };

    const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("receiver_id", String(selectedUserId));

        try {
            const res = await api.post("/users/upload/", formData, {
                headers: {
                    Authorization: `Token ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            sendMessage({
                type: "chat.message",
                message: res.data.url,
                receiver_id: selectedUserId,
                attachment_type: res.data.attachment_type || "file",
            });

            setAttachmentMenu(false);
        } catch (err) {
            console.error("Attachment upload failed:", err);
            alert("Failed to upload file. Try again.");
        }
    };

    const addEmoji = (emoji: any) => {
        setMessage((prev) => prev + emoji.native);
        setShowEmojiPicker(false);
    };

    return (
        <div className="border-t bg-white dark:bg-gray-800 p-3 flex items-center space-x-3 relative">
            {/* Attachment Menu */}
            <button
                onClick={() => setAttachmentMenu((p) => !p)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
                <Paperclip size={22} />
            </button>

            {attachmentMenu && (
                <div className="absolute bottom-16 left-2 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-4 grid grid-cols-3 gap-4 w-64 z-50 border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                    >
                        <ImageIcon className="text-blue-500" size={28} />
                        <span className="text-xs font-medium">Photo</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                    >
                        <Video className="text-red-500" size={28} />
                        <span className="text-xs font-medium">Video</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                    >
                        <FileText className="text-green-500" size={28} />
                        <span className="text-xs font-medium">Document</span>
                    </button>

                    <input
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleAttachment}
                    />
                </div>
            )}

            {/* Message Input */}
            <input
                type="text"
                value={message}
                onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping(); // NOW WORKS PERFECTLY
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendText();
                    }
                }}
                className="flex-1 px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-700 outline-none text-sm placeholder-gray-500"
                placeholder="Type a message..."
                autoFocus
            />

            {/* Emoji Picker */}
            <button
                onClick={() => setShowEmojiPicker((p) => !p)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
                <Smile size={22} />
            </button>

            {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-50">
                    <Picker data={emojiData} onEmojiSelect={addEmoji} theme="light" />
                </div>
            )}

            {/* Voice Message */}
            <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                <Mic size={22} />
            </button>

            {/* Send Button */}
            <button
                onClick={sendText}
                disabled={!message.trim()}
                className={`p-3 rounded-full transition ${
                    message.trim()
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                }`}
            >
                <Send size={20} />
            </button>
        </div>
    );
}