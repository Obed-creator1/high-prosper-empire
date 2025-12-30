"use client";

import React, { useState } from "react";
import { Paperclip, Image as ImageIcon, FileText, User } from "lucide-react";

interface AttachmentsMenuProps {
    onFilesSelected: (files: File[]) => void;
}

const AttachmentsMenu: React.FC<AttachmentsMenuProps> = ({ onFilesSelected }) => {
    const [showMenu, setShowMenu] = useState(false);

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) onFilesSelected(Array.from(e.target.files));
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu((prev) => !prev)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
                <Paperclip className="w-5 h-5" />
            </button>

            {showMenu && (
                <div className="absolute bottom-12 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex flex-col gap-2 w-40">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                        <ImageIcon className="w-4 h-4" /> Photo / Video
                        <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={handleFiles}
                        />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                        <FileText className="w-4 h-4" /> Document
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            onChange={handleFiles}
                        />
                    </label>
                    <button className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <User className="w-4 h-4" /> Contact
                    </button>
                </div>
            )}
        </div>
    );
};

export default AttachmentsMenu;
