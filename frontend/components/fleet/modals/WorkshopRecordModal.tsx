// components/fleet/modals/WorkshopRecordModal.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Wrench, Upload, Image as ImageIcon, Trash2, Sparkles,
    AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import toast from "react-hot-toast";

// Dynamic Fabric import (safe)
let fabric: any = null;
if (typeof window !== "undefined") {
    import("fabric").then((module) => {
        fabric = module.fabric || module.default;
    });
}

interface Photo {
    id?: number;
    image: string;
    uploaded_at?: string;
    ai_detected?: boolean;
    damage_boxes?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
        label: string;
    }>;
}

export default function WorkshopRecordModal({
                                                record: initialRecord,
                                                isOpen,
                                                onClose,
                                                onUpdate
                                            }: {
    record: any;  // Allow null/undefined
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (data: any) => void;
}) {
    const [record] = useState(initialRecord);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const canvasRef = useRef<any>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // SAFE: Only use record.id if record exists
    const workshopRecordId = record?.id;

    const runAIDamageDetection = async (file: File) => {
        if (!workshopRecordId) {
            toast.error("Workshop record not ready");
            return;
        }

        setAiAnalyzing(true);
        const formData = new FormData();
        formData.append("image", file);
        formData.append("workshop_record", workshopRecordId);

        try {
            const res = await api.post("/fleet/ai-damage-detect/", formData, { timeout: 60000 });
            const { damage_boxes, annotated_image } = res.data;

            setPhotos(prev => [...prev, {
                image: annotated_image,
                ai_detected: true,
                damage_boxes,
                uploaded_at: new Date().toISOString()
            }]);

            toast.success("AI detected damage!", { icon: "AI", duration: 6000 });
        } catch (err: any) {
            toast.error("AI analysis failed");
        } finally {
            setAiAnalyzing(false);
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!workshopRecordId) {
            toast.error("Workshop not loaded yet – please wait");
            return;
        }

        setUploading(true);

        for (const file of acceptedFiles) {
            const formData = new FormData();
            formData.append("images", file);
            formData.append("workshop_record", workshopRecordId);

            try {
                await api.post("/fleet/workshop-photos/", formData);
                await runAIDamageDetection(file);
            } catch {
                toast.error("Upload failed");
            }
        }

        setUploading(false);
    }, [workshopRecordId]); // Now safe!

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { "image/*": [] },
        multiple: true,
        disabled: !workshopRecordId // Disable if no record
    });

    const openAIResult = useCallback((photo: Photo) => {
        if (!fabric) {
            toast.error("Viewer loading...");
            return;
        }

        setSelectedPhoto(photo);

        setTimeout(() => {
            if (!canvasContainerRef.current) return;

            canvasContainerRef.current.innerHTML = '<canvas id="ai-canvas"></canvas>';
            const canvasEl = document.getElementById("ai-canvas");
            if (!canvasEl) return;

            const img = new Image();
            img.onload = () => {
                const canvas = new fabric.Canvas(canvasEl, {
                    width: img.width,
                    height: img.height,
                    backgroundColor: "rgba(0,0,0,0.05)"
                });

                canvas.setBackgroundImage(img.src, canvas.renderAll.bind(canvas));

                photo.damage_boxes?.forEach(box => {
                    const rect = new fabric.Rect({
                        left: box.x,
                        top: box.y,
                        width: box.width,
                        height: box.height,
                        stroke: "#ff006e",
                        strokeWidth: 8,
                        fill: "transparent",
                        strokeDashArray: [15, 8],
                    });

                    const text = new fabric.Text(`${box.label} ${(box.confidence * 100).toFixed(0)}%`, {
                        left: box.x + 15,
                        top: box.y - 45,
                        fontSize: 36,
                        fontWeight: "bold",
                        fill: "#ff006e",
                        backgroundColor: "rgba(0,0,0,0.8)",
                        padding: 12,
                    });

                    canvas.add(rect, text);
                });

                canvas.renderAll();
                canvasRef.current = canvas;
            };
            img.src = photo.image;
        }, 100);
    }, []);

    // Early return if not open OR record not ready
    if (!isOpen || !record) {
        return null;
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-4xl max-w-7xl w-full max-h-[95vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-600 to-red-700 p-10 text-white rounded-t-3xl relative">
                        <button onClick={onClose} className="absolute top-6 right-6 p-4 bg-white/20 rounded-2xl hover:bg-white/30">
                            <X className="w-8 h-8" />
                        </button>
                        <h2 className="text-6xl font-black flex items-center gap-6">
                            <Wrench className="w-20 h-20" />
                            {record.vehicle_reg || "Loading..."}
                        </h2>
                        <p className="text-3xl mt-4 opacity-90">AI Damage Detection Active</p>
                    </div>

                    <div className="p-12 space-y-12">
                        {/* Upload Zone */}
                        <div
                            {...getRootProps()}
                            className={`bg-gradient-to-br from-purple-100 via-pink-100 to-red-100 rounded-3xl p-20 border-6 border-dashed cursor-pointer transition-all ${
                                isDragActive ? "border-purple-600 scale-105" : "border-purple-400"
                            } ${!workshopRecordId ? "opacity-60 pointer-events-none" : ""}`}
                        >
                            <input {...getInputProps()} />
                            <div className="text-center">
                                <Sparkles className={`w-32 h-32 mx-auto mb-8 ${aiAnalyzing ? "animate-pulse" : ""} text-purple-600`} />
                                <p className="text-5xl font-black text-purple-800 mb-6">
                                    {aiAnalyzing ? "AI Analyzing..." : isDragActive ? "Drop Photos" : "Upload Damage Photos"}
                                </p>
                                <p className="text-2xl text-purple-700">YOLOv8 will detect damage instantly</p>
                            </div>
                        </div>

                        {/* Gallery */}
                        {photos.length > 0 && (
                            <div>
                                <h3 className="text-4xl font-black mb-10 flex items-center gap-6">
                                    <AlertTriangle className="w-14 h-14 text-red-600" />
                                    AI Detected Damage ({photos.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                    {photos.map((photo, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => openAIResult(photo)}
                                            className="relative group rounded-3xl overflow-hidden shadow-3xl cursor-zoom-in hover:scale-105 transition-all"
                                        >
                                            <img src={photo.image} alt="AI" className="w-full h-96 object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition">
                                                <div className="absolute bottom-8 left-8 right-8">
                                                    <p className="text-white text-4xl font-black mb-4">
                                                        {photo.damage_boxes?.length || 0} Issues
                                                    </p>
                                                    <button className="w-full py-6 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-3xl font-black text-2xl">
                                                        View AI Analysis
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="absolute top-6 left-6 bg-red-600 text-white px-8 py-4 rounded-full font-black text-xl">
                                                AI DETECTED
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Canvas Viewer */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/98 z-[200] flex flex-col">
                        <div className="bg-gradient-to-r from-purple-700 to-pink-700 p-8 flex justify-between">
                            <h3 className="text-4xl font-black text-white">AI Damage Analysis</h3>
                            <button onClick={() => setSelectedPhoto(null)} className="p-4 bg-white/20 rounded-2xl">
                                <X className="w-10 h-10 text-white" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-10 bg-gray-950">
                            <div ref={canvasContainerRef} className="mx-auto max-w-7xl shadow-4xl rounded-3xl overflow-hidden bg-white" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}