// components/OfflineBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Brain } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import with { ssr: false } = never renders on server
const OfflineBannerContent = dynamic(
    () => import('./OfflineBannerContent'),
    { ssr: false }
);

export default function OfflineBanner() {
    return <OfflineBannerContent />;
}