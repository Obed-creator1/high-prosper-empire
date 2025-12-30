// components/collector/CollectorLocationMap.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

// Lazy-load the entire map content
const MapContent = dynamic(() => import("./MapContent"), {
    ssr: false,
    loading: () => (
        <div className="h-full flex items-center justify-center text-gray-500">
            Loading map...
        </div>
    ),
});

export default function CollectorLocationMap() {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCollector, setSelectedCollector] = useState<number | null>(null);

    const center: [number, number] = [-1.9441, 30.0615];

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await api.get("/collector/locations/");
            const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
            setLocations(data);
        } catch (err) {
            console.error("Failed to load locations:", err);
            toast.error("Failed to load location history");
        } finally {
            setLoading(false);
        }
    };

    const filteredLocations = selectedCollector
        ? locations.filter((loc) => loc.collector?.id === selectedCollector)
        : locations;

    const pathCoordinates = filteredLocations
        .filter((loc) => loc.location?.coordinates)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((loc) => [loc.location.coordinates[1], loc.location.coordinates[0]] as [number, number]);

    // Unique collectors for dropdown
    const uniqueCollectors = Array.from(
        new Map(
            locations
                .filter((loc) => loc.collector?.id && loc.collector?.user)
                .map((loc) => [loc.collector.id, loc.collector])
        ).values()
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Collector Location History</h2>
                <select
                    value={selectedCollector || ""}
                    onChange={(e) => setSelectedCollector(e.target.value ? parseInt(e.target.value) : null)}
                    className="p-2 border rounded dark:bg-gray-800 dark:text-white"
                >
                    <option value="">All Collectors</option>
                    {uniqueCollectors.map((collector) => (
                        <option key={collector.id} value={collector.id}>
                            {collector.user?.username || collector.user?.first_name || `Collector ${collector.id}`}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ height: "600px", width: "100%" }}>
                <MapContent
                    center={center}
                    filteredLocations={filteredLocations}
                    pathCoordinates={pathCoordinates}
                />
            </div>
        </div>
    );
}