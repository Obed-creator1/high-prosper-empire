// components/collector/PerformanceChart.tsx
"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

export default function PerformanceChart() {
    const [trends, setTrends] = useState([]);

    useEffect(() => {
        fetchTrends();
    }, []);

    const fetchTrends = async () => {
        try {
            const res = await api.get("/collector/analytics/trends/");
            setTrends(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Collection Trends (Last 12 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_collected" fill="#6b46c1" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}