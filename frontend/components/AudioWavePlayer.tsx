"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface AudioWavePlayerProps {
    url: string;
}

const AudioWavePlayer: React.FC<AudioWavePlayerProps> = ({ url }) => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState("0:00");
    const [currentTime, setCurrentTime] = useState("0:00");

    // Initialize WaveSurfer
    useEffect(() => {
        if (!waveformRef.current) return;

        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: "#cbd5e1",
            progressColor: "#25D366",
            height: 40,
            cursorWidth: 1,
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
        });

        wavesurfer.load(url);

        wavesurfer.on("ready", () => {
            setDuration(formatTime(wavesurfer.getDuration()));
        });

        wavesurfer.on("audioprocess", () => {
            setCurrentTime(formatTime(wavesurfer.getCurrentTime()));
        });

        wavesurfer.on("finish", () => {
            setPlaying(false);
            setCurrentTime("0:00");
        });

        wavesurferRef.current = wavesurfer;

        // Handle window resize to redraw waveform
        const handleResize = () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.zoom(0); // forces redraw without touching drawer
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            wavesurfer.destroy();
            window.removeEventListener("resize", handleResize);
        };
    }, [url]);

    const togglePlay = () => {
        if (!wavesurferRef.current) return;
        wavesurferRef.current.playPause();
        setPlaying(!playing);
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? "0" + seconds : seconds}`;
    };

    return (
        <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg shadow-sm w-full max-w-sm">
            <button
                onClick={togglePlay}
                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
            >
                {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div className="flex-1" ref={waveformRef}></div>

            <div className="text-xs text-gray-600 dark:text-gray-300 w-10 text-right">
                {playing ? currentTime : duration}
            </div>
        </div>
    );
};

export default AudioWavePlayer;
