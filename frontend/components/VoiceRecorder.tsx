"use client";

import React, { useRef, useState, useEffect } from "react";
import { Mic, X, Check } from "lucide-react";

type VoiceRecorderProps = {
    onSend: (file: File) => Promise<void>;
};

export default function VoiceRecorder({ onSend }: VoiceRecorderProps) {
    const [recording, setRecording] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
    const [uploading, setUploading] = useState(false);
    const [sent, setSent] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationRef = useRef<number | null>(null);
    const startXRef = useRef<number>(0);
    const cancelledRef = useRef(false);

    // 🎙 Start Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioStream(stream);
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                if (!cancelledRef.current) {
                    setRecordedBlob(blob);
                    const file = new File([blob], "voice-message.webm", { type: "audio/webm" });

                    // Start uploading
                    setUploading(true);
                    try {
                        await onSend(file);
                        setSent(true);
                        setTimeout(() => setSent(false), 2000); // remove check after 2s
                    } catch (err) {
                        console.error("Failed to send audio:", err);
                    } finally {
                        setUploading(false);
                    }
                }
                cleanupRecording();
            };

            recorder.start();
            setMediaRecorder(recorder);
            setRecording(true);
            cancelledRef.current = false;

            const id = setInterval(() => setRecordingTime((t) => t + 1), 1000);
            setIntervalId(id);

            startWaveform(stream);
        } catch (error) {
            alert("Microphone permission denied or unavailable.");
            console.error(error);
        }
    };

    // 🛑 Stop Recording
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
    };

    // 🧹 Cleanup
    const cleanupRecording = () => {
        if (intervalId) clearInterval(intervalId);
        stopWaveform();
        if (audioStream) audioStream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setRecordingTime(0);
    };

    // 🎛 Waveform visualizer
    const startWaveform = (stream: MediaStream) => {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        const draw = () => {
            if (!ctx || !canvas) return;
            animationRef.current = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);
            ctx.fillStyle = "#f9fafb";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = cancelledRef.current ? "#f87171" : "#22c55e";
            ctx.beginPath();

            const sliceWidth = (canvas.width * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    };

    const stopWaveform = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };

    // ✋ Hold to Record Logic
    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (uploading) return;
        startXRef.current = "touches" in e ? e.touches[0].clientX : e.clientX;
        setCancelled(false);
        cancelledRef.current = false;
        startRecording();
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!recording) return;
        const currentX = "touches" in e ? e.touches[0].clientX : e.clientX;
        const distance = startXRef.current - currentX;

        if (distance > 100 && !cancelledRef.current) {
            setCancelled(true);
            cancelledRef.current = true;
        }
    };

    const handleMouseUp = () => {
        if (!recording) return;
        if (cancelledRef.current) {
            stopRecording();
            setCancelled(true);
        } else {
            stopRecording();
        }
    };

    useEffect(() => {
        return cleanupRecording;
    }, []);

    return (
        <div className="flex flex-col items-center">
            {/* Recording UI */}
            {recording && (
                <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full mb-2">
                    <canvas ref={canvasRef} width={120} height={30} />
                    <span className={`text-sm ${cancelled ? "text-red-600" : "text-green-600"}`}>
            {cancelled ? "Cancelled" : "Recording..."}
          </span>
                    <span className="text-xs text-gray-500">
            {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
          </span>
                </div>
            )}

            {/* Uploading / Sent */}
            {uploading && <span className="text-sm text-blue-500 mt-1">Uploading...</span>}
            {sent && <span className="flex items-center text-green-500 mt-1"><Check className="w-4 h-4 mr-1" /> Sent</span>}

            {/* Mic Button */}
            <div
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onTouchMove={handleMouseMove}
                className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer transition-all ${
                    recording
                        ? cancelled
                            ? "bg-red-400"
                            : "bg-green-500"
                        : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                {cancelled ? (
                    <X className="text-white w-6 h-6" />
                ) : (
                    <Mic className={recording || uploading ? "text-white w-6 h-6" : "text-gray-700 dark:text-gray-200 w-6 h-6"} />
                )}
            </div>
        </div>
    );
}
