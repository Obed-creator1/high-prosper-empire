"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, X } from "lucide-react";
import AudioRecorderVisualizer from "./AudioRecorderVisualizer";

interface Props {
    onSendAudio: (audioBlob: Blob) => void;
}

const VoiceRecorderButton: React.FC<Props> = ({ onSendAudio }) => {
    const [recording, setRecording] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [ripple, setRipple] = useState(false);
    const startX = useRef(0);

    const handleStart = async (e: React.TouchEvent | React.MouseEvent) => {
        setCancelled(false);
        setRipple(true);
        startX.current = "touches" in e ? e.touches[0].clientX : e.clientX;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (event) => chunks.push(event.data);

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                if (!cancelled) onSendAudio(blob);
                stream.getTracks().forEach((t) => t.stop());
                setAudioStream(null);
            };

            recorder.start();
            setRecording(true);
            setMediaRecorder(recorder);
            setAudioStream(stream);
        } catch (err) {
            console.error("🎙️ Mic access denied:", err);
        }
    };

    const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!recording) return;
        const currentX = "touches" in e ? e.touches[0].clientX : e.clientX;
        if (startX.current - currentX > 100) {
            setCancelled(true);
        } else {
            setCancelled(false);
        }
    };

    const handleEnd = () => {
        setRipple(false);
        if (recording && mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    useEffect(() => {
        return () => {
            if (mediaRecorder && recording) mediaRecorder.stop();
        };
    }, [recording]);

    return (
        <div className="flex flex-col items-center space-y-2">
            {/* Recorder Visualizer */}
            <AudioRecorderVisualizer isRecording={recording} audioStream={audioStream} />

            {/* Mic Button with Ripple */}
            <div className="relative flex items-center justify-center">
                {ripple && (
                    <div className="absolute w-20 h-20 rounded-full bg-red-400/20 animate-ping"></div>
                )}
                <button
                    onMouseDown={handleStart}
                    onMouseUp={handleEnd}
                    onMouseMove={handleMove}
                    onTouchStart={handleStart}
                    onTouchEnd={handleEnd}
                    onTouchMove={handleMove}
                    className={`p-4 rounded-full transition-all duration-300 ${
                        cancelled
                            ? "bg-gray-400 text-white scale-90"
                            : recording
                                ? "bg-red-500 text-white scale-110"
                                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white"
                    }`}
                >
                    {cancelled ? <X className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
            </div>

            {cancelled && (
                <p className="text-sm text-gray-500 italic animate-pulse">
                    Release to cancel…
                </p>
            )}
        </div>
    );
};

export default VoiceRecorderButton;
