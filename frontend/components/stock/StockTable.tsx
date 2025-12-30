// components/stock/StockTable.tsx
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StockItem {
    id: string;
    item_code: string;
    barcode: string | null;
    name: string;
    warehouse_name: string;
    available_quantity: number;
    unit_price: number;
    total_value: number;
    stock_status: 'critical' | 'low' | 'normal' | 'excess';
}

interface StockTableProps {
    items: StockItem[];
    loading?: boolean;
    error?: string | null;
    onEdit: (item: StockItem) => void;
    onDelete: (id: string) => void;
}

export function StockTable({ items, loading = false, error, onEdit, onDelete }: StockTableProps) {
    if (loading) return <StockTableSkeleton />;
    if (error) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>;
    if (items.length === 0) return <div className="text-center py-12 text-muted-foreground">No items found</div>;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12"><Checkbox disabled /></TableHead>
                        <TableHead>Code / Barcode</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell><Checkbox /></TableCell>
                            <TableCell className="font-mono text-sm">
                                <div className="font-bold">{item.item_code}</div>
                                {item.barcode && <div className="text-xs text-muted-foreground">{item.barcode}</div>}
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell><Badge variant="outline">{item.warehouse_name}</Badge></TableCell>
                            <TableCell className="text-right font-bold text-xl tabular-nums">
                                {item.available_quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600 tabular-nums">
                                ${item.total_value.toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <Badge variant={
                                    item.stock_status === 'critical' ? 'destructive' :
                                        item.stock_status === 'low' ? 'warning' :
                                            item.stock_status === 'excess' ? 'secondary' : 'default'
                                }>
                                    {item.stock_status.toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15" r="1.5"/></svg></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function StockTableSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-md">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>
            ))}
        </div>
    );
}