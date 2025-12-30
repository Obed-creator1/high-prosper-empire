// components/stock/StockForm.tsx
"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Category { id: number; name: string; }
interface StockItem {
    id?: string;
    item_code: string;
    barcode?: string | null;
    name: string;
    category: number;
    unit_price?: number | null;
}

interface StockFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item?: StockItem | null;
    categories: Category[];
    onSuccess?: () => void;
}

export function StockForm({ open, onOpenChange, item, categories, onSuccess }: StockFormProps) {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const payload = {
            item_code: formData.get('item_code') as string,
            barcode: (formData.get('barcode') as string) || null,
            name: formData.get('name') as string,
            category: Number(formData.get('category')),
            unit_price: formData.get('unit_price') ? Number(formData.get('unit_price')) : null,
        };

        try {
            if (item?.id) {
                await api.put(`/stock/stock/${item.id}/`, payload);
                toast.success("Item updated successfully!");
            } else {
                await api.post('/stock/stock/', payload);
                toast.success("Item created successfully!");
            }
            onSuccess?.();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to save item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{item ? 'Edit' : 'Add New'} Stock Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="item_code">Item Code *</Label>
                            <Input name="item_code" defaultValue={item?.item_code} required disabled={loading} />
                        </div>
                        <div>
                            <Label htmlFor="barcode">Barcode</Label>
                            <Input name="barcode" defaultValue={item?.barcode || ''} disabled={loading} />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input name="name" defaultValue={item?.name} required disabled={loading} />
                        </div>
                        <div>
                            <Label htmlFor="category">Category *</Label>
                            <Select name="category" defaultValue={item?.category ? String(item.category) : undefined} disabled={loading}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="unit_price">Unit Price</Label>
                            <Input name="unit_price" type="number" step="0.01" defaultValue={item?.unit_price || ''} disabled={loading} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}