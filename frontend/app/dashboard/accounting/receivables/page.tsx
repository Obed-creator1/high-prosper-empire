// app/dashboard/accounting/receivables/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    AlertCircle, CheckCircle, Clock, DollarSign, Search, Plus,
    Brain, Mic, MicOff, Volume2, Sparkles, Zap, Loader2
} from 'lucide-react';

interface Customer {
    id: number;
    name: string;
}

interface Receivable {
    id: number;
    invoice_number: string;
    customer: { id: number; name: string };
    amount: number;
    paid_amount: number;
    outstanding: number;
    due_date: string;
    status: 'Pending' | 'Partially Paid' | 'Paid';
    date: string;
}

export default function ReceivablesVoiceAI() {
    const [receivables, setReceivables] = useState<Receivable[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [voiceMode, setVoiceMode] = useState<'idle' | 'creating' | 'paying'>('idle');

    // Form state
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const recognitionRef = useRef<any>(null);

    // Load data
    useEffect(() => {
        fetchReceivables();
        fetchCustomers();
    }, []);

    const fetchReceivables = async () => {
        try {
            const res = await api.get('/accounting/receivables/');
            setReceivables(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error("Failed to load receivables");
            setReceivables([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            setCustomersLoading(true);
            const res = await api.get('/customers/customers/');
            const data = res.data;

            let customerList: Customer[] = [];

            if (Array.isArray(data)) {
                customerList = data;
            } else if (data?.results && Array.isArray(data.results)) {
                customerList = data.results;
            } else if (data && typeof data === 'object') {
                customerList = Object.values(data).filter((c: any) => c && c.id && c.name);
            }

            setCustomers(customerList);
        } catch (err) {
            console.error("Failed to load customers:", err);
            toast.error("Customers not available");
            setCustomers([]);
        } finally {
            setCustomersLoading(false);
        }
    };

    // Speech Recognition Setup
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast.error("Voice AI not supported in this browser");
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
                processVoiceCommand(text);
            }
        };

        recognitionRef.current.onend = () => setIsListening(false);
        recognitionRef.current.onerror = (e: any) => {
            console.error("Speech error:", e);
            setIsListening(false);
        };
    }, [customers]);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            toast.success("Voice AI Activated — Speak your command", {
                icon: <Volume2 className="text-green-400" />,
                duration: 3000
            });
        }
    };

    const processVoiceCommand = (command: string) => {
        const lower = command.toLowerCase();

        if (/create.*invoice|new invoice|make invoice|invoice for/i.test(lower)) {
            setVoiceMode('creating');
            setOpen(true);
            toast.success("Creating invoice — say amount, customer, and due date", { icon: <Sparkles /> });
            return;
        }

        const amountMatch = lower.match(/(\d[\d,]*\d)\s*(naira|million|billion|thousand)?/i);
        if (amountMatch && voiceMode === 'creating') {
            let value = parseInt(amountMatch[1].replace(/,/g, ''));
            if (lower.includes('million')) value *= 1_000_000;
            if (lower.includes('billion')) value *= 1_000_000_000;
            setAmount(value.toString());
            toast.success(`Amount: ₦${value.toLocaleString()}`, { icon: <DollarSign /> });
            return;
        }

        if ((lower.includes('to ') || lower.includes('for ')) && voiceMode === 'creating') {
            const match = lower.match(/(?:to|for)\s+([a-zA-Z\s]+?)(?:due|$)/i);
            if (match) {
                const name = match[1].trim();
                const customer = customers.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
                if (customer) {
                    setCustomerId(customer.id.toString());
                    toast.success(`Customer: ${customer.name}`, { icon: <CheckCircle /> });
                } else {
                    toast.error(`Customer "${name}" not found`);
                }
            }
            return;
        }

        const dueMatch = lower.match(/due\s+(.+)/i);
        if (dueMatch && voiceMode === 'creating') {
            const dateStr = dueMatch[1];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const formatted = date.toISOString().split('T')[0];
                setDueDate(formatted);
                toast.success(`Due: ${format(date, 'MMM dd, yyyy')}`);
            } else {
                toast.error("Could not understand due date");
            }
            return;
        }

        if (lower.includes('paid') || lower.includes('payment received')) {
            const nameMatch = lower.match(/(?:from|for)\s+([a-zA-Z\s]+)/i);
            const name = nameMatch ? nameMatch[1].trim() : '';
            const rec = receivables.find(r =>
                r.customer.name.toLowerCase().includes(name.toLowerCase()) &&
                r.status !== 'Paid'
            );
            if (rec) {
                markAsPaid(rec.id);
            } else {
                toast.error("No unpaid invoice found");
            }
            return;
        }

        if (lower.includes('chase overdue') || lower.includes('remind overdue')) {
            const overdue = receivables.filter(r => r.status !== 'Paid' && new Date(r.due_date) < new Date());
            toast.success(overdue.length > 0 ? `Chasing ${overdue.length} overdue invoices` : "All paid!", {
                description: overdue.length > 0 ? "Reminders sent" : "Empire is clean",
            });
            return;
        }

        if (lower.includes('clear')) {
            setTranscript('');
            toast.success("Voice log cleared");
        }
    };

    const markAsPaid = async (id: number) => {
        try {
            await api.post(`/accounting/receivables/${id}/mark_paid/`);
            toast.success("Payment Recorded", { icon: <Brain className="text-green-400" /> });
            fetchReceivables();
        } catch (err) {
            toast.error("Payment failed");
        }
    };

    const createInvoice = async () => {
        if (!customerId || !amount || !dueDate) {
            toast.error("Missing required fields");
            return;
        }

        setSaving(true);
        try {
            await api.post('/accounting/receivables/', {
                customer: parseInt(customerId),
                amount: parseFloat(amount),
                due_date: dueDate,
                description
            });

            toast.success("INVOICE CREATED BY VOICE", {
                description: `₦${parseFloat(amount).toLocaleString()} • Synced`,
                icon: <Sparkles className="text-yellow-400" />
            });

            setOpen(false);
            setVoiceMode('idle');
            setCustomerId(''); setAmount(''); setDueDate(''); setDescription('');
            fetchReceivables();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create invoice");
        } finally {
            setSaving(false);
        }
    };

    const totalOutstanding = receivables.reduce((sum, r) => sum + r.outstanding, 0);
    const overdue = receivables.filter(r => r.status !== 'Paid' && new Date(r.due_date) < new Date());
    const filtered = receivables.filter(r =>
        r.customer.name.toLowerCase().includes(search.toLowerCase()) ||
        r.invoice_number.includes(search) ||
        r.amount.toString().includes(search)
    );

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 opacity-80" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.4),transparent_50%)]" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.3),transparent_50%)]" />

            <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-7xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                            Voice AI Receivables
                        </h1>
                        <p className="text-2xl text-gray-300 mt-4 flex items-center gap-4">
                            <Brain className="animate-pulse" /> Speak → Invoice → Collect
                            {isListening && <Badge className="bg-red-600 animate-pulse text-xl px-6">LIVE MIC</Badge>}
                        </p>
                    </div>

                    <Button
                        size="lg"
                        onClick={toggleListening}
                        className={`relative overflow-hidden text-xl px-12 py-8 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-emerald-500 to-cyan-600'}`}
                    >
                        {isListening ? (
                            <>
                                <Mic className="mr-3 h-8 w-8" />
                                Listening... Say "Create invoice..."
                                <div className="absolute inset-0 bg-red-600 opacity-30 animate-ping" />
                            </>
                        ) : (
                            <>
                                <MicOff className="mr-3 h-8 w-8" />
                                Activate Voice AI
                            </>
                        )}
                    </Button>
                </div>

                {transcript && (
                    <Card className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 backdrop-blur-xl border-purple-500/50">
                        <div className="p-6 flex items-center gap-4">
                            <Volume2 className="h-10 w-10 text-green-400 animate-pulse" />
                            <div className="flex-1">
                                <p className="text-sm text-gray-400">You said:</p>
                                <p className="text-xl font-mono text-cyan-300 break-all">{transcript}</p>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-4 gap-6">
                    <Card className="bg-gradient-to-br from-red-600 to-rose-700 text-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg opacity-90">Overdue</CardTitle>
                                <p className="text-4xl font-black">{overdue.length}</p>
                            </div>
                            <AlertCircle className="h-12 w-12 opacity-70" />
                        </CardHeader>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg opacity-90">Pending</CardTitle>
                                <p className="text-4xl font-black">{receivables.filter(r => r.status !== 'Paid').length}</p>
                            </div>
                            <Clock className="h-12 w-12 opacity-70" />
                        </CardHeader>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg opacity-90">Outstanding</CardTitle>
                                <p className="text-4xl font-black">₦{totalOutstanding.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-12 w-12 opacity-70" />
                        </CardHeader>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg opacity-90">AI Status</CardTitle>
                                <p className="text-2xl font-bold">100% Live</p>
                            </div>
                            <Brain className="h-12 w-12 opacity-70 animate-pulse" />
                        </CardHeader>
                    </Card>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                        <Input
                            placeholder="Search customer, invoice..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="!pl-12 h-14 text-lg bg-white/10 border-white/20"
                        />
                    </div>

                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-10 py-8 text-xl">
                                <Plus className="mr-3 h-8 w-8" /> New Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gray-900/95 backdrop-blur-2xl border-emerald-500/50 text-white max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                    Create Invoice (Voice Active)
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <Label className="text-lg">Customer</Label>
                                        <Select value={customerId} onValueChange={setCustomerId}>
                                            <SelectTrigger className="h-14 text-lg bg-white/10 border-white/20">
                                                <SelectValue placeholder={
                                                    customersLoading ? "Loading..." :
                                                        customers.length === 0 ? "No customers" :
                                                            "Select customer"
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {customersLoading ? (
                                                    <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                                                ) : customers.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-400">No customers</div>
                                                ) : (
                                                    customers.map(c => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-lg">Amount (₦)</Label>
                                        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000000" className="h-14 text-2xl font-mono bg-white/10 border-white/20" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-lg">Due Date</Label>
                                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-14 text-lg bg-white/10 border-white/20" />
                                </div>
                                <div>
                                    <Label className="text-lg">Description</Label>
                                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Final Phase" className="min-h-32 bg-white/10 border-white/20" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setOpen(false); setVoiceMode('idle'); }}>Cancel</Button>
                                <Button onClick={createInvoice} disabled={saving || !customerId || !amount || !dueDate} className="bg-gradient-to-r from-emerald-500 to-cyan-600 px-12 text-lg">
                                    {saving ? "Creating..." : "Create & Sync"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead className="text-white/80">Invoice</TableHead>
                                    <TableHead className="text-white/80">Customer</TableHead>
                                    <TableHead className="text-white/80 text-right">Amount</TableHead>
                                    <TableHead className="text-white/80 text-right">Outstanding</TableHead>
                                    <TableHead className="text-white/80">Due Date</TableHead>
                                    <TableHead className="text-white/80">Status</TableHead>
                                    <TableHead className="text-white/80">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                                            {loading ? "Loading receivables..." : "No invoices found"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((r) => (
                                        <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                                            <TableCell className="font-mono font-bold text-cyan-400">#{r.invoice_number}</TableCell>
                                            <TableCell className="font-semibold">{r.customer.name}</TableCell>
                                            <TableCell className="text-right font-mono">₦{r.amount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-bold text-yellow-400">₦{r.outstanding.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge variant={new Date(r.due_date) < new Date() && r.status !== 'Paid' ? 'destructive' : 'secondary'}>
                                                    {format(new Date(r.due_date), 'MMM dd, yyyy')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={r.status === 'Paid' ? 'default' : 'outline'}>{r.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {r.status !== 'Paid' && (
                                                    <Button size="sm" onClick={() => markAsPaid(r.id)} className="bg-emerald-600 hover:bg-emerald-700">
                                                        <CheckCircle className="h-4 w-4 mr-1" /> Record Payment
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}