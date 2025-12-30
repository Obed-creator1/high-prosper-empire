// components/fleet/WorkshopEntryModal.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Wrench, AlertTriangle, Send, Upload, Image as ImageIcon, Video,
    Trash2, Sparkles, Loader2, FileCheck, ZoomIn, ZoomOut, Maximize2,
    Minimize2, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface Vehicle {
    id: number;
    registration_number: string;
    brand: string;
    model: string;
}

interface MediaItem {
    id?: number;
    file: File;
    type: "image" | "video";
    preview: string;
    lqip?: string;
    thumbnail?: string;
    originalSize: number;
    compressedSize: number;
    uploading: boolean;
    uploaded: boolean;
    ai_result?: any;
    loaded: boolean;
}

export default function WorkshopEntryModal({
                                               vehicle,
                                               isOpen,
                                               onClose,
                                               onSuccess
                                           }: {
    vehicle: Vehicle | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [issue, setIssue] = useState("");
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    const generateLQIP = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 40; canvas.height = 40;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, 40, 40);
                resolve(canvas.toDataURL("image/jpeg", 0.1));
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const compressImage = async (file: File): Promise<File> => {
        const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true, fileType: "image/webp", initialQuality: 0.85 };
        const compressed = await imageCompression(file, options);
        compressed.name = file.name.replace(/\.[^/.]+$/, ".webp");
        return compressed;
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const newMedia: MediaItem[] = [];

        for (const file of acceptedFiles) {
            const isVideo = file.type.startsWith("video/");
            const preview = URL.createObjectURL(file);

            const item: MediaItem = {
                file,
                type: isVideo ? "video" : "image",
                preview,
                originalSize: file.size,
                compressedSize: file.size,
                uploading: true,
                uploaded: false,
                loaded: false
            };

            if (!isVideo) {
                item.lqip = await generateLQIP(file);
            } else {
                const video = document.createElement("video");
                video.src = preview;
                video.addEventListener("loadeddata", () => {
                    video.currentTime = Math.min(2, video.duration / 2);
                });
                video.addEventListener("seeked", () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth / 4;
                    canvas.height = video.videoHeight / 4;
                    const ctx = canvas.getContext("2d")!;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    item.thumbnail = canvas.toDataURL("image/jpeg", 0.7);
                    setMedia(prev => [...prev]);
                });
            }

            newMedia.push(item);
        }

        setMedia(prev => [...prev, ...newMedia]);

        // Process uploads
        for (const file of acceptedFiles) {
            try {
                let processedFile: File = file;
                const formData = new FormData();

                if (file.type.startsWith("image/")) {
                    processedFile = await compressImage(file);
                    formData.append("images", processedFile);
                } else {
                    if (file.size > 50 * 1024 * 1024) {
                        toast.error("Video too large – max 50MB");
                        continue;
                    }
                    formData.append("videos", file);
                }

                formData.append("vehicle", vehicle!.id.toString());
                await api.post("/fleet/workshop-media/", formData);

                if (file.type.startsWith("video/")) {
                    const aiRes = await api.post("/fleet/ai-video-damage/", formData);
                    toast.success(`AI found damage in ${aiRes.data.frames_with_damage} frames!`, { icon: "Video AI", duration: 6000 });
                } else {
                    const aiRes = await api.post("/fleet/ai-damage-detect/", formData);
                    toast.success("AI detected damage!", { icon: "AI", duration: 4000 });
                }

                setMedia(prev => prev.map(m =>
                    m.file === file ? { ...m, uploading: false, uploaded: true, ai_result: "AI analyzed" } : m
                ));
            } catch (err: any) {
                toast.error(err.response?.data?.detail || "Upload failed");
                setMedia(prev => prev.map(m => m.file === file ? { ...m, uploading: false } : m));
            }
        }
    }, [vehicle]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [],
            "video/*": [".mp4", ".mov", ".avi", ".webm", ".mkv"]
        },
        multiple: true
    });

    const removeMedia = (item: MediaItem) => {
        URL.revokeObjectURL(item.preview);
        setMedia(prev => prev.filter(m => m !== item));
    };

    const openViewer = (item: MediaItem) => {
        setSelectedMedia(item);
        if (item.type === "video" && videoRef.current) {
            videoRef.current.currentTime = 0;
            setIsPlaying(true);
        }
    };

    const handleSubmit = async () => {
        if (!issue.trim() && media.length === 0) {
            toast.error("Add description or media");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post("/fleet/workshop-records/", {
                vehicle: vehicle!.id,
                issue_description: issue.trim() || `Media uploaded (${media.length})`,
                status: "in_progress",
                location: "Main Workshop – Kigali"
            });
            toast.success("Sent to workshop with full video analysis!", { icon: "Sent", duration: 6000 });
            onSuccess();
            onClose();
        } catch {
            toast.error("Failed to send");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !vehicle) return null;

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-4xl w-full max-w-7xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-600 to-red-700 p-10 text-white rounded-t-3xl">
                        <button onClick={onClose} className="float-right p-3 bg-white/20 rounded-2xl hover:bg-white/30">
                            <X className="w-7 h-7" />
                        </button>
                        <h3 className="text-5xl font-black flex items-center gap-5">
                            <Wrench className="w-14 h-14" />
                            Report Damage
                        </h3>
                        <p className="text-2xl mt-3 opacity-90">Photos + Videos • AI Damage Detection</p>
                    </div>

                    <div className="p-10 space-y-10">
                        {/* Upload Zone */}
                        <div className="bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50 rounded-3xl p-16 border-4 border-dashed border-emerald-400 relative">
                            <div {...getRootProps()} className="text-center cursor-pointer">
                                <input {...getInputProps()} />
                                <Upload className="w-24 h-24 mx-auto mb-6 text-emerald-600" />
                                <p className="text-4xl font-black text-emerald-800 mb-4">
                                    Upload Photos & Videos
                                </p>
                                <div className="flex justify-center gap-8 text-emerald-700 text-xl">
                                    <span className="flex items-center gap-2"><ImageIcon className="w-6 h-6" /> Photos</span>
                                    <span className="flex items-center gap-2"><Video className="w-6 h-6" /> Videos</span>
                                    <span className="flex items-center gap-2"><Sparkles className="w-6 h-6" /> AI Analysis</span>
                                </div>
                            </div>
                        </div>

                    {/* Media Grid */}
                    {media.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {media.map((item) => (
                                <motion.div
                                    key={item.preview}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => openViewer(item)}
                                    className="relative group rounded-3xl overflow-hidden shadow-2xl cursor-pointer bg-gray-900"
                                >
                                    {item.type === "video" ? (
                                        <>
                                            {item.thumbnail ? (
                                                <img src={item.thumbnail} alt="Video" className="w-full h-64 object-cover" />
                                            ) : (
                                                <div className="w-full h-64 bg-gray-800 flex items-center justify-center">
                                                    <Video className="w-20 h-20 text-gray-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                <Play className="w-20 h-20 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 blur-3xl scale-110" style={{ backgroundImage: `url(${item.lqip})`, backgroundSize: "cover" }} />
                                            <img
                                                src={item.ai_result?.annotated_url || item.preview}
                                                alt="Damage"
                                                className={`w-full h-64 object-cover transition-opacity duration-1000 ${item.loaded ? "opacity-100" : "opacity-0"}`}
                                                onLoad={() => setMedia(prev => prev.map(m => m.preview === item.preview ? { ...m, loaded: true } : m))}
                                            />
                                        </>
                                    )}

                                    <div className="absolute top-4 left-4">
                                        {item.type === "video" ? (
                                            <div className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
                                                <Video className="w-5 h-5" /> VIDEO
                                            </div>
                                        ) : item.ai_result && (
                                            <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm">
                                                AI DETECTED
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}

                        {/* Submit */}
                        <div className="flex gap-6 pt-8">
                            <button onClick={onClose} className="flex-1 py-6 border-2 border-gray-300 rounded-3xl hover:bg-gray-50 font-bold text-xl">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-6 bg-gradient-to-r from-orange-600 to-red-700 text-white rounded-3xl hover:shadow-2xl font-black text-2xl flex items-center justify-center gap-4 disabled:opacity-60"
                            >
                                <Send className="w-10 h-10" />
                                Send to Workshop
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* FULL ZOOM VIEWER */}
            <AnimatePresence>
                {selectedMedia && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/98 z-[100] flex flex-col"
                        onClick={() => setSelectedMedia(null)}
                    >
                        <div className="bg-gradient-to-b from-black/80 to-transparent p-6 flex items-center justify-between z-10">
                            <h3 className="text-3xl font-black text-white flex items-center gap-4">
                                {selectedMedia.type === "video" ? <Video className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                                {vehicle.registration_number} – {selectedMedia.type.toUpperCase()}
                            </h3>
                            <button onClick={() => setSelectedMedia(null)} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl">
                                <X className="w-8 h-8 text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <TransformWrapper
                                initialScale={1}
                                minScale={0.5}
                                maxScale={8}
                                centerOnInit
                                wheel={{ step: 0.2 }}
                                panning={{ disabled: false }}
                                doubleClick={{ mode: "zoomIn" }}
                            >
                                {({ zoomIn, zoomOut, resetTransform }) => (
                                    <>
                                        <TransformComponent>
                                            {selectedMedia.type === "video" ? (
                                                <video
                                                    ref={videoRef}
                                                    src={selectedMedia.preview}
                                                    className="w-full h-full object-contain"
                                                    controls={false}
                                                    autoPlay
                                                    muted={isMuted}
                                                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                                                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                                                />
                                            ) : (
                                                <img
                                                    src={selectedMedia.ai_result?.annotated_url || selectedMedia.preview}
                                                    alt="Zoom"
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                        </TransformComponent>

                                        {/* Video Controls */}
                                        {selectedMedia.type === "video" && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8">
                                                <div className="flex items-center gap-6 text-white">
                                                    <button onClick={() => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause()}>
                                                        {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
                                                    </button>
                                                    <button onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}>
                                                        <SkipBack className="w-8 h-8" />
                                                    </button>
                                                    <button onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}>
                                                        <SkipForward className="w-8 h-8" />
                                                    </button>
                                                    <button onClick={() => setIsMuted(!isMuted)}>
                                                        {isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="bg-white/30 rounded-full h-2">
                                                            <div
                                                                className="bg-white h-full rounded-full transition-all"
                                                                style={{ width: `${(currentTime / duration) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-mono">
                            {Math.floor(currentTime)}s / {Math.floor(duration)}s
                          </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Zoom Controls */}
                                        <div className="absolute bottom-8 right-8 flex flex-col gap-4 bg-black/70 backdrop-blur-xl rounded-3xl p-4">
                                            <button onClick={() => zoomIn()} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl">
                                                <ZoomIn className="w-8 h-8 text-white" />
                                            </button>
                                            <button onClick={() => zoomOut()} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl">
                                                <ZoomOut className="w-8 h-8 text-white" />
                                            </button>
                                            <button onClick={() => resetTransform()} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl">
                                                <Minimize2 className="w-8 h-8 text-white" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </TransformWrapper>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}