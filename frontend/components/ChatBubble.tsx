"use client";

import React from "react";
import AudioWavePlayer from "./AudioWavePlayer";

type ChatMessage = {
    id?: number;
    sender_id: number;
    sender_name?: string;
    receiver_id: number;
    message?: string;
    attachment_url?: string | null;
    attachment_type?: string | null;
    timestamp?: string;
};

interface ChatBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwnMessage }) => {
    const renderAttachment = () => {
        if (!message.attachment_url || !message.attachment_type) return null;

        switch (message.attachment_type) {
            case "image":
                return (
                    <img
                        src={message.attachment_url}
                        alt="image"
                        className="rounded-lg max-w-xs"
                    />
                );
            case "video":
                return (
                    <video
                        src={message.attachment_url}
                        controls
                        className="rounded-lg max-w-xs"
                    />
                );
            case "audio":
                return <AudioWavePlayer url={message.attachment_url} />;
            default:
                return (
                    <a
                        href={message.attachment_url}
                        download
                        className="text-blue-500 underline"
                    >
                        Download File
                    </a>
                );
        }
    };

    return (
        <div
            className={`flex flex-col ${
                isOwnMessage ? "items-end" : "items-start"
            }`}
        >
            <div
                className={`px-4 py-2 rounded-xl max-w-xs break-words ${
                    isOwnMessage
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                }`}
            >
                {message.message && <p>{message.message}</p>}
                {renderAttachment()}
            </div>
            {message.timestamp && (
                <span className="text-xs text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })}
        </span>
            )}
        </div>
    );
};

export default ChatBubble;
