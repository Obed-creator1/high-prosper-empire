// components/common/RealTimeBadge.tsx
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface RealTimeBadgeProps {
    connected: boolean;
}

export function RealTimeBadge({ connected }: RealTimeBadgeProps) {
    return (
        <Badge
            variant={connected ? "default" : "destructive"}
            className="gap-1.5 font-medium animate-pulse"
        >
            <Zap className="w-3.5 h-3.5" />
            {connected ? 'LIVE' : 'OFFLINE'}
        </Badge>
    );
}