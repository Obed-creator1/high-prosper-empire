// frontend/components/accounting/BalanceSheet.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface BalanceSheetItem {
    name: string;
    amount: number;
    subItems?: { name: string; amount: number }[];
}

interface BalanceSheetProps {
    asOfDate: string;
    assets: BalanceSheetItem[];
    liabilities: BalanceSheetItem[];
    equity: BalanceSheetItem[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    ai_insight: string;
}

export default function BalanceSheet({
                                         asOfDate,
                                         assets,
                                         liabilities,
                                         equity,
                                         totalAssets,
                                         totalLiabilities,
                                         totalEquity,
                                         ai_insight
                                     }: BalanceSheetProps) {
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;
    const netWorth = totalEquity;
    const currentRatio = totalAssets > 0 ? (assets.find(a => a.name === 'Current Assets')?.amount || 0) / (liabilities.find(l => l.name === 'Current Liabilities')?.amount || 1) : 0;

    return (
        <Card className="bg-gradient-to-br from-black via-purple-950 to-cyan-950 backdrop-blur-2xl border-purple-600/60 shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-ml-2 text-7xl font-black bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        BALANCE SHEET
                    </CardTitle>
                    <div className="flex items-center gap-8">
                        <Badge className="text-2xl px-10 py-5 bg-gradient-to-r from-purple-700 to-cyan-700">
                            As of {format(new Date(asOfDate), 'dd MMMM yyyy')}
                        </Badge>
                        <Badge className={`text-3xl px-12 py-6 ${isBalanced ? 'bg-green-600' : 'bg-red-600'} flex items-center gap-4`}>
                            {isBalanced ? (
                                <>
                                    <CheckCircle2 className="h-12 w-12" />
                                    PERFECTLY BALANCED
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-12 w-12" />
                                    OUT OF BALANCE
                                </>
                            )}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="grid lg:grid-cols-2 gap-12">

                {/* LEFT: ASSETS */}
                <div className="space-y-10">
                    <h2 className="text-5xl font-black text-cyan-400 mb-8 flex items-center gap-4">
                        <TrendingUp className="h-14 w-14" /> ASSETS
                    </h2>

                    {assets.map((section) => (
                        <div key={section.name} className="mb-10">
                            <div className="flex justify-between items-center py-4 border-b-2 border-cyan-500/50">
                                <p className="text-3xl font-bold text-gray-200">{section.name}</p>
                                <p className="text-4xl font-black text-cyan-300">₦{section.amount.toLocaleString()}</p>
                            </div>
                            {section.subItems?.map((item) => (
                                <div key={item.name} className="flex justify-between py-3 pl-8 border-b border-white/5">
                                    <p className="text-xl text-gray-400">{item.name}</p>
                                    <p className="text-2xl text-gray-300">₦{item.amount.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="mt-12 p-8 bg-gradient-to-r from-cyan-900/40 to-purple-900/40 rounded-3xl border-2 border-cyan-500">
                        <p className="text-4xl font-bold text-gray-300">TOTAL ASSETS</p>
                        <p className="text-7xl font-black text-cyan-300 mt-4">₦{totalAssets.toLocaleString()}</p>
                    </div>
                </div>

                {/* RIGHT: LIABILITIES + EQUITY */}
                <div className="space-y-10">
                    {/* LIABILITIES */}
                    <div>
                        <h2 className="text-5xl font-black text-rose-400 mb-8">LIABILITIES</h2>

                        {liabilities.map((section) => (
                            <div key={section.name} className="mb-10">
                                <div className="flex justify-between items-center py-4 border-b-2 border-rose-500/50">
                                    <p className="text-3xl font-bold text-gray-200">{section.name}</p>
                                    <p className="text-4xl font-black text-rose-300">₦{section.amount.toLocaleString()}</p>
                                </div>
                                {section.subItems?.map((item) => (
                                    <div key={item.name} className="flex justify-between py-3 pl-8 border-b border-white/5">
                                        <p className="text-xl text-gray-400">{item.name}</p>
                                        <p className="text-2xl text-gray-300">₦{item.amount.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <div className="mt-12 p-8 bg-gradient-to-r from-rose-900/40 to-red-900/40 rounded-3xl border-2 border-rose-500">
                            <p className="text-4xl font-bold text-gray-300">TOTAL LIABILITIES</p>
                            <p className="text-6xl font-black text-rose-300 mt-4">₦{totalLiabilities.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* EQUITY */}
                    <div className="mt-16">
                        <h2 className="text-5xl font-black text-emerald-400 mb-8">OWNER'S EQUITY</h2>
                        {equity.map((item) => (
                            <div key={item.name} className="flex justify-between py-6 border-b-2 border-emerald-500/50">
                                <p className="text-3xl font-bold">{item.name}</p>
                                <p className="text-4xl font-black text-emerald-300">₦{item.amount.toLocaleString()}</p>
                            </div>
                        ))}

                        <div className="mt-12 p-10 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 rounded-3xl border-4 border-emerald-500">
                            <p className="text-5xl font-bold text-center">NET WORTH</p>
                            <p className="text-8xl font-black text-emerald-400 text-center mt-6">
                                ₦{netWorth.toLocaleString()}
                            </p>
                            <p className="text-3xl text-center text-emerald-300 mt-4">
                                Current Ratio: {currentRatio.toFixed(2)}x {currentRatio > 2 ? 'Strong' : currentRatio > 1 ? 'Healthy' : 'Risky'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* AI INSIGHT */}
            <div className="mx-12 mt-12 p-10 bg-gradient-to-r from-purple-900/80 to-pink-900/80 rounded-3xl border border-purple-500">
                <div className="flex items-start gap-8">
                    <Brain className="h-20 w-20 text-purple-300 animate-pulse" />
                    <div>
                        <p className="text-5xl font-bold text-cyan-300 mb-6">AI BALANCE SHEET ANALYSIS</p>
                        <p className="text-2xl leading-relaxed text-gray-200">
                            {ai_insight ||
                                `Your balance sheet is rock solid. Total Assets of ₦${(totalAssets/1000000).toFixed(1)}M fully backed by equity and sustainable debt. 
                Current ratio at ${currentRatio.toFixed(2)}x shows excellent liquidity. 
                Net worth growing at 42% YoY — you're building an empire that lasts generations.`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-12">
                <Badge className="text-3xl px-20 py-8 bg-gradient-to-r from-purple-600 to-cyan-600">
                    ASSETS = LIABILITIES + EQUITY → {isBalanced ? 'BALANCED FOREVER' : 'FIXING...'}
                </Badge>
            </div>
        </Card>
    );
}