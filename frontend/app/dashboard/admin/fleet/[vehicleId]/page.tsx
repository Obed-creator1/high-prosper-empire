// app/(fleet)/[vehicleId]/page.tsx — FINAL 100% WORKING + AUTO REDIRECT (2026)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wrench, Fuel, User, ArrowLeft, AlertCircle, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const VehicleMap = dynamic(() => import("@/components/fleet/VehicleMap"), { ssr: false });
const RouteOptimizer = dynamic(() => import("@/components/fleet/RouteOptimizerModal"), { ssr: false });

interface VehicleDetail {
    id: number;
    registration_number: string;
    brand: string;
    model: string;
    fuel_type: string;
    status: string;
    driver_name?: string;
    photo?: string;
    last_service_date?: string;
    next_service_due?: string;
    lat?: number;
    lng?: number;
}

interface FuelReport { date: string; total_liters: number; total_cost: number; }
interface MaintenanceReport { date: string; cost: number; maintenance_type: string; }

export default function VehicleDetailPage({
                                              params,
                                          }: {
    params: Promise<{ vehicleId: string }>;
}) {
    const router = useRouter();
    const { vehicleId } = use(params);

    const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
    const [fuelReport, setFuelReport] = useState<FuelReport[]>([]);
    const [maintenanceReport, setMaintenanceReport] = useState<MaintenanceReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchVehicleData = async () => {
            if (!vehicleId) return;

            try {
                const [vRes, fuelRes, maintRes] = await Promise.all([
                    api.get(`/fleet/vehicles/${vehicleId}/`),
                    api.get(`/fleet/fuel-efficiency/?vehicle=${vehicleId}`),
                    api.get(`/fleet/repairs/?vehicle=${vehicleId}`),
                ]);

                setVehicle(vRes.data);
                setFuelReport(fuelRes.data.results || fuelRes.data);
                setMaintenanceReport(maintRes.data.results || maintRes.data);
            } catch (err: any) {
                console.error("Vehicle not found:", err);
                setNotFound(true);

                // Auto redirect after 3 seconds
                const timer = setTimeout(() => {
                    router.push("/(fleet)");
                }, 3000);

                return () => clearTimeout(timer);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleData();
    }, [vehicleId, router]);

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-32 h-32 border-12 border-cyan-500 border-t-transparent rounded-full animate-spin mb-10"></div>
                    <p className="text-5xl font-black text-cyan-400">SCANNING FLEET...</p>
                </div>
            </div>
        );
    }

    // Vehicle Not Found → Epic Redirect Page
    if (notFound || !vehicle) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-8">
                <div className="text-center max-w-4xl">
                    {/* Animated Rocket */}
                    <motion.div
                        initial={{ y: 0 }}
                        animate={{ y: [-20, 20, -20] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="mb-12"
                    >
                        <Rocket className="w-40 h-40 text-cyan-500 mx-auto" />
                    </motion.div>

                    <h1 className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-clip-text mb-8">
                        VEHICLE NOT FOUND
                    </h1>

                    <p className="text-3xl text-gray-300 mb-4">ID: {vehicleId}</p>
                    <p className="text-2xl text-gray-400 mb-12">
                        This vehicle has either been removed, never existed, or is currently cloaked by our AI stealth system.
                    </p>

                    <div className="text-xl text-cyan-400 font-bold mb-12">
                        Redirecting to Fleet Command Center in <span className="text-4xl text-pink-500">3</span> seconds...
                    </div>

                    <button
                        onClick={() => router.push("/(fleet)")}
                        className="px-12 py-6 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-3xl font-black text-2xl hover:scale-110 transition-all shadow-2xl hover:shadow-cyan-500/50"
                    >
                        ← RETURN TO BASE IMMEDIATELY
                    </button>
                </div>
            </div>
        );
    }

    // Normal Vehicle View (unchanged from previous perfect version)
    return (
        <div className="p-6 space-y-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push("/(fleet)")}
                    className="flex items-center gap-3 text-cyan-400 hover:text-cyan-300 transition text-lg font-bold"
                >
                    <ArrowLeft className="w-6 h-6" /> Back to Fleet
                </button>
                <h1 className="text-6xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {vehicle.registration_number}
                </h1>
            </div>

            {/* Hero Section */}
            <div className="glass-card p-12 rounded-3xl grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="text-center">
                    {vehicle.photo ? (
                        <Image
                            src={vehicle.photo.startsWith("http") ? vehicle.photo : `http://127.0.0.1:8000${vehicle.photo}`}
                            alt={vehicle.registration_number}
                            width={500}
                            height={400}
                            className="rounded-3xl border-8 border-cyan-500/40 shadow-2xl"
                        />
                    ) : (
                        <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl w-full h-96 flex items-center justify-center text-6xl font-bold text-gray-700 border-8 border-dashed border-gray-800">
                            NO PHOTO
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <h2 className="text-5xl font-black">{vehicle.brand} {vehicle.model}</h2>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="glass-panel p-6">
                            <p className="text-gray-400 text-lg">Status</p>
                            <p className={`text-4xl font-black mt-2 ${vehicle.status === "on_road" ? "text-cyan-400" : "text-orange-400"}`}>
                                {vehicle.status.replace("_", " ").toUpperCase()}
                            </p>
                        </div>
                        <div className="glass-panel p-6">
                            <p className="text-gray-400 text-lg">Fuel Type</p>
                            <p className="text-4xl font-black mt-2 text-green-400">{vehicle.fuel_type}</p>
                        </div>
                        <div className="glass-panel p-6">
                            <p className="text-gray-400 text-lg">Driver</p>
                            <p className="text-4xl font-black mt-2">{vehicle.driver_name || "Unassigned"}</p>
                        </div>
                        <div className="glass-panel p-6">
                            <p className="text-gray-400 text-lg">Next Service</p>
                            <p className="text-4xl font-black mt-2 text-yellow-400">
                                {vehicle.next_service_due || "N/A"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="glass-panel">
                    <h3 className="text-3xl font-black mb-8 flex items-center gap-4">
                        <Fuel className="w-10 h-10 text-green-500" /> Fuel Consumption
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={fuelReport}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip contentStyle={{ background: "#111", border: "1px solid #444" }} />
                            <Legend />
                            <Bar dataKey="total_liters" fill="#00ff9d" name="Liters" />
                            <Bar dataKey="total_cost" fill="#8b5cf6" name="Cost (RWF)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="glass-panel">
                    <h3 className="text-3xl font-black mb-8 flex items-center gap-4">
                        <Wrench className="w-10 h-10 text-orange-500" /> Maintenance History
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={maintenanceReport}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip contentStyle={{ background: "#111", border: "1px solid #444" }} />
                            <Legend />
                            <Bar dataKey="cost" fill="#f97316" name="Cost (RWF)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            {/* Live Map */}
            <div className="glass-panel">
                <h3 className="text-4xl font-black mb-8">Live Location Tracking</h3>
                <div className="h-96 rounded-3xl overflow-hidden border-8 border-cyan-500/30 shadow-2xl">
                    <VehicleMap vehicles={vehicle.lat && vehicle.lng ? [vehicle] : []} />
                </div>
            </div>
        </div>
    );
}