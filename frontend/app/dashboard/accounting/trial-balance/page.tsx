// frontend/app/dashboard/accounting/trial-balance/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Brain, Mic, MicOff, Volume2, Sparkles, Zap,
    ArrowDownToLine, ArrowUpFromLine, CheckCircle2, AlertCircle,
    Download, FileText, FileSpreadsheet, FileJson
} from 'lucide-react';

// Export Libraries
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface TrialBalanceAccount {
    id: number;
    code: string;
    name: string;
    type: string;
    debit_balance: number;
    credit_balance: number;
}

export default function TrialBalancePro() {
    const [accounts, setAccounts] = useState<TrialBalanceAccount[]>([]);
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // Fetch Trial Balance
    useEffect(() => {
        fetchTrialBalance();
    }, [asOfDate]);

    const fetchTrialBalance = async () => {
        setLoading(true);
        try {
            const res = await api.get('/accounting/trial-balance/', {
                params: { as_of: asOfDate }
            });
            setAccounts(res.data.accounts || []);
        } catch (err) {
            toast.error("Failed to load trial balance");
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    // Voice Recognition Setup
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast.error("Voice not supported in this browser");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            if (result.isFinal) {
                const text = result[0].transcript.trim();
                setTranscript(prev => prev ? prev + " | " + text : text);
                processVoiceCommand(text.toLowerCase());
            }
        };

        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = () => setIsListening(false);
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            toast.success("Voice AI Activated — Say 'Export CSV', 'Excel', 'PDF'", {
                icon: <Volume2 className="text-green-400" />,
                duration: 4000
            });
        }
    };

    const processVoiceCommand = (command: string) => {
        if (command.includes('csv') || command.includes('comma')) {
            exportToCSV();
        } else if (command.includes('excel') || command.includes('spreadsheet')) {
            exportToExcel();
        } else if (command.includes('pdf') || command.includes('print')) {
            exportToPDF();
        } else if (command.includes('as of') || command.includes('on ') || command.includes('for ')) {
            const match = command.match(/(january|february|march|april|may|june|july|august|september|october|november|december|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2})/i);
            if (match) {
                const date = new Date(match[0]);
                if (!isNaN(date.getTime())) {
                    setAsOfDate(date.toISOString().split('T')[0]);
                    toast.success(`Updated to ${format(date, 'MMM dd, yyyy')}`, { icon: <Sparkles /> });
                }
            }
        }
    };

    // EXPORT TO CSV
    const exportToCSV = () => {
        const headers = ['Account Code', 'Account Name', 'Debit (₦)', 'Credit (₦)'];
        const rows = accounts.map(acc => [
            acc.code,
            `"${acc.name.replace(/"/g, '""')}"`,
            acc.debit_balance > 0 ? acc.debit_balance.toLocaleString() : '',
            acc.credit_balance > 0 ? acc.credit_balance.toLocaleString() : ''
        ]);

        const totalDebit = accounts.reduce((s, a) => s + a.debit_balance, 0);
        const totalCredit = accounts.reduce((s, a) => s + a.credit_balance, 0);
        rows.push(['', 'TOTAL', totalDebit.toLocaleString(), totalCredit.toLocaleString()]);

        let csv = headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Trial-Balance-${format(new Date(asOfDate), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        toast.success("CSV Exported", { icon: <FileJson className="text-cyan-400" /> });
    };

    // EXPORT TO EXCEL
    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const data = accounts.map(acc => ({
            'Account Code': acc.code,
            'Account Name': acc.name,
            'Debit (₦)': acc.debit_balance > 0 ? acc.debit_balance : null,
            'Credit (₦)': acc.credit_balance > 0 ? acc.credit_balance : null
        }));

        const totalDebit = accounts.reduce((s, a) => s + a.debit_balance, 0);
        const totalCredit = accounts.reduce((s, a) => s + a.credit_balance, 0);
        data.push({ 'Account Name': 'TOTAL', 'Debit (₦)': totalDebit, 'Credit (₦)': totalCredit });

        const ws = XLSX.utils.json_to_sheet(data, { origin: 'A4' });
        XLSX.utils.sheet_add_aoa(ws, [
            ["HIGH PROSPER NIGERIA LIMITED"],
            ["TRIAL BALANCE"],
            [`As of ${format(new Date(asOfDate), 'MMMM dd, yyyy')}`],
            []
        ], { origin: 'A1' });

        ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
        XLSX.writeFile(wb, `Trial-Balance-${format(new Date(asOfDate), 'yyyy-MM-dd')}.xlsx`);

        toast.success("Excel Exported", { icon: <FileSpreadsheet className="text-green-400" /> });
    };

    // EXPORT TO PDF
    const exportToPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text("HIGH PROSPER NIGERIA LIMITED", 105, 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text("TRIAL BALANCE", 105, 30, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`As of ${format(new Date(asOfDate), 'MMMM dd, yyyy')}`, 105, 38, { align: 'center' });

        const tableData = accounts.map(acc => [
            acc.code,
            acc.name,
            acc.debit_balance > 0 ? `₦${acc.debit_balance.toLocaleString()}` : '',
            acc.credit_balance > 0 ? `₦${acc.credit_balance.toLocaleString()}` : ''
        ]);

        const totalDebit = accounts.reduce((s, a) => s + a.debit_balance, 0);
        const totalCredit = accounts.reduce((s, a) => s + a.credit_balance, 0);
        tableData.push([
            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [88, 28, 135] } },
            { content: `₦${totalDebit.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `₦${totalCredit.toLocaleString()}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        // @ts-ignore
        doc.autoTable({
            head: [['Account Code', 'Account Name', 'Debit (₦)', 'Credit (₦)']],
            body: tableData,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [88, 28, 135], textColor: 255 },
            styles: { fontSize: 10 },
            columnStyles: { 1: { cellWidth: 80 } }
        });

        doc.save(`Trial-Balance-${format(new Date(asOfDate), 'yyyy-MM-dd')}.pdf`);
        toast.success("PDF Generated", { icon: <FileText className="text-blue-400" /> });
    };

    const totalDebit = accounts.reduce((sum, a) => sum + a.debit_balance, 0);
    const totalCredit = accounts.reduce((sum, a) => sum + a.credit_balance, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isPerfectlyBalanced = difference < 0.01;

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 opacity-80" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.4),transparent_50%)]" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.3),transparent_50%)]" />

            <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-8xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Trial Balance
                        </h1>
                        <p className="text-3xl text-gray-300 mt-6 flex items-center gap-6">
                            <Brain className="animate-pulse" /> Voice • PDF • Excel • CSV • Instant
                            {isListening && <Badge className="bg-red-600 animate-pulse text-2xl px-8">LIVE MIC</Badge>}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <Button onClick={exportToCSV} size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-700 text-2xl px-12 py-8">
                            <FileJson className="mr-4 h-10 w-10" /> CSV
                        </Button>
                        <Button onClick={exportToExcel} size="lg" className="bg-gradient-to-r from-green-600 to-emerald-700 text-2xl px-12 py-8">
                            <FileSpreadsheet className="mr-4 h-10 w-10" /> Excel
                        </Button>
                        <Button onClick={exportToPDF} size="lg" className="bg-gradient-to-r from-purple-600 to-pink-700 text-2xl px-12 py-8">
                            <FileText className="mr-4 h-10 w-10" /> PDF
                        </Button>
                        <Button onClick={toggleListening} size="lg" className={`relative text-2xl px-12 py-8 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-purple-600 to-pink-600'}`}>
                            {isListening ? (
                                <>
                                    <Mic className="mr-4 h-10 w-10" />
                                    Listening...
                                    <div className="absolute inset-0 bg-red-600 opacity-30 animate-ping" />
                                </>
                            ) : (
                                <>
                                    <MicOff className="mr-4 h-10 w-10" />
                                    Voice AI
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Transcript */}
                {transcript && (
                    <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-xl border-purple-500/50">
                        <div className="p-8 flex items-center gap-6">
                            <Volume2 className="h-12 w-12 text-green-400 animate-pulse" />
                            <div>
                                <p className="text-lg text-gray-400">You said:</p>
                                <p className="text-3xl font-mono text-cyan-300">{transcript}</p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Date Selector */}
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-4xl font-bold">Trial Balance as of</h2>
                                <p className="text-2xl text-gray-400 mt-2">{format(new Date(asOfDate), 'EEEE, MMMM dd, yyyy')}</p>
                            </div>
                            <Input
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                className="w-64 h-20 text-2xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/50"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead className="text-white/80 text-xl">Account Code</TableHead>
                                    <TableHead className="text-white/80 text-xl">Account Name</TableHead>
                                    <TableHead className="text-white/80 text-xl text-right">Debit (₦)</TableHead>
                                    <TableHead className="text-white/80 text-xl text-right">Credit (₦)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((acc) => (
                                    <TableRow key={acc.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-mono text-purple-400 text-lg">{acc.code}</TableCell>
                                        <TableCell className="font-semibold text-xl">{acc.name}</TableCell>
                                        <TableCell className="text-right font-mono text-2xl text-green-400">
                                            {acc.debit_balance > 0 ? `₦${acc.debit_balance.toLocaleString()}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-2xl text-rose-400">
                                            {acc.credit_balance > 0 ? `₦${acc.credit_balance.toLocaleString()}` : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Totals */}
                <div className="grid grid-cols-3 gap-8">
                    <Card className="bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Total Debit</CardTitle>
                                <p className="text-6xl font-black mt-4">₦{totalDebit.toLocaleString()}</p>
                            </div>
                            <ArrowDownToLine className="h-20 w-20 opacity-80" />
                        </CardHeader>
                    </Card>

                    <Card className="bg-gradient-to-br from-rose-600 to-pink-700 text-white shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Total Credit</CardTitle>
                                <p className="text-6xl font-black mt-4">₦{totalCredit.toLocaleString()}</p>
                            </div>
                            <ArrowUpFromLine className="h-20 w-20 opacity-80" />
                        </CardHeader>
                    </Card>

                    <Card className={`shadow-2xl ${isPerfectlyBalanced ? 'bg-gradient-to-br from-cyan-600 to-purple-700' : 'bg-gradient-to-br from-red-600 to-rose-700'}`}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">Balance Status</CardTitle>
                                <p className="text-5xl font-black mt-4">
                                    {isPerfectlyBalanced ? "PERFECT" : `OUT BY ₦${difference.toFixed(2)}`}
                                </p>
                            </div>
                            {isPerfectlyBalanced ? (
                                <CheckCircle2 className="h-20 w-20 text-green-400" />
                            ) : (
                                <AlertCircle className="h-20 w-20 text-yellow-400" />
                            )}
                        </CardHeader>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center py-12">
                    <Badge className="text-3xl px-16 py-8 bg-gradient-to-r from-purple-600 to-pink-600">
                        <Brain className="mr-4 h-12 w-12 animate-pulse" />
                        HIGH PROSPER 2025 — YOUR BOOKS ARE CONSCIOUS
                    </Badge>
                </div>
            </div>
        </div>
    );
}