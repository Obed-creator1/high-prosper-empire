// components/fleet/VehicleGrid.tsx
"use client";

import { motion } from "framer-motion";
import { MapPin, Fuel, Wrench, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Vehicle {
    id: number;
    registration_number: string;
    brand: string;
    model: string;
    status: string;
    photo?: string;
    lat?: number;
    lng?: number;
    last_seen?: string;
    fuel_efficiency?: number;
}

export default function VehicleGrid({ vehicles, onSelect }: { vehicles: Vehicle[]; onSelect: (v: Vehicle) => void }) {
    const getStatusColor = (status: string) => {
        const colors: any = {
            on_road: "from-blue-500 to-cyan-500",
            active: "from-green-500 to-emerald-500",
            workshop: "from-orange-500 to-red-500",
            standby: "from-purple-500 to-pink-500",
        };
        return colors[status] || "from-gray-400 to-gray-600";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <motion.div layout>
                {vehicles.map((v) => (
                    <motion.div
                        key={v.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -8 }}
                        onClick={() => onSelect(v)}
                        className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-800"
                    >
                        <div className={`h-32 bg-gradient-to-br ${getStatusColor(v.status)} relative`}>
                            {v.photo ? (
                                <img src={v.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-white/80 text-6xl font-black">{v.registration_number.slice(-3)}</div>
                                </div>
                            )}
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-xl px-3 py-1 rounded-full text-xs font-bold text-white">
                                {v.status.replace("_", " ").toUpperCase()}
                            </div>
                        </div>

                        <div className="p-6">
                            <h3 className="text-xl font-black text-gray-800 dark:text-white">{v.registration_number}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{v.brand} {v.model}</p>

                            <div className="flex items-center gap-4 mt-4 text-sm">
                                {v.lat && <MapPin className="w-4 h-4 text-green-600" />}
                                {v.last_seen && (
                                    <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(v.last_seen), { addSuffix: true })}
                  </span>
                                )}
                            </div>

                            <div className="flex justify-between items-center mt-6">
                                <button className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl hover:scale-110 transition">
                                    <Eye className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                                </button>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Fuel Eff.</p>
                                    <p className="font-bold">{v.fuel_efficiency || "--"} km/L</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}