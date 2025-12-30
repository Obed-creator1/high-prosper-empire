"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import api from "@/lib/api";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CollectorLocation {
    username: string;
    lat: number;
    lng: number;
    last_seen: string;
    villages: string[];
}

export default function CollectorMapPage() {
    const [locations, setLocations] = useState<CollectorLocation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const res = await api.get("/users/collector/locations/");
                setLocations(res.data);
            } catch {
                toast.error("Failed to load collector locations");
            } finally {
                setLoading(false);
            }
        };

        fetchLocations();
        const interval = setInterval(fetchLocations, 30_000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-10 text-center">Loading map...</div>;

    return (
        <div className="h-screen w-full">
            <div className="bg-white dark:bg-gray-800 shadow-lg p-4 mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    Collector Live Tracking ({locations.length} online)
                </h1>
            </div>

            <MapContainer center={[-1.9403, 29.8739]} zoom={8} style={{ height: "calc(100vh - 80px)", width: "100%" }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                />

                {locations.map((c) => (
                    <Marker key={c.username} position={[c.lat, c.lng]}>
                        <Popup>
                            <div className="text-center">
                                <strong>{c.username}</strong><br />
                                Last seen: {new Date(c.last_seen).toLocaleTimeString()}<br />
                                Villages: {c.villages.join(", ")}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}