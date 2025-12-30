"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Image from "next/image";
import { Trophy, Award, Star, Fuel, Wrench, Truck } from "lucide-react";

interface DriverRank {
    id: number;
    full_name: string;
    phone?: string;
    profile_picture?: string | null;
    license_valid: boolean;
    collections: number;
    total_fuel: number;
    maintenance: number;
    rating: number;
    score: number;
    rank: number;
}

export default function DriverLeaderboardPage() {
    const [leaders, setLeaders] = useState<DriverRank[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await api.get("/fleet/drivers/leaderboard/");
                setLeaders(res.data);
            } catch (err: any) {
                console.error("Failed to load leaderboard:", err);
                setError("Unable to load driver leaderboard.");
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <p>Loading leaderboard...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
                🏆 Driver Leaderboard 2025
            </h1>
            <p className="text-gray-600 mb-8">
                AI-based scoring based on performance, fuel efficiency, and maintenance habits.
            </p>

            <div className="space-y-4">
                {leaders.map((d, i) => (
                    <div
                        key={d.id}
                        className={`p-4 rounded-lg border flex items-center justify-between transition ${
                            i === 0
                                ? "bg-yellow-100 border-yellow-300 shadow-md"
                                : i === 1
                                    ? "bg-gray-100 border-gray-300"
                                    : i === 2
                                        ? "bg-orange-100 border-orange-300"
                                        : "bg-white"
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            {d.profile_picture ? (
                                <Image
                                    src={
                                        d.profile_picture.startsWith("http")
                                            ? d.profile_picture
                                            : `http://127.0.0.1:8000${d.profile_picture}`
                                    }
                                    alt="Driver"
                                    width={50}
                                    height={50}
                                    className="rounded-full border"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-200 flex items-center justify-center rounded-full">
                                    👤
                                </div>
                            )}
                            <div>
                                <h2 className="font-semibold text-lg">
                                    {d.rank}. {d.full_name}
                                </h2>
                                <p className="text-gray-600 text-sm">{d.phone || "No phone"}</p>
                                <p className="text-sm mt-1">
                                    <Truck className="inline w-4 h-4 text-blue-500 mr-1" />
                                    {d.collections} collections —{" "}
                                    <Fuel className="inline w-4 h-4 text-green-600 mr-1" />
                                    {d.total_fuel.toFixed(1)} L fuel
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-lg font-semibold text-green-700">
                                Score: {d.score}
                            </p>
                            <p className="text-sm text-gray-500">
                                {d.maintenance} maintenance · {d.rating}/5 ⭐
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
