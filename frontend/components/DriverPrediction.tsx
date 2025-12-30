"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Prediction {
    driver_id: number;
    predicted_next_score: number;
}

export default function DriverPrediction({ driverId }: { driverId: number }) {
    const [prediction, setPrediction] = useState<Prediction | null>(null);

    useEffect(() => {
        const fetchPrediction = async () => {
            try {
                const res = await api.get(`/fleet/drivers/${driverId}/predict/`);
                setPrediction(res.data);
            } catch {}
        };
        fetchPrediction();
    }, [driverId]);

    if (!prediction) return <p>Loading prediction...</p>;

    return (
        <div className="p-2 bg-yellow-50 rounded">
            Predicted next month score: {prediction.predicted_next_score} ⭐
        </div>
    );
}
