// components/warehouse/WarehouseHeatMap.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Warehouse, AlertTriangle } from 'lucide-react';

interface Warehouse {
    id: number;
    name: string;
    code: string;
    utilization: number;
    capacity?: number;
    items_count?: number;
}

interface WarehouseHeatMapProps {
    warehouses: Warehouse[];
}

export function WarehouseHeatMap({ warehouses }: WarehouseHeatMapProps) {
    const getUtilizationColor = (util: number) => {
        if (util >= 90) return 'bg-red-500';
        if (util >= 75) return 'bg-orange-500';
        if (util >= 50) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const getUtilizationText = (util: number) => {
        if (util >= 90) return 'text-red-600 dark:text-red-400';
        if (util >= 75) return 'text-orange-600 dark:text-orange-400';
        if (util >= 50) return 'text-amber-600 dark:text-amber-400';
        return 'text-emerald-600 dark:text-emerald-400';
    };

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Warehouse className="w-8 h-8" />
                    Warehouse Capacity Heat Map
                </CardTitle>
                <CardDescription>
                    Real-time space utilization across all locations
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {warehouses.map((wh) => (
                    <div key={wh.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-lg">{wh.name}</h4>
                                <p className="text-sm text-muted-foreground">Code: {wh.code} • {wh.items_count || '—'} items</p>
                            </div>
                            <div className={`text-2xl font-bold ${getUtilizationText(wh.utilization)}`}>
                                {wh.utilization.toFixed(0)}%
                            </div>
                        </div>

                        <div className="relative">
                            <Progress
                                value={wh.utilization}
                                className={`h-10 rounded-lg ${getUtilizationColor(wh.utilization)}`}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-white font-bold text-lg drop-shadow-lg">
                  {wh.utilization.toFixed(0)}%
                </span>
                            </div>
                            {wh.utilization >= 90 && (
                                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white animate-pulse" />
                            )}
                        </div>
                    </div>
                ))}

                {warehouses.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No warehouses configured yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
}