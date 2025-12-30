// components/stock/ValuationReport.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calculator } from 'lucide-react';

interface ValuationItem {
    item_code: string;
    name: string;
    quantity: number;
    fifo_value: number;
    lifo_value: number;
    avg_cost: number;
    difference: number;
}

interface ValuationReportProps {
    data: ValuationItem[];
}

export function ValuationReport({ data }: ValuationReportProps) {
    const totalFIFO = data.reduce((sum, i) => sum + i.fifo_value, 0);
    const totalLIFO = data.reduce((sum, i) => sum + i.lifo_value, 0);
    const variance = totalFIFO - totalLIFO;
    const variancePercent = totalLIFO !== 0 ? ((totalFIFO - totalLIFO) / totalLIFO) * 100 : 0;

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-t-xl">
                <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <div className="flex items-center gap-3">
                        <Calculator className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        Inventory Valuation Report
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge
                            variant={variance >= 0 ? "default" : "destructive"}
                            className="text-lg px-4 py-2 font-bold"
                        >
                            {variance >= 0 ? (
                                <TrendingUp className="w-5 h-5 mr-2" />
                            ) : (
                                <TrendingDown className="w-5 h-5 mr-2" />
                            )}
                            {variance >= 0 ? '+' : ''}{variancePercent.toFixed(2)}%
                        </Badge>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            FIFO Valuation
                        </div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                            ${totalFIFO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">First In, First Out</div>
                    </div>

                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="text-sm font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                            LIFO Valuation
                        </div>
                        <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                            ${totalLIFO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Last In, First Out</div>
                    </div>

                    <div className={`text-center p-6 rounded-xl border ${variance >= 0
                        ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800'
                        : 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800'
                    }`}>
                        <div className="text-sm font-medium uppercase tracking-wider">
                            Valuation Variance
                        </div>
                        <div className={`text-3xl font-black mt-2 ${variance >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                            ${Math.abs(variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-xs font-medium mt-1 ${variance >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
                            {variance >= 0 ? 'FIFO Higher' : 'LIFO Higher'}
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="rounded-xl border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Item Code</TableHead>
                                <TableHead className="font-bold">Item Name</TableHead>
                                <TableHead className="text-right font-bold">Quantity</TableHead>
                                <TableHead className="text-right font-bold text-emerald-600">FIFO Value</TableHead>
                                <TableHead className="text-right font-bold text-blue-600">LIFO Value</TableHead>
                                <TableHead className="text-right font-bold">Difference</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        No items to display
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow key={item.item_code} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                            {item.item_code}
                                        </TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {item.quantity.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">
                                            ${item.fifo_value.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">
                                            ${item.lifo_value.toFixed(2)}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${item.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.difference >= 0 ? '+' : ''}${item.difference.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer Summary */}
                <div className="flex justify-end pt-4 border-t">
                    <div className="text-right space-y-1">
                        <div className="text-sm text-muted-foreground">Total Items Analyzed</div>
                        <div className="text-2xl font-bold">{data.length.toLocaleString()}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}