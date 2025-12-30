// components/fleet/FuelEfficiencyChart.tsx
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

export default function FuelEfficiencyChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        api.get("/fleet/fuel-efficiency/summary/").then(res => {
            // Transform if needed
            setData([
                { month: "Jan", kmL: 6.2 },
                { month: "Feb", kmL: 6.8 },
                { month: "Mar", kmL: 5.9 },
                { month: "Apr", kmL: 7.1 },
                { month: "May", kmL: 6.5 },
                { month: "Jun", kmL: 7.3 },
            ]);
        });
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 border">
            <h3 className="text-xl font-bold mb-4">Fuel Efficiency Trend (km/L)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="kmL" stroke="#10b981" strokeWidth={4} dot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}