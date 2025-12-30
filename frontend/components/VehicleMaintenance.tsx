// components/VehicleMaintenance.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface VehicleMaintenanceProps {
    vehicleId: number;
}

export default function VehicleMaintenance({ vehicleId }: VehicleMaintenanceProps) {
    const [needsService, setNeedsService] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMaintenance = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get(`/fleet/predict-maintenance/${vehicleId}/`);
                setNeedsService(res.data.needs_service);
            } catch (err: any) {
                console.error(`Failed to fetch maintenance for vehicle ${vehicleId}:`, err);
                setError("Failed to load maintenance status");
                setNeedsService(null);
            } finally {
                setLoading(false);
            }
        };

        fetchMaintenance();
    }, [vehicleId]);

    if (loading) return <div className="p-2 border rounded bg-gray-100">Loading...</div>;
    if (error) return <div className="p-2 border rounded bg-yellow-100 text-red-500">{error}</div>;

    return (
        <div className={`p-2 border rounded ${needsService ? "bg-red-100" : "bg-green-100"}`}>
            Vehicle {vehicleId} {needsService ? "needs maintenance soon 🚨" : "is fine ✅"}
        </div>
    );
}
