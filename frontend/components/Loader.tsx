// components/Loader.tsx — MODERN & ADVANCED LOADER 2026
"use client";

import { motion } from "framer-motion";

export default function Loader() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-950/90 backdrop-blur-sm z-50">
            <div className="relative flex flex-col items-center gap-6">
                {/* Outer pulsing ring */}
                <motion.div
                    className="absolute w-32 h-32 rounded-full border-4 border-purple-500/30 dark:border-purple-400/30"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Inner rotating ring with gradient */}
                <div className="relative w-24 h-24">
                    <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-pink-600 border-b-cyan-600 border-l-transparent animate-spin"
                        style={{ animationDuration: "1.2s" }}
                    />
                    <motion.div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-purple-500 border-b-pink-500 border-l-transparent animate-spin"
                        style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
                    />
                </div>

                {/* Center neon glow */}
                <motion.div
                    className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 shadow-2xl shadow-purple-500/50"
                    animate={{
                        scale: [1, 1.1, 1],
                        boxShadow: [
                            "0 0 20px rgba(168, 85, 247, 0.6)",
                            "0 0 40px rgba(168, 85, 247, 0.9)",
                            "0 0 20px rgba(168, 85, 247, 0.6)",
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Text below loader */}
                <motion.p
                    className="text-lg font-semibold text-gray-800 dark:text-gray-200 tracking-wide"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    Loading High Prosper...
                </motion.p>
            </div>
        </div>
    );
}