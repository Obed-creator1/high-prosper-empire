// lib/fabric-client.ts
"use client";  // Forces client-side only

import { useEffect, useState } from "react";

// Dynamic import to avoid SSR
let fabric: any = null;

const loadFabric = async () => {
    if (typeof window === "undefined") return null;

    if (!fabric) {
        const module = await import("fabric");
        fabric = module.fabric || module.default;
    }

    return fabric;
};

export const useFabric = () => {
    const [loadedFabric, setLoadedFabric] = useState<any>(null);

    useEffect(() => {
        loadFabric().then(setLoadedFabric);
    }, []);

    return loadedFabric;
};

export default loadFabric;