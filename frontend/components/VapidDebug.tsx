// components/VapidDebug.tsx
"use client";

export default function VapidDebug() {
    if (process.env.NODE_ENV !== "development") return null;

    return (
        <div className="fixed top-4 left-4 z-50 bg-black/80 text-cyan-400 p-4 rounded-lg text-xs font-mono">
            VAPID: {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? "LOADED ✓" : "MISSING ✗"}
        </div>
    );
}