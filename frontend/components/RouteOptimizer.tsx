// components/RouteOptimizer.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";

export default function RouteOptimizer() {
    // Example locations (lat, lng)
    const [locations, setLocations] = useState<number[][]>([
        [-1.944, 30.061],
        [-1.950, 30.070],
        [-1.955, 30.065],
    ]);

    const [optimizedOrder, setOptimizedOrder] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const optimizeRoute = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post("/fleet/optimize-route/", { locations });
            setOptimizedOrder(res.data.optimized_order); // backend should return { optimized_order: [0,2,1,...] }
        } catch (err: any) {
            console.error("Route optimization failed:", err);
            setError("Failed to optimize route. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <button
                onClick={optimizeRoute}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
            >
                {loading ? "Optimizing..." : "Optimize Route"}
            </button>

            {error && <p className="text-red-500">{error}</p>}

            {optimizedOrder.length > 0 && (
                <div>
                    Optimized Order:{" "}
                    {optimizedOrder.map((i, idx) =>
                        idx === optimizedOrder.length - 1
                            ? i
                            : `${i} → `
                    )}
                </div>
            )}
        </div>
    );
}
