// frontend/components/accounting/JournalTable.tsx
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

interface JournalEntry {
    id: number;
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    account_name: string;
}

interface JournalTableProps {
    entries: JournalEntry[];
}

export default function JournalTable({ entries }: JournalTableProps) {
    if (!entries.length) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p className="text-2xl">No recent journal entries</p>
                <Link href="/dashboard/accounting/journal/new">
                    <Button className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600">Post First Entry</Button>
                </Link>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="border-white/10">
                    <TableHead className="text-white/80">Date</TableHead>
                    <TableHead className="text-white/80">Reference</TableHead>
                    <TableHead className="text-white/80">Account</TableHead>
                    <TableHead className="text-white/80 text-right">Debit</TableHead>
                    <TableHead className="text-white/80 text-right">Credit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.slice(0, 8).map((entry) => (
                    <TableRow key={entry.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-cyan-400">{format(new Date(entry.date), 'MMM dd')}</TableCell>
                        <TableCell className="font-medium">{entry.reference || '—'}</TableCell>
                        <TableCell>{entry.account_name}</TableCell>
                        <TableCell className="text-right text-green-400 font-mono">
                            {entry.debit > 0 ? `₦${entry.debit.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-rose-400 font-mono">
                            {entry.credit > 0 ? `₦${entry.credit.toLocaleString()}` : '—'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}