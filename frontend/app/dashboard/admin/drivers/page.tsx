"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

// Lazy-load the map component (Leaflet) to avoid SSR issues
const VehicleMap = dynamic(() => import("@/components/VehicleMap"), { ssr: false });

interface Driver {
    id: number;
    full_name: string;
    rating: number;
    assigned_vehicle?: { registration_number: string; lat?: number; lng?: number };
    phone: string;
    license_expiry: string;
    status: "active" | "on_road" | "passive"; // real-time activity
}

export default function DriverPerformanceDashboard() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch driver list and status
    const fetchDrivers = async () => {
        try {
            const res = await api.get("/fleet/drivers/");
            setDrivers(res.data);
        } catch (err) {
            console.error("Failed to fetch drivers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();

        // Optional: poll every 30 seconds for live updates
        const interval = setInterval(fetchDrivers, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <p>Loading drivers...</p>;

    const chartData = drivers.map((d) => ({ name: d.full_name, rating: d.rating }));

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold mb-4">Driver Performance & Activity Dashboard</h1>

            {/* Real-Time Driver Map */}
            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Real-Time Driver Locations</h2>
                <VehicleMap drivers={drivers} />
            </section>

            {/* Drivers Table */}
            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Driver List & Status</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Assigned Vehicle</th>
                            <th className="p-2 border">Rating</th>
                            <th className="p-2 border">Phone</th>
                            <th className="p-2 border">License Expiry</th>
                            <th className="p-2 border">Status</th>
                        </tr>
                        </thead>
                        <tbody>
                        {drivers.map((d) => (
                            <tr key={d.id} className="hover:bg-gray-50">
                                <td className="p-2 border">{d.full_name}</td>
                                <td className="p-2 border">{d.assigned_vehicle?.registration_number || "-"}</td>
                                <td className="p-2 border">{d.rating.toFixed(1)}</td>
                                <td className="p-2 border">{d.phone}</td>
                                <td className="p-2 border">{d.license_expiry}</td>
                                <td
                                    className={`p-2 border font-semibold ${
                                        d.status === "active"
                                            ? "text-green-600"
                                            : d.status === "on_road"
                                                ? "text-blue-600"
                                                : "text-gray-500"
                                    }`}
                                >
                                    {d.status.replace("_", " ").toUpperCase()}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Driver Rating Chart */}
            <section className="bg-gray-50 p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Driver Performance Ratings</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="rating" fill="#8884d8" name="Rating (0-5)" />
                    </BarChart>
                </ResponsiveContainer>
            </section>
        </div>
    );
}
