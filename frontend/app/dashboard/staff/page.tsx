// frontend/app/dashboard/hr/staff/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Filter, Download, MoreVertical } from 'lucide-react';
import api from '@/lib/api';

const columns = [
    {
        accessorKey: "user",
        header: "Staff",
        cell: ({ row }: any) => {
            const user = row.original.user;
            return (
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-medium">{user.get_full_name || user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "department",
        header: "Department",
    },
    {
        accessorKey: "salary",
        header: "Salary",
        cell: ({ row }: any) => `CFA ${Number(row.original.salary).toLocaleString()}`,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }: any) => {
            const status = row.original.status;
            return (
                <Badge variant={status === 'Active' ? 'default' : status === 'On Leave' ? 'secondary' : 'destructive'}>
                    {status}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: () => (
            <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
            </Button>
        ),
    },
];

export default function StaffPage() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/hr/staff/').then(res => {
            setStaff(res.data);
            setLoading(false);
        });
    }, []);

    const filteredStaff = staff.filter((s: any) =>
        s.user.username.toLowerCase().includes(search.toLowerCase()) ||
        s.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
                        <p className="text-gray-600 mt-1">Manage employees, contracts, payroll & performance</p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" /> Add New Staff
                    </Button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    placeholder="Search staff..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button variant="outline">
                                <Filter className="mr-2 h-4 w-4" /> Filters
                            </Button>
                            <Button variant="outline">
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                        </div>
                    </div>

                    <DataTable columns={columns} data={filteredStaff} loading={loading} />
                </div>
            </div>
        </div>
    );
}