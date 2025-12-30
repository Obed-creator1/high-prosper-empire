// components/fleet/RouteOptimizerModal.tsx
"use client";

import { useState } from "react";
import { X, Route, Zap, Clock, Fuel } from "lucide-react";
import toast from "react-hot-toast";

export default function RouteOptimizerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [optimizing, setOptimizing] = useState(false);

    const runOptimization = async () => {
        setOptimizing(true);
        // Simulate AI route optimization
        await new Promise(r => setTimeout(r, 3000));
        toast.success("Routes optimized! Saved 2.1 hours & 68L fuel", { icon: "Route optimized" });
        setOptimizing(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-6">
            <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 rounded-3xl shadow-3xl max-w-2xl w-full overflow-hidden">
                <div className="p-8 text-white">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-4xl font-black flex items-center gap-4">
                                <Zap className="w-12 h-12" />
                                AI Route Optimizer
                            </h2>
                            <p className="text-lg opacity-90 mt-2">Let AI plan the most efficient routes for today</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-2xl transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center">
                            <Route className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-3xl font-black">47</p>
                            <p className="text-sm opacity-80">Active Routes</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center">
                            <Clock className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-3xl font-black">8.4h</p>
                            <p className="text-sm opacity-80">Est. Daily Drive</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center">
                            <Fuel className="w-10 h-10 mx-auto mb-3" />
                            <p className="text-3xl font-black">1,240L</p>
                            <p className="text-sm opacity-80">Est. Fuel Use</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={runOptimization}
                            disabled={optimizing}
                            className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl font-black text-xl hover:shadow-2xl transition transform hover:scale-105 disabled:opacity-70"
                        >
                            {optimizing ? "AI Thinking... (87%)" : "Run AI Optimization Now"}
                        </button>
                        {optimizing && (
                            <div className="mt-6 text-sm opacity-80">
                                Analyzing traffic • driver patterns • fuel prices • weather...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}