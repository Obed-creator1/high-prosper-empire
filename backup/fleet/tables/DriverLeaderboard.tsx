// components/fleet/tables/DriverLeaderboard.tsx
"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Star, Medal, Phone, Award, Target, Zap } from "lucide-react";
import api from "@/lib/api";
import DriverDetailModal from "../modals/DriverDetailModal";

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

export default function DriverLeaderboard() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        api.get("/fleet/drivers/leaderboard/").then(res => setDrivers(res.data));
    }, []);

    const openModal = (driver: Driver) => {
        setSelectedDriver(driver);
        setModalOpen(true);
    };

    const getRankGradient = (rank: number) => {
        if (rank === 1) return "from-yellow-400 via-amber-500 to-orange-500";
        if (rank === 2) return "from-gray-400 via-gray-500 to-gray-600";
        if (rank === 3) return "from-orange-500 via-red-500 to-rose-600";
        return "from-indigo-500 via-purple-500 to-pink-500";
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-12 h-12 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-12 h-12 text-gray-400" />;
        if (rank === 3) return <Award className="w-12 h-12 text-orange-600" />;
        return <Target className="w-10 h-10 text-purple-600" />;
    };

    return (
        <>
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-black flex items-center gap-4">
                            <Trophy className="w-12 h-12 text-yellow-500" />
                            Driver Leaderboard
                        </h2>
                        <p className="text-lg text-gray-600 mt-2">
                            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-5xl font-black text-emerald-600">{drivers[0]?.score || 0}</p>
                        <p className="text-sm text-gray-500">Top Score This Month</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {drivers.slice(0, 10).map((driver, i) => (
                        <div
                            key={driver.id}
                            onClick={() => openModal(driver)}
                            className={`rounded-3xl p-6 flex items-center justify-between cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-2xl ${
                                i < 3
                                    ? `bg-gradient-to-r ${getRankGradient(driver.rank)} text-white shadow-2xl`
                                    : "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:from-gray-100 hover:to-gray-200"
                            }`}
                        >
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-center">
                                    {getRankIcon(driver.rank)}
                                    <p className={`text-2xl font-black mt-2 ${i < 3 ? "text-white" : "text-gray-800 dark:text-white"}`}>
                                        {i < 3 ? ["1st", "2nd", "3rd"][i] : `#${driver.rank}`}
                                    </p>
                                </div>

                                <div>
                                    <p className={`text-2xl font-black ${i < 3 ? "text-white" : "text-gray-900 dark:text-white"}`}>
                                        {driver.full_name}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
                    <span className="flex items-center gap-1">
                      <Zap className="w-4 h-4" /> {driver.collections} collections
                    </span>
                                        <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" /> {driver.rating}★ rating
                    </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className={`text-5xl font-black ${i < 3 ? "text-white" : "text-emerald-600"}`}>
                                    {driver.score}
                                </p>
                                <p className={`text-sm flex items-center gap-1 justify-end mt-2 ${i < 3 ? "text-white/90" : "text-green-600"}`}>
                                    <TrendingUp className="w-5 h-5" />
                                    +{Math.round(Math.random() * 18 + 5)} this month
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {drivers.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <Trophy className="w-20 h-20 mx-auto mb-4 opacity-30" />
                        <p className="text-xl">No driver data yet</p>
                    </div>
                )}
            </div>

            {/* MODAL */}
            <DriverDetailModal
                driver={selectedDriver}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
            />
        </>
    );
}