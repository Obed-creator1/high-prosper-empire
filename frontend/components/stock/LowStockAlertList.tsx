// components/stock/LowStockAlertList.tsx
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface Alert {
    id: string;
    item_name: string;
    warehouse: string;
    available: number;
    reorder_level: number;
    severity: 'critical' | 'low';
}

export function LowStockAlertList({ alerts }: { alerts: Alert[] }) {
    if (alerts.length === 0) return null;

    return (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    {alerts[0].severity === 'critical' ? (
                        <AlertCircle className="w-8 h-8 text-red-600 animate-pulse" />
                    ) : (
                        <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                    <h3 className="text-xl font-bold">
                        {alerts[0].severity === 'critical' ? 'CRITICAL STOCK ALERTS' : 'Low Stock Warnings'}
                    </h3>
                </div>
                <div className="space-y-3">
                    {alerts.slice(0, 5).map(alert => (
                        <div key={alert.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                            <div>
                                <div className="font-semibold">{alert.item_name}</div>
                                <div className="text-sm text-muted-foreground">{alert.warehouse}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-red-600">{alert.available}</div>
                                <div className="text-xs">Reorder: {alert.reorder_level}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}