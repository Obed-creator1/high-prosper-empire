"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Image from "next/image";
import { Award, Fuel, Wrench, Truck } from "lucide-react";

interface DriverPerformance {
    id: number;
    full_name: string;
    phone?: string;
    profile_picture?: string | null;
    license_valid: boolean;
    total_collections: number;
    total_fuel: number;
    maintenance_count: number;
    rating: number;
}

export default function DriverPerformanceDashboard() {
    const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/fleet/drivers/performance/");
                setDrivers(res.data);
            } catch (err: any) {
                console.error("Failed to fetch driver performance:", err);
                setError("Unable to load driver performance data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <p>Loading performance data...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold mb-4">🚛 Driver Performance Dashboard</h1>
            <p className="text-gray-600 mb-6">
                Review overall efficiency, fuel usage, and maintenance incidents by driver.
            </p>

            {/* Driver Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {drivers.map((d) => (
                    <div
                        key={d.id}
                        className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition duration-200 border"
                    >
                        <div className="flex items-center mb-3">
                            {d.profile_picture ? (
                                <Image
                                    src={
                                        d.profile_picture.startsWith("http")
                                            ? d.profile_picture
                                            : `http://127.0.0.1:8000${d.profile_picture}`
                                    }
                                    alt="Driver"
                                    width={40}
                                    height={40}
                                    className="rounded-full mr-3 border"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3 flex items-center justify-center text-gray-500">
                                    👤
                                </div>
                            )}
                            <div>
                                <h2 className="font-semibold text-lg">{d.full_name}</h2>
                                <p className="text-sm text-gray-500">{d.phone || "No phone"}</p>
                            </div>
                        </div>

                        <div className="space-y-1 text-sm">
                            <p>
                                <Truck className="inline-block w-4 h-4 text-blue-500 mr-1" />
                                <strong>Collections:</strong> {d.total_collections}
                            </p>
                            <p>
                                <Fuel className="inline-block w-4 h-4 text-green-500 mr-1" />
                                <strong>Fuel Used:</strong> {d.total_fuel.toFixed(2)} L
                            </p>
                            <p>
                                <Wrench className="inline-block w-4 h-4 text-orange-500 mr-1" />
                                <strong>Maintenance:</strong> {d.maintenance_count}
                            </p>
                            <p>
                                <Award className="inline-block w-4 h-4 text-yellow-500 mr-1" />
                                <strong>Rating:</strong> {d.rating.toFixed(1)} / 5
                            </p>
                            <p className={`text-sm ${d.license_valid ? "text-green-600" : "text-red-600"}`}>
                                License: {d.license_valid ? "✅ Valid" : "❌ Expired"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bar Chart for quick comparison */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Driver Comparison (Fuel & Collections)</h2>
                <BarChart width={900} height={400} data={drivers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="full_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_collections" fill="#3b82f6" name="Collections" />
                    <Bar dataKey="total_fuel" fill="#10b981" name="Fuel (L)" />
                </BarChart>
            </div>
        </div>
    );
}
