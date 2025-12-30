"use client";

import { useEffect, useState } from "react";
import Map, { Marker, Popup } from "react-map-gl";
import { Pin, User, AlertCircle, DollarSign } from "lucide-react";
import api from "@/lib/api";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function CustomerGPSMap() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/customers/gps-map/")
            .then(res => {
                setCustomers(res.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getPinColor = (balance: number, daysLate: number) => {
        if (daysLate > 90 || balance > 100000) return "#dc2626"; // Critical red
        if (daysLate > 30 || balance > 0) return "#f97316";     // Orange
        if (balance < 0) return "#10b981";                     // Green overpaid
        return "#6366f1";                                      // Indigo paid
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <p className="text-3xl">Loading customer map...</p>
            </div>
        );
    }

    return (
        <div className="h-screen w-full relative">
            <Map
                initialViewState={{
                    latitude: -1.9441,
                    longitude: 30.0619,
                    zoom: 11
                }}
                mapStyle="mapbox://styles/mapbox/dark-v11"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                {customers.map((c) => (
                    <Marker
                        key={c.id}
                        latitude={c.lat}
                        longitude={c.lng}
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            setSelected(c);
                        }}
                    >
                        <div className="relative animate-pulse">
                            <Pin
                                size={44}
                                fill={getPinColor(c.balance, c.days_delinquent)}
                                stroke="white"
                                strokeWidth={2}
                                className="drop-shadow-2xl"
                            />
                            <DollarSign
                                size={18}
                                className="absolute top-3 left-3 text-white"
                            />
                        </div>
                    </Marker>
                ))}

                {selected && (
                    <Popup
                        latitude={selected.lat}
                        longitude={selected.lng}
                        onClose={() => setSelected(null)}
                        closeButton={true}
                        offset={25}
                        maxWidth="320px"
                    >
                        <div className="p-4">
                            <h3 className="font-bold text-xl">{selected.name}</h3>
                            <p className="text-sm text-gray-600">{selected.phone}</p>
                            <p className="text-sm mt-2">
                                Village: <span className="font-medium">{selected.village}</span>
                            </p>

                            <div className="mt-4 pt-4 border-t">
                                <p className="font-bold text-2xl"
                                   style={{ color: getPinColor(selected.balance, selected.days_delinquent) }}>
                                    RWF {Math.abs(selected.balance).toLocaleString()}
                                </p>
                                <p className="text-sm mt-1">
                                    {selected.balance > 0 ? "Owes" : selected.balance < 0 ? "Overpaid" : "Paid"}
                                    {selected.days_delinquent > 0 && (
                                        <span className="ml-2 text-red-600">
                      <AlertCircle className="inline w-4 h-4" /> {selected.days_delinquent} days late
                    </span>
                                    )}
                                </p>
                                <p className="text-xs mt-2">
                                    Risk Score: <span className="font-bold">{selected.risk_score}/100</span>
                                </p>
                            </div>

                            <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium">
                                View Profile
                            </button>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Legend */}
            <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur p-6 rounded-2xl text-white">
                <h3 className="font-bold text-lg mb-4">Legend</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                        <Pin size={28} fill="#dc2626" />
                        <span>Critical (>90 days or >100k owed)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Pin size={28} fill="#f97316" />
                        <span>Overdue</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Pin size={28} fill="#10b981" />
                        <span>Overpaid</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Pin size={28} fill="#6366f1" />
                        <span>Paid</span>
                    </div>
                </div>
                <p className="mt-4 text-lg font-bold">
                    {customers.length} customers on map
                </p>
            </div>
        </div>
    );
}