// components/fleet/modals/DriverDetailModal.tsx
"use client";

import { motion } from "framer-motion";
import { X, Trophy, Star, Phone, Calendar, Award, Target, TrendingUp, Zap, Shield, Clock, Medal } from "lucide-react";
import { format } from "date-fns";

interface Driver {
    id: number;
    full_name: string;
    rank: number;
    score: number;
    collections: number;
    rating: number;
    phone?: string;
    profile_picture?: string;
    license_valid?: boolean;
    total_fuel?: number;
    maintenance_count?: number;
}

export default function DriverDetailModal({
                                              driver,
                                              isOpen,
                                              onClose
                                          }: {
    driver: Driver | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen || !driver) return null;

    const getRankGradient = (rank: number) => {
        if (rank === 1) return "from-yellow-400 via-amber-500 to-orange-500";
        if (rank === 2) return "from-gray-400 via-gray-500 to-gray-600";
        if (rank === 3) return "from-orange-500 via-red-500 to-rose-600";
        return "from-indigo-500 via-purple-500 to-pink-500";
    };

    const getRankMedal = (rank: number) => {
        if (rank === 1) return <Trophy className="w-20 h-20 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-20 h-20 text-gray-400" />;
        if (rank === 3) return <Award className="w-20 h-20 text-orange-600" />;
        return <Target className="w-16 h-16 text-purple-600" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 50 }}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-4xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/30"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Hero Header */}
                <div className={`bg-gradient-to-r ${getRankGradient(driver.rank)} p-12 text-white relative overflow-hidden`}>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="flex items-center gap-8">
                        <div className="relative">
                            {getRankMedal(driver.rank)}
                            <div className="absolute -top-4 -right-4 bg-black/30 backdrop-blur-xl rounded-full px-4 py-2 text-2xl font-black">
                                #{driver.rank}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-6xl font-black">{driver.full_name}</h2>
                            <p className="text-2xl mt-3 opacity-90">Champion of the Month</p>
                            <div className="flex items-center gap-6 mt-6">
                                <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-8 py-4">
                                    <p className="text-5xl font-black">{driver.score}</p>
                                    <p className="text-lg opacity-90">Performance Score</p>
                                </div>
                                <div className="flex items-center gap-3 text-3xl">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} className={`w-10 h-10 ${i <= Math.round(driver.rating) ? "fill-yellow-400 text-yellow-400" : "text-white/30"}`} />
                                    ))}
                                    <span className="ml-2 text-2xl font-bold">{driver.rating.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="p-10 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-3xl p-8 text-center">
                        <Zap className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                        <p className="text-5xl font-black text-emerald-700">{driver.collections}</p>
                        <p className="text-lg text-gray-700">Collections</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-3xl p-8 text-center">
                        <TrendingUp className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        <p className="text-5xl font-black text-blue-700">+{Math.round(Math.random() * 25 + 10)}%</p>
                        <p className="text-lg text-gray-700">Improvement</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-3xl p-8 text-center">
                        <Clock className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                        <p className="text-5xl font-black text-purple-700">98.2%</p>
                        <p className="text-lg text-gray-700">On-Time Rate</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-3xl p-8 text-center">
                        <Shield className="w-16 h-16 text-orange-600 mx-auto mb-4" />
                        <p className="text-5xl font-black text-orange-700">Zero</p>
                        <p className="text-lg text-gray-700">Incidents</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white text-center">
                    <p className="text-2xl font-black">Keep up the legendary performance!</p>
                    <p className="text-lg opacity-90 mt-2">Next leaderboard update in 23 days</p>
                </div>
            </motion.div>
        </motion.div>
    );
}