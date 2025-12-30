// frontend/components/accounting/ReceivableTable.tsx
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Receivable {
    id: number;
    invoice_number: string;
    customer: { name: string };
    amount: number;
    outstanding: number;
    due_date: string;
    status: string;
}

interface ReceivableTableProps {
    receivables: Receivable[];
}

export default function ReceivableTable({ receivables }: ReceivableTableProps) {
    if (!receivables.length) {
        return <p className="text-center text-gray-400 py-12 text-xl">All receivables collected — Perfect!</p>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="border-white/10">
                    <TableHead className="text-white/80">Invoice</TableHead>
                    <TableHead className="text-white/80">Customer</TableHead>
                    <TableHead className="text-white/80 text-right">Amount</TableHead>
                    <TableHead className="text-white/80 text-right">Outstanding</TableHead>
                    <TableHead className="text-white/80">Due</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {receivables.slice(0, 6).map((r) => {
                    const isOverdue = new Date(r.due_date) < new Date() && r.status !== 'Paid';
                    return (
                        <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-mono text-cyan-400">#{r.invoice_number}</TableCell>
                            <TableCell className="font-medium">{r.customer.name}</TableCell>
                            <TableCell className="text-right font-mono">₦{r.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-bold text-yellow-400">
                                ₦{r.outstanding.toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                                    {format(new Date(r.due_date), 'MMM dd')}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={r.status === 'Paid' ? 'default' : 'outline'}>
                                    {r.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}