"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useParams } from "next/navigation";

interface Trend {
    month: string;
    score: number;
    collections: number;
    fuel: number;
    maintenance: number;
    rating: number;
}

export default function DriverTrendPage() {
    const { driverId } = useParams<{ driverId: string }>();
    const [trend, setTrend] = useState<Trend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrend = async () => {
            try {
                const res = await api.get(`/fleet/drivers/${driverId}/performance-trend/`);
                setTrend(res.data);
            } catch (err: any) {
                setError("Unable to load trend data.");
            } finally {
                setLoading(false);
            }
        };
        fetchTrend();
    }, [driverId]);

    if (loading) return <p>Loading driver trend...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    if (!trend.length) return <p>No historical data found.</p>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold mb-4">Driver Performance Trend</h1>
            <p className="text-gray-600 mb-6">
                Historical monthly performance evolution based on collections, fuel, and maintenance.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <LineChart width={900} height={400} data={trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" name="Performance Score" />
                    <Line type="monotone" dataKey="rating" stroke="#f59e0b" name="Rating" />
                </LineChart>
            </div>
        </div>
    );
}
