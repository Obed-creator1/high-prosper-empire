// components/fleet/DriverScoreWidget.tsx
"use client";

import { motion } from "framer-motion";

export default function DriverScoreWidget() {
    const score = 94;
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold mb-6">Fleet Driver Score</h3>
            <div className="flex items-center justify-center">
                <svg width="180" height="180" className="-rotate-90">
                    <circle
                        cx="90"
                        cy="90"
                        r={radius}
                        stroke="#e5e7eb"
                        strokeWidth="16"
                        fill="none"
                    />
                    <motion.circle
                        cx="90"
                        cy="90"
                        r={radius}
                        stroke="#10b981"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                    <text x="90" y="100" textAnchor="middle" className="fill-gray-800 dark:fill-white text-4xl font-black transform rotate-90">
                        {score}
                    </text>
                </svg>
            </div>
            <p className="text-center mt-4 text-green-600 font-bold text-lg">Excellent Performance</p>
        </div>
    );
}