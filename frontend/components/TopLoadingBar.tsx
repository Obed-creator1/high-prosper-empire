// components/TopLoadingBar.tsx — GLOBAL TOP LOADING BAR WITH PREMIUM PROGRESS ANIMATION
"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopLoadingBar() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const progressRef = useRef<number>(0);

    useEffect(() => {
        let animationFrame: number | null = null;
        let timeout: NodeJS.Timeout | null = null;

        const handleStart = () => {
            setLoading(true);
            progressRef.current = 0;
            setProgress(0);

            // Smooth indeterminate progress
            const animate = () => {
                progressRef.current = Math.min(progressRef.current + 0.5 + Math.random() * 1.5, 90);
                setProgress(progressRef.current);
                animationFrame = requestAnimationFrame(animate);
            };
            animationFrame = requestAnimationFrame(animate);

            // Safety timeout: force complete after 15s if stuck
            timeout = setTimeout(() => handleComplete(), 15000);
        };

        const handleComplete = () => {
            setProgress(100);
            setTimeout(() => {
                setLoading(false);
                progressRef.current = 0;
                setProgress(0);
            }, 400); // Brief pause at 100%
            if (animationFrame) cancelAnimationFrame(animationFrame);
            if (timeout) clearTimeout(timeout);
        };

        // Navigation events
        window.addEventListener("routeChangeStart", handleStart);
        window.addEventListener("routeChangeComplete", handleComplete);
        window.addEventListener("routeChangeError", handleComplete);

        // API events
        window.addEventListener("apiLoadingStart", handleStart);
        window.addEventListener("apiLoadingEnd", handleComplete);

        return () => {
            window.removeEventListener("routeChangeStart", handleStart);
            window.removeEventListener("routeChangeComplete", handleComplete);
            window.removeEventListener("routeChangeError", handleComplete);
            window.removeEventListener("apiLoadingStart", handleStart);
            window.removeEventListener("apiLoadingEnd", handleComplete);
            if (animationFrame) cancelAnimationFrame(animationFrame);
            if (timeout) clearTimeout(timeout);
        };
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-900/80 backdrop-blur-sm overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
            />
            {/* Subtle glow effect */}
            <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}