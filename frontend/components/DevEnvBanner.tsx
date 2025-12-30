// components/DevEnvBanner.tsx
"use client";

import { useEffect, useState } from "react";

export default function DevEnvBanner() {
    const [envStatus, setEnvStatus] = useState({
        vapid: false,
        api: false,
        ws: false,
    });

    useEffect(() => {
        setEnvStatus({
            vapid: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            api: !!process.env.NEXT_PUBLIC_API_URL,
            ws: !!process.env.NEXT_PUBLIC_WS_URL,
        });
    }, []);

    // Hide automatically in production
    if (process.env.NODE_ENV !== "development") return null;

    const hasError = !envStatus.vapid || !envStatus.api || !envStatus.ws;

    return (
        <div
            className={`fixed top-4 right-4 z-[9999] text-white backdrop-blur-xl border rounded-xl shadow-xl px-5 py-3 text-sm font-medium transition-all duration-300
        ${hasError
                ? "bg-red-900/80 border-red-500 animate-pulse"
                : "bg-black/70 border-purple-600/40"
            }`}
        >
            <div className="flex items-center gap-2">
        <span className={`font-semibold ${hasError ? "text-red-300" : "text-purple-400"}`}>
          FLEET OS 2026 | DEV MODE
        </span>
            </div>

            <div className="mt-1 flex flex-col gap-1 text-xs text-gray-300">
                <div>
                    🔑 VAPID KEY:{" "}
                    <span className={envStatus.vapid ? "text-green-400" : "text-red-400"}>
            {envStatus.vapid ? "Loaded ✅" : "Missing ❌"}
          </span>
                </div>
                <div>
                    🌐 API:{" "}
                    <span className={envStatus.api ? "text-green-400" : "text-red-400"}>
            {envStatus.api ? "OK ✅" : "Missing ❌"}
          </span>
                </div>
                <div>
                    🔄 WS:{" "}
                    <span className={envStatus.ws ? "text-green-400" : "text-red-400"}>
            {envStatus.ws ? "OK ✅" : "Missing ❌"}
          </span>
                </div>
            </div>

            {hasError && (
                <p className="mt-2 text-xs text-red-300 italic">
                    Missing environment vars — check <code>.env.local</code>
                </p>
            )}
        </div>
    );
}
