// components/stock/TurnoverChart.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export function TurnoverChart({ data }: { data: { name: string; value: number }[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Inventory Turnover Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-4 gap-4 mt-6 text-center">
                    <div><div className="w-4 h-4 bg-green-500 rounded inline-block mr-2" />Fast Moving</div>
                    <div><div className="w-4 h-4 bg-blue-500 rounded inline-block mr-2" />Normal</div>
                    <div><div className="w-4 h-4 bg-amber-500 rounded inline-block mr-2" />Slow</div>
                    <div><div className="w-4 h-4 bg-red-500 rounded inline-block mr-2" />Dead Stock</div>
                </div>
            </CardContent>
        </Card>
    );
}