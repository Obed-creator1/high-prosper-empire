"use client";

import React, { useEffect, useState } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import axios from "axios";

interface EmojiGifPickerProps {
    onEmojiSelect: (emoji: any) => void;
    onGifSelect: (gifUrl: string) => void;
    TENOR_KEY: string;
}

const EmojiGifPicker: React.FC<EmojiGifPickerProps> = ({
                                                           onEmojiSelect,
                                                           onGifSelect,
                                                           TENOR_KEY,
                                                       }) => {
    const [activeTab, setActiveTab] = useState<"emoji" | "gif">("emoji");
    const [gifSearch, setGifSearch] = useState("");
    const [gifs, setGifs] = useState<any[]>([]);

    const fetchGifs = async (query = "trending") => {
        try {
            const q = encodeURIComponent(query);
            const url = `https://tenor.googleapis.com/v2/search?q=${q}&key=AIzaSyBStAx7JqjOCCTK24259AvLVWZWCYUYxF8&limit=24`;
            const res = await axios.get(url);
            setGifs(res.data.results || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (activeTab === "gif") fetchGifs();
    }, [activeTab]);

    return (
        <div className="absolute bottom-14 right-4 z-50 w-[320px] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
            <div className="flex justify-between mb-2">
                <button
                    onClick={() => setActiveTab("emoji")}
                    className={`flex-1 py-1 ${
                        activeTab === "emoji" ? "bg-blue-100 dark:bg-blue-900" : ""
                    }`}
                >
                    Emoji
                </button>
                <button
                    onClick={() => setActiveTab("gif")}
                    className={`flex-1 py-1 ${
                        activeTab === "gif" ? "bg-blue-100 dark:bg-blue-900" : ""
                    }`}
                >
                    GIFs
                </button>
            </div>

            {activeTab === "emoji" && <Picker data={data} onEmojiSelect={onEmojiSelect} theme="light" />}

            {activeTab === "gif" && (
                <div>
                    <input
                        value={gifSearch}
                        onChange={(e) => setGifSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchGifs(gifSearch)}
                        placeholder="Search GIFs..."
                        className="w-full px-2 py-1 mb-2 border rounded"
                    />
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
                        {gifs.map((gif) => {
                            const url = gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url;
                            return (
                                <img
                                    key={gif.id}
                                    src={url}
                                    className="cursor-pointer rounded"
                                    onClick={() => onGifSelect(url)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmojiGifPicker;
