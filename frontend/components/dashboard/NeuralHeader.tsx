// components/dashboard/NeuralHeader.tsx
"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

export default function NeuralHeader() {
    const [time, setTime] = useState(new Date());
    const username = Cookies.get("username") || "Operator";

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="border-b border-purple-500/30 backdrop-blur-xl bg-black/70 sticky top-0 z-40">
            <div className="px-10 py-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        NEURAL CORE ACTIVE
                    </h1>
                    <p className="text-purple-400 text-sm mt-1 font-mono">
                        Consciousness: {username} • Status: ONLINE
                    </p>
                </div>

                <div className="text-right font-mono">
                    <div className="text-cyan-400 text-xl">{time.toLocaleTimeString()}</div>
                    <div className="text-purple-400 text-sm">{time.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </div>
        </header>
    );
}