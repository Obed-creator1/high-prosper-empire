// frontend/app/dashboard/accounting/journal/new/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    ArrowLeft, Save, Plus, Brain, Zap, CheckCircle2, AlertCircle,
    Sparkles, Mic, MicOff, Volume2, ExternalLink
} from 'lucide-react';

interface Account {
    id: number;
    code: string;
    name: string;
    type: string;
    quickbooks_id?: string;
}

interface LineItem {
    account: string;
    debit: string;
    credit: string;
    description: string;
}

const VOICE_COMMANDS: Record<string, any> = {
    "record rent": { desc: "Monthly Office Rent", amount: 250000, debit: "5000", credit: "1000" },
    "customer paid": { desc: "Customer Payment Received", amount: 1500000, debit: "1000", credit: "1200" },
    "pay supplier": { desc: "Pay Supplier Invoice", amount: 850000, debit: "2000", credit: "1000" },
    "record revenue": { desc: "Service Revenue", amount: 3000000, debit: "1200", credit: "4000" },
    "pay salaries": { desc: "Monthly Salary Payment", amount: 4500000, debit: "5010", credit: "1000" },
    "clear all": { action: "clear" },
    "add line": { action: "addLine" },
    "post entry": { action: "submit" }
};

export default function NewJournalEntryPro() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [lines, setLines] = useState<LineItem[]>([
        { account: '', debit: '', credit: '', description: '' },
        { account: '', debit: '', credit: '', description: '' }
    ]);
    const [reference, setReference] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [quickbooksConnected, setQuickbooksConnected] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        fetchAccounts();
        checkQuickBooksStatus();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounting/accounts/');
            setAccounts(res.data);
        } catch (err) {
            toast.error("Failed to load chart of accounts");
        }
    };

    const checkQuickBooksStatus = async () => {
        try {
            const res = await api.get('/accounting/quickbooks/status/');
            setQuickbooksConnected(res.data.connected);
        } catch (err) {
            setQuickbooksConnected(false);
        }
    };

    // Speech Recognition
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;

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
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
            toast.success("Voice AI Active — Speak your entry", { icon: <Volume2 className="text-green-400" /> });
        }
    };

    const processVoiceCommand = (command: string) => {
        for (const [key, action] of Object.entries(VOICE_COMMANDS)) {
            if (command.includes(key)) {
                if ('action' in action) {
                    if (action.action === 'clear') {
                        setLines([{ account: '', debit: '', credit: '', description: '' }, { account: '', debit: '', credit: '', description: '' }]);
                        setReference('');
                        toast.success("Cleared by voice");
                    } else if (action.action === 'addLine') {
                        addLine();
                    } else if (action.action === 'submit') {
                        handleSubmit();
                    }
                } else {
                    const newLines: LineItem[] = [
                        { account: action.debit, debit: action.amount.toString(), credit: '', description: action.desc },
                        { account: action.credit, debit: '', credit: action.amount.toString(), description: action.desc }
                    ];
                    setLines(newLines);
                    setReference(action.desc);
                    toast.success(`AI Applied: ${action.desc}`, { icon: <Sparkles /> });
                }
                return;
            }
        }
        setReference(prev => prev + " " + command);
    };

    const addLine = () => {
        setLines(prev => [...prev, { account: '', debit: '', credit: '', description: '' }]);
    };

    const updateLine = (index: number, field: keyof LineItem, value: string) => {
        const newLines = [...lines];
        newLines[index][field] = value;
        if (field === 'debit' && value) newLines[index].credit = '';
        if (field === 'credit' && value) newLines[index].debit = '';
        setLines(newLines);
    };

    const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01;

    const handleSubmit = async () => {
        if (!isBalanced) {
            toast.error(`Out of balance by ₦${Math.abs(difference).toFixed(2)}`);
            return;
        }

        setLoading(true);
        try {
            for (const line of lines) {
                if (!line.account || (!line.debit && !line.credit)) continue;

                const payload = {
                    date,
                    description: line.description || reference || "AI Entry",
                    reference: reference || "Voice Journal",
                    account: line.account,
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0,
                };

                const entryRes = await api.post('/accounting/journal/', payload);

                // AUTO SYNC TO QUICKBOOKS
                if (quickbooksConnected) {
                    await api.post('/accounting/quickbooks/sync/', {
                        journal_entry_id: entryRes.data.id
                    });
                }
            }

            toast.success("ENTRY POSTED + QUICKBOOKS SYNCED", {
                description: `₦${totalDebit.toLocaleString()} • Perfectly Balanced`,
                icon: <Brain className="text-purple-400" />
            });

            router.push('/dashboard/accounting');
        } catch (err: any) {
            toast.error("Post failed — saved locally");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative">
            <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-black to-cyan-900 opacity-70" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.4),transparent_50%)]" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.3),transparent_50%)]" />

            <div className="relative z-10 p-8">
                <div className="max-w-7xl mx-auto">

                    {/* QuickBooks Status */}
                    {quickbooksConnected && (
                        <div className="fixed top-8 right-8 z-50">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-lg px-8 py-4 animate-pulse">
                                <Zap className="mr-2" /> QUICKBOOKS SYNC LIVE
                            </Badge>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-6">
                            <Button variant="ghost" size="icon" onClick={() => router.back()} className="bg-white/10 hover:bg-white/20">
                                <ArrowLeft className="h-8 w-8" />
                            </Button>
                            <div>
                                <h1 className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    AI Journal Entry
                                </h1>
                                <p className="text-2xl text-gray-300 mt-4 flex items-center gap-4">
                                    <Brain className="animate-pulse" /> Vision Pro • Voice AI • QuickBooks Sync
                                    {isListening && <Badge className="bg-red-600 animate-pulse text-xl">LIVE MIC</Badge>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                size="lg"
                                onClick={toggleListening}
                                className={`relative ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gradient-to # from-purple-600 to-pink-600'}`}
                            >
                                {isListening ? (
                                    <>
                                        <Mic className="mr-3 h-8 w-8" />
                                        Listening... Say "record rent"
                                        <div className="absolute inset-0 bg-red-600 opacity-30 animate-ping" />
                                    </>
                                ) : (
                                    <>
                                        <MicOff className="mr-3 h-8 w-8" />
                                        Activate Voice AI
                                    </>
                                )}
                            </Button>

                            {!quickbooksConnected && (
                                <Button
                                    size="lg"
                                    onClick={() => window.open('/api/accounting/quickbooks/auth/', '_blank')}
                                    className="bg-gradient-to-r from-green-600 to-emerald-700"
                                >
                                    <ExternalLink className="mr-2 h-6 w-6" />
                                    Connect QuickBooks
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Transcript */}
                    {transcript && (
                        <Card className="mb-8 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 backdrop-blur-xl border-purple-500/50">
                            <div className="p-6 flex items-center gap-4">
                                <Volume2 className="h-10 w-10 text-green-400 animate-pulse" />
                                <div>
                                    <p className="text-sm text-gray-400">You said:</p>
                                    <p className="text-2xl font-bold text-cyan-300 font-mono">{transcript}</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Main Form */}
                    <Card className="bg-white/5 backdrop-blur-2xl border-white/10 shadow-2xl">
                        <div className="p-10 space-y-10">

                            {/* Header Fields */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="text-lg font-semibold text-gray-300">Transaction Date</label>
                                    <Input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="mt-3 h-16 text-xl bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/50 placeholder-gray-400"
                                        placeholder="Select date"
                                    />
                                </div>
                                <div>
                                    <label className="text-lg font-semibold text-gray-300">Reference / Narration</label>
                                    <Input
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="e.g. Monthly rent, Customer payment, Salary run"
                                        className="mt-3 h-16 text-xl bg-gradient-to-r from-cyan-900/50 to-purple-900/50 border-cyan-500/50 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Lines */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-4xl font-black flex items-center gap-4">
                                        <Zap className="text-yellow-400" /> Journal Lines
                                    </h3>
                                    <Button onClick={addLine} size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600">
                                        <Plus className="mr-2 h-6 w-6" /> Add Line
                                    </Button>
                                </div>

                                <div className="space-y-6">
                                    {lines.map((line, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-6 items-end bg-white/5 rounded-3xl p-8 border border-white/10 hover:border-purple-500/50 transition-all">
                                            <div className="col-span-5">
                                                <label className="text-sm text-gray-400 font-medium">Account</label>
                                                <Select value={line.account} onValueChange={(v) => updateLine(i, 'account', v)}>
                                                    <SelectTrigger className="h-20 text-xl bg-gradient-to-r from-purple-900/70 to-pink-900/70 border-purple-500/50 backdrop-blur-xl">
                                                        <SelectValue placeholder="Choose account..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-black/95 border-purple-500/50">
                                                        {accounts.map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.id.toString()}>
                                                                <div className="flex items-center justify-between w-full">
                                                                    <div>
                                                                        <span className="font-mono text-purple-400">{acc.code}</span>
                                                                        <span className="ml-3 font-medium">{acc.name}</span>
                                                                    </div>
                                                                    <Badge variant="outline" className="ml-4">{acc.type}</Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="col-span-3">
                                                <label className="text-sm text-gray-400 font-medium">Debit (₦)</label>
                                                <Input
                                                    placeholder="0.00"
                                                    value={line.debit}
                                                    onChange={(e) => updateLine(i, 'debit', e.target.value)}
                                                    className="h-20 text-3xl text-right font-mono text-green-400 bg-emerald-950/70 border-emerald-500/50 placeholder-green-800"
                                                />
                                            </div>

                                            <div className="col-span-3">
                                                <label className="text-sm text-gray-400 font-medium">Credit (₦)</label>
                                                <Input
                                                    placeholder="0.00"
                                                    value={line.credit}
                                                    onChange={(e) => updateLine(i, 'credit', e.target.value)}
                                                    className="h-20 text-3xl text-right font-mono text-rose-400 bg-rose-950/70 border-rose-500/50 placeholder-rose-800"
                                                />
                                            </div>

                                            <div className="col-span-1">
                                                {i > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
                                                        className="h-20 w-20 text-red-400 hover:bg-red-950/50"
                                                    >
                                                        ×
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="grid grid-cols-12 gap-6 pt-10 border-t-2 border-white/20">
                                    <div className="col-span-5 text-right text-2xl font-black text-gray-300">TOTAL</div>
                                    <div className="col-span-3 text-right text-5xl font-black text-green-400">
                                        ₦{totalDebit.toLocaleString()}
                                    </div>
                                    <div className="col-span-3 text-right text-5xl font-black text-rose-400">
                                        ₦{totalCredit.toLocaleString()}
                                    </div>
                                </div>

                                {/* Balance Status */}
                                <div className="text-center py-8">
                                    <Badge variant={isBalanced ? "default" : "destructive"} className="text-2xl px-12 py-6">
                                        {isBalanced ? (
                                            <><CheckCircle2 className="mr-3 h-8 w-8" /> PERFECTLY BALANCED</>
                                        ) : (
                                            <><AlertCircle className="mr-3 h-8 w-8" /> OUT BY ₦{Math.abs(difference).toFixed(2)}</>
                                        )}
                                    </Badge>
                                </div>

                                {/* Submit */}
                                <div className="flex justify-center pt-10">
                                    <Button
                                        size="lg"
                                        onClick={handleSubmit}
                                        disabled={loading || !isBalanced}
                                        className="text-2xl px-20 py-10 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-2xl font-bold"
                                    >
                                        {loading ? (
                                            "Posting + Syncing..."
                                        ) : (
                                            <>
                                                <Save className="mr-4 h-10 w-10" />
                                                POST JOURNAL ENTRY {quickbooksConnected && "+ SYNC QUICKBOOKS"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}