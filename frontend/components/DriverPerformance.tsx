"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface BranchData {
    branch: string;
    average_score: number;
    driver_count: number;
}

export default function BranchAnalytics() {
    const [data, setData] = useState<BranchData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get("/fleet/driver-branch-analytics/");
                setData(res.data);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <p>Loading branch analytics...</p>;

    return (
        <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-4">Branch Driver Performance</h2>
            <BarChart width={800} height={400} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="branch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average_score" fill="#3b82f6" name="Avg Score" />
            </BarChart>
        </div>
    );
}
