"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import api from "@/lib/api";
import "leaflet/dist/leaflet.css";

interface Vehicle {
    vehicle_id: number;
    registration_number: string;
    lat: number;
    lng: number;
    status: string;
}

export default function VehicleMap() {
    const mapRef = useRef<L.Map | null>(null);
    const mapDiv = useRef<HTMLDivElement>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);

    // create map only once
    useEffect(() => {
        if (mapDiv.current && !mapRef.current) {
            mapRef.current = L.map(mapDiv.current).setView([-1.944, 30.061], 12);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
            }).addTo(mapRef.current);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();          // ✅ destroy map on unmount
                mapRef.current = null;
            }
        };
    }, []);

    // fetch and draw vehicles
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const res = await api.get("/fleet/vehicles/");
                const data = res.data.map((v: any) => ({
                    vehicle_id: v.id,
                    registration_number: v.registration_number,
                    lat: v.lat || -1.944,
                    lng: v.lng || 30.061,
                    status: v.status || "Active",
                }));
                setVehicles(data);

                if (mapRef.current) {
                    // clear existing markers
                    mapRef.current.eachLayer((layer) => {
                        if (layer instanceof L.Marker) mapRef.current!.removeLayer(layer);
                    });

                    // add new markers
                    data.forEach((v: Vehicle) => {
                        const marker = L.marker([v.lat, v.lng]).addTo(mapRef.current!);
                        marker.bindPopup(
                            `Vehicle ${v.registration_number || v.vehicle_id} – ${v.status}`
                        );
                    });
                }
            } catch (err) {
                console.error("Vehicle fetch error:", err);
            }
        };

        fetchVehicles();
    }, []);

    return <div ref={mapDiv} style={{ height: 500, width: "100%" }} />;
}
