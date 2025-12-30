// components/NeuralCursor.tsx
"use client";

import { useEffect, useState } from "react";

export default function NeuralCursor() {
    const [position, setPosition] = useState({ x: -100, y: -100 });
    const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        let trailId = 0;

        const updatePosition = (e: MouseEvent) => {
            if (!isActive) return;

            setPosition({ x: e.clientX, y: e.clientY });

            // Add trail particle
            setTrail(prev => [
                ...prev.slice(-20), // Keep only last 20 for performance
                { x: e.clientX, y: e.clientY, id: trailId++ }
            ]);
        };

        const handleMouseLeave = () => setIsActive(false);
        const handleMouseEnter = () => setIsActive(true);

        window.addEventListener("mousemove", updatePosition);
        window.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("mouseenter", handleMouseEnter);

        return () => {
            window.removeEventListener("mousemove", updatePosition);
            window.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("mouseenter", handleMouseEnter);
        };
    }, [isActive]);

    // Hide default cursor
    useEffect(() => {
        document.body.style.cursor = "none";
        return () => {
            document.body.style.cursor = "auto";
        };
    }, []);

    if (!isActive) return null;

    return (
        <>
            {/* MAIN NEURAL CORE */}
            <div
                className="fixed pointer-events-none z-[9999] mix-blend-screen"
                style={{
                    left: position.x - 16,
                    top: position.y - 16,
                    transition: "transform 0.08s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
            >
                <div className="relative">
                    {/* Outer Ring - Pulsing */}
                    <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-purple-500 animate-ping opacity-60" />
                    <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-cyan-400 animate-ping animation-delay-300 opacity-40" />

                    {/* Inner Core */}
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 shadow-2xl shadow-purple-500/80 animate-pulse">
                        <div className="absolute inset-1 rounded-full bg-black" />
                        <div className="absolute inset-2 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 animate-spin-slow" />
                    </div>

                    {/* AI Label */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-xs font-bold text-purple-300 tracking-widest animate-pulse">
              AI CORE
            </span>
                    </div>
                </div>
            </div>

            {/* TRAILING NEURAL PARTICLES */}
            {trail.map((point, i) => (
                <div
                    key={point.id}
                    className="fixed pointer-events-none z-[9998] mix-blend-screen"
                    style={{
                        left: point.x - 4,
                        top: point.y - 4,
                        opacity: 1 - i * 0.04,
                        transform: `scale(${1 - i * 0.03})`,
                    }}
                >
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-cyan-400 shadow-lg shadow-purple-500/50 animate-pulse" />
                </div>
            ))}

            {/* GLOBAL STYLES */}
            <style jsx global>{`
        * {
          cursor: none !important;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
        </>
    );
}