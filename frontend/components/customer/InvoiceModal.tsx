// frontend/components/InvoiceModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface InvoiceModalProps {
    url: string;
    onClose: () => void;
}

export default function InvoiceModal({ url, onClose }: InvoiceModalProps) {

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl h-[80vh] flex flex-col">
                <div className="flex justify-end p-2">
                    <Button variant="ghost" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>
                <iframe src={url} className="flex-1 w-full rounded-b-lg" />
            </div>
        </div>
    );
}
