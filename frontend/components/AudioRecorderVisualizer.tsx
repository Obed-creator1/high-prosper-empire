"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
    isRecording: boolean;
    audioStream: MediaStream | null;
}

const AudioRecorderVisualizer: React.FC<Props> = ({ isRecording, audioStream }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!isRecording || !audioStream) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(audioStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillStyle = `hsl(${barHeight + 120}, 80%, 50%)`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();

        const timer = setInterval(() => {
            setSeconds((prev) => prev + 1);
        }, 1000);

        return () => {
            cancelAnimationFrame(animationRef.current!);
            clearInterval(timer);
            audioCtx.close();
            setSeconds(0);
        };
    }, [isRecording, audioStream]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
        <span
            className={`h-3 w-3 rounded-full animate-pulse ${
                isRecording ? "bg-red-500" : "bg-gray-400"
            }`}
        ></span>
                <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
                    {formatTime(seconds)}
                </p>
            </div>

            <canvas
                ref={canvasRef}
                width={200}
                height={40}
                className={`rounded-md bg-gray-200 dark:bg-gray-700 transition-all ${
                    isRecording ? "opacity-100" : "opacity-0"
                }`}
            ></canvas>
        </div>
    );
};

export default AudioRecorderVisualizer;
