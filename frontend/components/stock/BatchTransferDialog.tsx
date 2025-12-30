// components/stock/BatchTransferDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Warehouse {
    id: number;
    name: string;
    code: string;
}

interface BatchTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedItems: Set<string>;
    currentWarehouseId: number;
    warehouses: Warehouse[];
    onSuccess: () => void;
}

export function BatchTransferDialog({
                                        open,
                                        onOpenChange,
                                        selectedItems,
                                        currentWarehouseId,
                                        warehouses,
                                        onSuccess
                                    }: BatchTransferDialogProps) {
    const [toWarehouse, setToWarehouse] = useState<number | null>(null);
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const availableWarehouses = warehouses.filter(w => w.id !== currentWarehouseId);

    const handleTransfer = async () => {
        if (!toWarehouse || !quantity || parseInt(quantity) <= 0 || selectedItems.size === 0) {
            toast.error('Please fill all fields correctly');
            return;
        }

        setLoading(true);
        try {
            await api.post('/stock/warehousetransfer/', {
                from_warehouse: currentWarehouseId,
                to_warehouse: toWarehouse,
                items_data: Array.from(selectedItems).map(id => ({
                    stock: id,
                    quantity: parseInt(quantity)
                })),
                notes
            });

            toast.success(`Transfer created! ${selectedItems.size} items → ${quantity} each`);
            onOpenChange(false);
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <Truck className="w-8 h-8 text-emerald-600" />
                        Batch Warehouse Transfer
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                        <div>
                            <div className="font-semibold">{selectedItems.size} items selected</div>
                            <div className="text-sm text-muted-foreground">
                                All will be transferred with the same quantity
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>From Warehouse</Label>
                            <div className="p-3 bg-muted rounded-lg font-medium">
                                {warehouses.find(w => w.id === currentWarehouseId)?.name || 'Unknown'}
                            </div>
                        </div>
                        <div>
                            <Label>To Warehouse</Label>
                            <Select value={toWarehouse?.toString()} onValueChange={(v) => setToWarehouse(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableWarehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id.toString()}>
                                            {w.name} ({w.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Quantity per Item</Label>
                        <Input
                            type="number"
                            min="1"
                            placeholder="e.g. 50"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Reason for transfer..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Total Items Moving</div>
                                <div className="text-2xl font-bold">{selectedItems.size}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Total Quantity</div>
                                <div className="text-2xl font-bold text-emerald-600">
                                    {(selectedItems.size * parseInt(quantity || '0')).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={loading || !toWarehouse || !quantity}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                        {loading ? (
                            <>Transferring...</>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                                Create Transfer
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}