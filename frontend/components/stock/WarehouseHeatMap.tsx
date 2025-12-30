// components/warehouse/WarehouseHeatMap.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Warehouse {
    name: string;
    code: string;
    utilization: number;
}

export function WarehouseHeatMap({ warehouses }: { warehouses: Warehouse[] }) {
    const getColor = (util: number) => {
        if (util > 90) return 'bg-red-500';
        if (util > 70) return 'bg-amber-500';
        if (util > 40) return 'bg-blue-500';
        return 'bg-green-500';
    };

    return (
        <Card>
            <CardHeader><CardTitle>Warehouse Utilization Heat Map</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {warehouses.map(w => (
                    <div key={w.code} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium">{w.name} ({w.code})</span>
                            <span>{w.utilization}%</span>
                        </div>
                        <Progress value={w.utilization} className={`h-8 ${getColor(w.utilization)}`} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}