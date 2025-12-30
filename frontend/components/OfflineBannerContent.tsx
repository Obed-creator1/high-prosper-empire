// components/OfflineBannerContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Brain } from 'lucide-react';

export default function OfflineBannerContent() {
    const [isOnline, setIsOnline] = useState(true);
    const lastSync = typeof window !== 'undefined'
        ? localStorage.getItem('highprosper-last-sync') || 'Never'
        : 'Never';

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);

        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-900 via-rose-900 to-purple-900 text-white p-4 flex items-center justify-center gap-4 animate-pulse shadow-2xl"
            suppressHydrationWarning
        >
            <WifiOff className="h-8 w-8" />
            <div className="text-center">
                <p className="text-xl md:text-2xl font-black tracking-wider">OFFLINE MODE ACTIVE</p>
                <p className="text-sm md:text-base opacity-90">Last sync: {lastSync}</p>
            </div>
            <Brain className="h-8 w-8 animate-spin" />
        </div>
    );
}