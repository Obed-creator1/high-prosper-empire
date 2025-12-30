// components/AccountingTable.tsx
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2, Trash2, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';

interface AccountingRow {
    id: number;
    date: string;
    description: string;
    amount: number;
    type?: 'debit' | 'credit' | 'revenue' | 'expense';
    status?: 'Pending' | 'Paid' | 'Overdue';
    customer?: string;
    supplier?: string;
    dueDate?: string;
}

interface AccountingTableProps {
    data: AccountingRow[];
    onEdit?: (id: number) => void;
    onDelete?: (id: number) => void;
    onMarkPaid?: (id: number) => void;
    showActions?: boolean;
    currency?: string;
}

export default function AccountingTable({
                                            data,
                                            onEdit,
                                            onDelete,
                                            onMarkPaid,
                                            showActions = true,
                                            currency = 'USD',
                                        }: AccountingTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusBadge = (status: string, dueDate?: string) => {
        const today = new Date();
        const due = dueDate ? new Date(dueDate) : null;
        const isOverdue = due && due < today && status === 'Pending';

        if (isOverdue) {
            return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
        }

        switch (status) {
            case 'Paid':
                return <Badge className="bg-emerald-600"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
            case 'Pending':
                return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getAmountColor = (type?: string, amount?: number) => {
        if (type === 'credit' || type === 'revenue') return 'text-emerald-600';
        if (type === 'debit' || type === 'expense') return 'text-red-600';
        return amount && amount > 0 ? 'text-emerald-600' : 'text-red-600';
    };

    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow-xl overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 hover:bg-slate-100">
                        <TableHead className="font-bold">Date</TableHead>
                        <TableHead className="font-bold">Description</TableHead>
                        <TableHead className="font-bold">Customer / Supplier</TableHead>
                        <TableHead className="font-bold text-right">Amount</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        {showActions && <TableHead className="font-bold text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={showActions ? 6 : 5} className="h-24 text-center text-muted-foreground">
                                No records found
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row) => (
                            <TableRow
                                key={row.id}
                                className="hover:bg-slate-50/70 transition-all duration-200 border-b"
                            >
                                <TableCell className="font-medium">
                                    {format(new Date(row.date), 'MMM dd, yyyy')}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                    <div className="font-medium">{row.description}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-muted-foreground">
                                        {row.customer || row.supplier || '—'}
                                    </div>
                                </TableCell>
                                <TableCell className={`text-right font-bold text-lg ${getAmountColor(row.type, row.amount)}`}>
                                    <div className="flex items-center justify-end gap-1">
                                        <DollarSign className="h-5 w-5 opacity-70" />
                                        {formatCurrency(row.amount)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {row.status && getStatusBadge(row.status, row.dueDate)}
                                </TableCell>
                                {showActions && (
                                    <TableCell className="text-right space-x-2">
                                        {row.status === 'Pending' && onMarkPaid && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                onClick={() => onMarkPaid(row.id)}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onEdit && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEdit(row.id)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => onDelete(row.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}