// components/fleet/VehicleMap.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// DYNAMIC IMPORT — THIS IS THE MAGIC FIX
const MapComponent = dynamic(() => import("./MapComponent"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-black to-purple-900 flex items-center justify-center rounded-3xl">
            <div className="text-center">
                <Loader2 className="w-20 h-20 text-cyan-400 animate-spin mx-auto mb-6" />
                <p className="text-3xl font-black text-cyan-300 font-black">Loading Live Fleet Map...</p>
                <p className="text-xl text-gray-400 mt-4">Connecting to 200+ vehicles...</p>
            </div>
        </div>
    ),
});

export default function VehicleMap({ vehicles }: { vehicles: any[] }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return <MapComponent vehicles={vehicles} />;
}