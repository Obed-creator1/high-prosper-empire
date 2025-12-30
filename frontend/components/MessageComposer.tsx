"use client";

import React, { useState } from "react";
import AttachmentsMenu from "./AttachmentsMenu";
import EmojiGifPicker from "./EmojiGifPicker";
import VoiceRecorder from "./VoiceRecorder";
import { Smile } from "lucide-react";

interface MessageComposerProps {
    token: string;
    myId: number;
    selectedUserId: number | null;
    TENOR_KEY: string;
    onSendMessage: (payload: any) => void;
    onSendVoice: (file: File) => void; // Keep as void
}

const MessageComposer: React.FC<MessageComposerProps> = ({
                                                             token,
                                                             myId,
                                                             selectedUserId,
                                                             TENOR_KEY,
                                                             onSendMessage,
                                                             onSendVoice,
                                                         }) => {
    const [newMessage, setNewMessage] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [showPicker, setShowPicker] = useState(false);

    const handleSend = async (extraAttachment?: { url: string; type: string }) => {
        if (!selectedUserId || (!newMessage.trim() && !extraAttachment && attachments.length === 0)) return;

        onSendMessage({ message: newMessage, attachments, extraAttachment });
        setNewMessage("");
        setAttachments([]);
        setShowPicker(false);
    };

    return (
        <div className="px-4 py-3 border-t dark:border-gray-800 flex items-center gap-2 bg-white dark:bg-gray-900 relative">
            <AttachmentsMenu onFilesSelected={(files) => setAttachments([...attachments, ...files])} />

            <button
                onClick={() => setShowPicker((prev) => !prev)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
                <Smile className="w-5 h-5" />
            </button>

            <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                    }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-full focus:outline-none focus:ring bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />

            {/* Wrap onSendVoice in async to satisfy VoiceRecorder type */}
            <VoiceRecorder onSend={async (file: File) => onSendVoice(file)} />

            <button
                onClick={() => handleSend()}
                className="px-4 py-2 rounded-full bg-green-500 text-white hover:bg-green-600"
            >
                Send
            </button>

            {showPicker && (
                <EmojiGifPicker
                    TENOR_KEY={TENOR_KEY}
                    onEmojiSelect={(e) => setNewMessage((prev) => prev + e.native)}
                    onGifSelect={(url) => handleSend({ url, type: "image" })}
                />
            )}
        </div>
    );
};

export default MessageComposer;
