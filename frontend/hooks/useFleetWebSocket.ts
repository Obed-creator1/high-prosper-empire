// hooks/useFleetWebSocket.ts
"use client";

import { useEffect, useRef, useState } from "react";

export const useFleetWebSocket = (onUpdate: (data: any) => void) => {
    const [connected, setConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const connect = () => {
            const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
            const url = `${protocol}${window.location.host}/ws/fleet/live/`;

            ws.current = new WebSocket(url);

            ws.current.onopen = () => setConnected(true);
            ws.current.onmessage = (e) => {
                try { onUpdate(JSON.parse(e.data)); } catch {}
            };
            ws.current.onerror = () => {}; // ← SILENT
            ws.current.onclose = () => {
                setConnected(false);
                setTimeout(connect, 3000);
            };
        };

        if (typeof window !== "undefined") connect();

        return () => ws.current?.close();
    }, [onUpdate]);

    return { connected };
};