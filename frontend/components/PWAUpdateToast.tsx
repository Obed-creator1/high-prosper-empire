// components/PWAUpdateToast.tsx or in your root layout
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function PWAUpdateHandler() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").then(reg => {
                console.log("SW registered:", reg);

                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener("statechange", () => {
                            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            });

            // Listen for controller change (after skipWaiting)
            navigator.serviceWorker.addEventListener("controllerchange", () => {
                window.location.reload();
            });
        }
    }, []);

    const handleUpdate = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }
    };

    useEffect(() => {
        if (updateAvailable) {
            toast(
                <div className="flex flex-col gap-3 p-2">
                    <div>
                        <strong className="text-lg">🎉 Empire Update Ready!</strong>
                        <p className="text-sm opacity-90 mt-1">
                            A new version of HIGH PROSPER 2026 is available.
                        </p>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => toast.dismiss()}>
                            Later
                        </Button>
                        <Button size="sm" onClick={handleUpdate}>
                            Update Now
                        </Button>
                    </div>
                </div>,
                {
                    duration: Infinity,
                    position: "bottom-center",
                    style: {
                        background: "#000",
                        color: "#00F0FF",
                        border: "1px solid #00F0FF",
                        borderRadius: "12px",
                        padding: "16px",
                        maxWidth: "400px",
                    },
                }
            );
        }
    }, [updateAvailable]);

    return null;
}