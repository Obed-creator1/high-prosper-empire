'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Plus, Search, Filter } from 'lucide-react';

export default function PayablesPage() {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchPayables();
    }, []);

    const fetchPayables = async () => {
        try {
            const res = await api.get('/accounting/payables/');
            setPayables(res.data);
        } catch (err) {
            toast.error("Failed to load payables");
        } finally {
            setLoading(false);
        }
    };

    const markAsPaid = async (id: number) => {
        try {
            await api.post(`/accounting/payables/${id}/mark_paid/`);
            toast.success("Bill marked as paid");
            fetchPayables();
        } catch (err) {
            toast.error("Failed to update");
        }
    };

    const filtered = payables.filter((p: any) =>
        p.supplier.toLowerCase().includes(search.toLowerCase()) ||
        p.amount.toString().includes(search)
    );

    const overdue = filtered.filter((p: any) => p.status === 'Pending' && new Date(p.due_date) < new Date());
    const pending = filtered.filter((p: any) => p.status === 'Pending' && new Date(p.due_date) >= new Date());
    const paid = filtered.filter((p: any) => p.status === 'Paid');

    return (
        <div className="p-8 space-y-8 bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
                        Accounts Payable
                    </h1>
                    <p className="text-gray-600 mt-2">Manage supplier bills and payment schedules</p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-2xl">
                            <Plus className="mr-2" /> New Bill
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Record New Payable</DialogTitle>
                        </DialogHeader>
                        {/* Form will go here */}
                    </DialogContent>
                </Dialog>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-2xl border-0">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <AlertTriangle className="h-12 w-12" />
                        <div>
                            <CardTitle className="text-xl">Overdue Bills</CardTitle>
                            <p className="text-4xl font-bold">{overdue.length}</p>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-2xl border-0">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <Clock className="h-12 w-12" />
                        <div>
                            <CardTitle className="text-xl">Due Soon</CardTitle>
                            <p className="text-4xl font-bold">{pending.length}</p>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl border-0">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <CheckCircle className="h-12 w-12" />
                        <div>
                            <CardTitle className="text-xl">Paid</CardTitle>
                            <p className="text-4xl font-bold">{paid.length}</p>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-2xl border-0 backdrop-blur-xl bg-white/95">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Search className="h-5 w-5 text-gray-500" />
                            <Input
                                placeholder="Search supplier or amount..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-96"
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" /> Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((p: any) => (
                                <TableRow key={p.id} className={`hover:bg-red-50/50 transition-all ${p.status === 'Paid' ? 'opacity-60' : ''}`}>
                                    <TableCell className="font-semibold text-lg">{p.supplier}</TableCell>
                                    <TableCell className="font-bold text-xl text-red-600">
                                        ${p.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={new Date(p.due_date) < new Date() && p.status === 'Pending' ? 'destructive' : 'secondary'}>
                                            {format(new Date(p.due_date), 'MMM dd, yyyy')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={p.status === 'Paid' ? 'default' : 'outline'}>
                                            {p.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {p.status === 'Pending' && (
                                            <Button size="sm" onClick={() => markAsPaid(p.id)} className="bg-emerald-600 hover:bg-emerald-700">
                                                <CheckCircle className="h-4 w-4 mr-1" /> Mark Paid
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}