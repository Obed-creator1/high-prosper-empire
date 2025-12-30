// app/stock/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/ui/StatsCard';
import { StockForm } from '@/components/stock/StockForm';
import { StockTable } from '@/components/stock/StockTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, RefreshCw, Layers } from 'lucide-react';

interface Category { id: number; name: string; }
interface Warehouse { id: number; name: string; code: string; }
interface StockItem {
    id: string;
    item_code: string;
    barcode: string | null;
    name: string;
    category_name?: string;
    warehouse_name: string;
    available_quantity: number;
    unit_price: number;
    total_value: number;
    stock_status: 'critical' | 'low' | 'normal' | 'excess';
}

export default function StockPage() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [summaryRes, catsRes, whRes] = await Promise.all([
                api.get('/stock/warehousestock/summary/'),
                api.get('/stock/categories/'),
                api.get('/stock/warehouses/'),
            ]);

            const mapped: StockItem[] = (summaryRes.data.summary_data || []).map((ws: any) => ({
                id: ws.stock_id,
                item_code: ws.item_code,
                barcode: ws.barcode || null,
                name: ws.name,
                category_name: ws.category || 'Uncategorized',
                warehouse_name: ws.warehouse?.name || 'Main Warehouse',
                available_quantity: ws.available_quantity || 0,
                unit_price: parseFloat(ws.unit_price) || 0,
                total_value: parseFloat(ws.total_value) || 0,
                stock_status: ws.stock_status || 'normal',
            }));

            setStockItems(mapped);
            setCategories(catsRes.data);
            setWarehouses(whRes.data);
        } catch (err) {
            toast.error("Failed to load stock data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredItems = stockItems.filter(item => {
        const matchesSearch = !searchTerm ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.item_code.includes(searchTerm) ||
            (item.barcode && item.barcode.includes(searchTerm));
        const matchesWarehouse = warehouseFilter === 'all' || item.warehouse_name === warehouseFilter;
        const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter;
        return matchesSearch && matchesWarehouse && matchesStatus;
    });

    const totalValue = filteredItems.reduce((sum, i) => sum + i.total_value, 0);
    const criticalCount = filteredItems.filter(i => i.stock_status === 'critical').length;

    const handleDelete = async (id: string) => {
        if (!confirm("Delete permanently?")) return;
        try {
            await api.delete(`/stock/stock/${id}/`);
            toast.success("Item deleted");
            fetchData();
        } catch {
            toast.error("Delete failed");
        }
    };

    const handleSuccess = () => {
        setEditingItem(null);
        setFormOpen(false);
        toast.success("Saved successfully!");
        fetchData();
    };

    return (
        <DashboardLayout>
            <div className="p-6 space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl">
                            <Layers className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-700 to-indigo-800 bg-clip-text text-transparent">
                                Stock Control Center
                            </h1>
                            <p className="text-lg text-muted-foreground">Real-time • Multi-warehouse • Enterprise Ready</p>
                        </div>
                    </div>
                    <Button onClick={fetchData} size="icon" variant="outline">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon="dollar" />
                    <StatsCard title="Total Items" value={filteredItems.length} icon="package" />
                    <StatsCard title="Critical Stock" value={criticalCount} icon="alert" />
                    <StatsCard title="Warehouses" value={warehouses.length} icon="building" />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col lg:flex-row justify-between gap-4">
                            <div className="flex flex-wrap gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="pl-10 w-64"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                                    <SelectTrigger className="w-64"><SelectValue placeholder="All Warehouses" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Warehouses</SelectItem>
                                        {warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.name}>{w.name} ({w.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => { setEditingItem(null); setFormOpen(true); }} className="bg-gradient-to-r from-emerald-600 to-teal-600">
                                <Plus className="w-5 h-5 mr-2" /> Add Item
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <StockTable
                            items={filteredItems}
                            loading={loading}
                            onEdit={(item) => { setEditingItem(item); setFormOpen(true); }}
                            onDelete={handleDelete}
                        />
                    </CardContent>
                </Card>

                <StockForm
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    item={editingItem}
                    categories={categories}
                    onSuccess={handleSuccess}
                />
            </div>
        </DashboardLayout>
    );
}