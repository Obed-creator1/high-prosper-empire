// components/fleet/AIPredictivePanel.tsx
"use client";

import { motion } from "framer-motion";
import { Brain, AlertTriangle, Zap, TrendingUp, Shield, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function AIPredictivePanel() {
    const [predictions, setPredictions] = useState({
        highRiskVehicles: 3,
        predictedFailuresNext7Days: 5,
        fuelTheftAlerts: 1,
        driverScoreAverage: 87,
        optimalRoutesSaved: "RWF 1.2M",
        nextMaintenance: "RAB 774C • Brake Pads • 3 days"
    });

    useEffect(() => {
        // In real app: fetch from /fleet/ai/predictions/
        // Simulate real-time AI updates
        const interval = setInterval(() => {
            setPredictions(prev => ({
                ...prev,
                driverScoreAverage: Math.round(85 + Math.random() * 10)
            }));
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative"
        >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-3xl" />
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-xl">
                        <Brain className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black">AI Fleet Intelligence</h3>
                        <p className="text-sm opacity-90">Predictive • Proactive • Profitable</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                        <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                        <p className="text-3xl font-black">{predictions.highRiskVehicles}</p>
                        <p className="text-xs opacity-80">High Risk Vehicles</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                        <Timer className="w-8 h-8 text-orange-400 mb-2" />
                        <p className="text-3xl font-black">{predictions.predictedFailuresNext7Days}</p>
                        <p className="text-xs opacity-80">Failures in 7 Days</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Zap className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <p className="font-bold">Driver Behavior Score</p>
                                    <p className="text-2xl font-black">{predictions.driverScoreAverage}/100</p>
                                </div>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-400" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/30 to-emerald-600/30 rounded-2xl p-5 border border-green-400/50">
                        <p className="text-sm opacity-90">Route AI Saved This Month</p>
                        <p className="text-3xl font-black">{predictions.optimalRoutesSaved}</p>
                    </div>

                    <div className="bg-red-500/20 border border-red-400/50 rounded-2xl p-4">
                        <p className="text-sm font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Urgent: {predictions.nextMaintenance}
                        </p>
                    </div>
                </div>
            </div>

            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl -z-10" />
        </motion.div>
    );
}