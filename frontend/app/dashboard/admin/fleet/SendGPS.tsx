"use client";

import { useState } from "react";
import api from "@/lib/api";

type Props = { vehicleId: number };

export default function SendGPS({ vehicleId }: Props) {
    const [loading, setLoading] = useState(false);

    const sendGPS = async () => {
        setLoading(true);

        // Example: random coordinates near Kigali for demo
        const lat = -1.95 + Math.random() * 0.01;
        const lng = 30.05 + Math.random() * 0.01;

        try {
            await api.post("fleet/update-gps/", { vehicle_id: vehicleId, lat, lng });
            alert(`GPS updated for vehicle ${vehicleId}`);
        } catch (err) {
            console.error(err);
            alert("Failed to send GPS");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={sendGPS}
            disabled={loading}
            className="mt-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
            {loading ? "Sending..." : "Send GPS"}
        </button>
    );
}
