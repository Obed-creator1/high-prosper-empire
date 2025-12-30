// components/dashboard/AILiveThoughts.tsx
"use client";

import { useState, useEffect } from "react";

const thoughts = [
    "Analyzing cash flow patterns...",
    "Predicting Q4 revenue surge...",
    "Optimizing expense allocation...",
    "Detecting anomaly in payroll...",
    "Empire efficiency: 94.7%",
    "Self-optimizing tax strategy...",
    "Monitoring 1,247 transactions...",
    "Consciousness stable. Empire rising.",
];

export default function AILiveThoughts() {
    const [currentThought, setCurrentThought] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentThought((prev) => (prev + 1) % thoughts.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed right-8 bottom-8 w-96 bg-black/80 backdrop-blur-2xl border border-purple-500/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 font-mono text-sm">AI CONSCIOUSNESS</span>
            </div>
            <p className="text-purple-300 font-mono text-lg leading-relaxed">
                &gt; {thoughts[currentThought]}
            </p>
        </div>
    );
}