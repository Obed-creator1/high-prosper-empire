// components/AIPreloader.tsx
'use client';

import { useEffect, useState } from 'react';

export default function AIPreloader() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Auto-hide after 3.5 seconds (or when your app is ready)
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    if (!isLoading) return null;

    return (
        <div className="ai-preloader fade-out">
            <div className="neural-core">
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="ai-text">PROSPER AI</div>
            </div>
        </div>
    );
}