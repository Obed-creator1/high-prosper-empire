// frontend/components/accounting/PayableTable.tsx
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Payable {
    id: number;
    invoice_number: string;
    supplier: { name: string };
    amount: number;
    outstanding: number;
    due_date: string;
    status: string;
}

interface PayableTableProps {
    payables: Payable[];
}

export default function PayableTable({ payables }: PayableTableProps) {
    if (!payables || payables.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-2xl text-gray-400 mb-6">All bills paid — Financial discipline at 100%</p>
                <Badge className="text-xl px-8 py-4 bg-green-600">ZERO LIABILITIES</Badge>
            </div>
        );
    }

    const totalOutstanding = payables.reduce((sum, p) => sum + p.outstanding, 0);

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <p className="text-3xl font-bold text-rose-400">
                        ₦{totalOutstanding.toLocaleString()} Outstanding
                    </p>
                    <p className="text-gray-400">Across {payables.length} vendor{payables.length > 1 ? 's' : ''}</p>
                </div>
                <Link href="/dashboard/accounting/payables">
                    <Button variant="outline" className="border-rose-500 text-rose-400 hover:bg-rose-950">
                        Pay Now <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Invoice</TableHead>
                        <TableHead className="text-white/80">Supplier</TableHead>
                        <TableHead className="text-white/80 text-right">Amount</TableHead>
                        <TableHead className="text-white/80 text-right">Due</TableHead>
                        <TableHead className="text-white/80 text-right">Outstanding</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payables.slice(0, 6).map((p) => {
                        const isOverdue = new Date(p.due_date) < new Date() && p.status !== 'Paid';
                        const daysUntilDue = Math.ceil((new Date(p.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <TableRow key={p.id} className="border-white/10 hover:bg-white/5 transition">
                                <TableCell className="font-mono text-cyan-400">#{p.invoice_number}</TableCell>
                                <TableCell className="font-medium text-lg">{p.supplier.name}</TableCell>
                                <TableCell className="text-right font-mono text-gray-300">
                                    ₦{p.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge
                                        variant={isOverdue ? 'destructive' : daysUntilDue <= 7 ? 'secondary' : 'outline'}
                                        className={isOverdue ? 'bg-red-600' : daysUntilDue <= 7 ? 'bg-yellow-600' : ''}
                                    >
                                        {isOverdue
                                            ? `Overdue ${Math.abs(daysUntilDue)}d`
                                            : daysUntilDue <= 0
                                                ? 'Due Today'
                                                : `In ${daysUntilDue}d`}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-rose-400 text-xl">
                                    ₦{p.outstanding.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={p.status === 'Paid' ? 'default' : p.status === 'Partial' ? 'secondary' : 'outline'}
                                        className={p.status === 'Paid' ? 'bg-green-600' : p.status === 'Partial' ? 'bg-yellow-600' : 'border-rose-500 text-rose-400'}
                                    >
                                        {p.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}