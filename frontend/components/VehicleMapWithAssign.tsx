"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Driver {
    id: number;
    full_name: string;
    status: "active" | "on_road" | "passive";
}

interface Vehicle {
    id: number;
    registration_number: string;
    lat?: number;
    lng?: number;
    status: "active" | "on_road" | "passive";
    assigned_driver?: Driver;
}

interface VehicleMapWithAssignProps {
    vehicles: Vehicle[];
    center?: [number, number];
    zoom?: number;
}

const statusColors: Record<Vehicle["status"], string> = {
    active: "green",
    on_road: "blue",
    passive: "gray",
};

export default function VehicleMapWithAssign({
                                                 vehicles,
                                                 center = [-1.944, 30.061],
                                                 zoom = 12,
                                             }: VehicleMapWithAssignProps) {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [assigning, setAssigning] = useState(false);

    // Fix default marker icon
    useEffect(() => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "/leaflet/marker-icon-2x.png",
            iconUrl: "/leaflet/marker-icon.png",
            shadowUrl: "/leaflet/marker-shadow.png",
        });
    }, []);

    // Fetch drivers list from HR / users API
    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const res = await api.get("/users/drivers/"); // Endpoint should return active HR drivers
                setDrivers(res.data);
            } catch (err) {
                console.error("Failed to fetch drivers:", err);
            }
        };
        fetchDrivers();
    }, []);

    const handleAssignDriver = async (driverId: number) => {
        if (!selectedVehicle) return;
        setAssigning(true);
        try {
            await api.post(`/fleet/vehicles/${selectedVehicle.id}/assign-driver/`, {
                driver_id: driverId,
            });
            alert(`Driver assigned successfully!`);
            // Refresh UI
            selectedVehicle.assigned_driver = drivers.find((d) => d.id === driverId);
            setSelectedVehicle({ ...selectedVehicle });
        } catch (err) {
            console.error(err);
            alert("Failed to assign driver.");
        } finally {
            setAssigning(false);
        }
    };

    const markers = vehicles
        .filter((v) => v.lat && v.lng)
        .map((v) => {
            const color = statusColors[v.status];
            const icon = new L.Icon({
                iconUrl: `/markers/marker-${color}.png`,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: "/leaflet/marker-shadow.png",
            });

            return (
                <Marker
                    key={v.id}
                    position={[v.lat!, v.lng!]}
                    icon={icon}
                    eventHandlers={{
                        click: () => setSelectedVehicle(v),
                    }}
                />
            );
        });

    return (
        <div className="relative">
            <MapContainer
                key={Math.random()}
                center={center}
                zoom={zoom}
                style={{ height: "500px", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers}
            </MapContainer>

            {/* Assign Driver Modal */}
            {selectedVehicle && (
                <div className="absolute top-4 right-4 bg-white p-4 shadow-lg rounded w-80 z-50">
                    <h2 className="font-semibold mb-2">
                        Assign Driver - {selectedVehicle.registration_number}
                    </h2>

                    <select
                        className="w-full border p-2 rounded mb-2"
                        value={selectedVehicle.assigned_driver?.id || ""}
                        onChange={(e) => handleAssignDriver(parseInt(e.target.value, 10))}
                        disabled={assigning}
                    >
                        <option value="">Select Driver</option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} ({d.status})
                            </option>
                        ))}
                    </select>

                    <button
                        className="bg-red-500 text-white px-4 py-2 rounded"
                        onClick={() => setSelectedVehicle(null)}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
