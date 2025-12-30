'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';

export default function GeneralLedger() {
    const [entries, setEntries] = useState([]);
    const [filters, setFilters] = useState({ account: '', start_date: '', end_date: '' });

    useEffect(() => {
        fetchLedger();
    }, [filters]);

    const fetchLedger = async () => {
        const params = new URLSearchParams(filters as any);
        const res = await api.get(`/accounting/ledger/?${params}`);
        setEntries(res.data);
    };

    return (
        <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 min-h-screen">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
                General Ledger
            </h1>

            <Card className="shadow-2xl border-0">
                <CardHeader>
                    <div className="flex gap-4">
                        <Input placeholder="Account name..." onChange={(e) => setFilters({...filters, account: e.target.value})} />
                        <Input type="date" onChange={(e) => setFilters({...filters, start_date: e.target.value})} />
                        <Input type="date" onChange={(e) => setFilters({...filters, end_date: e.target.value})} />
                        <Button><Filter /></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        {/* Full ledger table with debit/credit columns */}
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}