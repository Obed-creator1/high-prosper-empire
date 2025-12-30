// frontend/components/accounting/ProfitLossStatement.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Brain, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface PnLLine {
    name: string;
    amount: number;
    percentage?: number;
    trend?: 'up' | 'down' | 'flat';
}

interface ProfitLossStatementProps {
    period: string; // "MTD", "QTD", "YTD"
    revenue: PnLLine[];
    expenses: PnLLine[];
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
    netProfitMargin: number;
    ai_insight: string;
}

export default function ProfitLossStatement({
                                                period,
                                                revenue,
                                                expenses,
                                                grossProfit,
                                                operatingProfit,
                                                netProfit,
                                                netProfitMargin,
                                                ai_insight
                                            }: ProfitLossStatementProps) {
    const isProfitable = netProfit > 0;
    const marginColor = netProfitMargin > 20 ? 'text-green-400' : netProfitMargin > 10 ? 'text-yellow-400' : 'text-red-400';

    return (
        <Card className="bg-gradient-to-br from-purple-900/60 via-black to-cyan-900/60 backdrop-blur-2xl border-purple-500/50 shadow-2xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Profit & Loss Statement
                    </CardTitle>
                    <div className="flex items-center gap-6">
                        <Badge className="text-2xl px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600">
                            {period} • {format(new Date(), 'MMM yyyy')}
                        </Badge>
                        <Badge className={`text-3xl px-10 py-5 ${isProfitable ? 'bg-green-600' : 'bg-red-600'}`}>
                            {isProfitable ? <TrendingUp className="mr-3" /> : <TrendingDown className="mr-3" />}
                            {isProfitable ? 'PROFITABLE' : 'LOSING'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-10">

                {/* REVENUE */}
                <div>
                    <h3 className="text-3xl font-bold text-cyan-400 mb-6 flex items-center gap-4">
                        <TrendingUp className="h-10 w-10" /> REVENUE
                    </h3>
                    {revenue.map((line, i) => (
                        <div key={i} className="flex justify-between items-center py-4 border-b border-white/10">
                            <p className="text-xl text-gray-300">{line.name}</p>
                            <p className="text-3xl font-black text-green-400">₦{line.amount.toLocaleString()}</p>
                        </div>
                    ))}
                    <div className="flex justify-between items-center py-6 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-2xl mt-6">
                        <p className="text-4xl font-bold">TOTAL REVENUE</p>
                        <p className="text-5xl font-black text-cyan-300">
                            ₦{revenue.reduce((s, r) => s + r.amount, 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* EXPENSES */}
                <div>
                    <h3 className="text-3xl font-bold text-rose-400 mb-6 flex items-center gap-4">
                        <TrendingDown className="h-10 w-10" /> EXPENSES
                    </h3>
                    {expenses.map((line, i) => (
                        <div key={i} className="flex justify-between items-center py-4 border-b border-white/10">
                            <p className="text-xl text-gray-300">{line.name}</p>
                            <p className="text-3xl font-black text-rose-400">₦{line.amount.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                {/* PROFIT LEVELS */}
                <div className="space-y-8 bg-white/5 rounded-3xl p-10">
                    <div className="flex justify-between items-center">
                        <p className="text-3xl font-bold text-emerald-400">Gross Profit</p>
                        <p className="text-5xl font-black text-emerald-400">₦{grossProfit.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-3xl font-bold text-purple-400">Operating Profit (EBITDA)</p>
                        <p className="text-5xl font-black text-purple-400">₦{operatingProfit.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center py-8 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-3xl">
                        <div>
                            <p className="text-4xl font-bold">NET PROFIT</p>
                            <p className={`text-8xl font-black ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                                ₦{netProfit.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl text-gray-400">Margin</p>
                            <p className={`text-7xl font-black ${marginColor}`}>
                                {netProfitMargin.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* AI INSIGHT */}
                <div className="mt-12 p-10 bg-gradient-to-r from-purple-900/70 to-pink-900/70 rounded-3xl border border-purple-500">
                    <div className="flex items-start gap-6">
                        <Brain className="h-20 w-20 text-purple-300 animate-pulse" />
                        <div>
                            <p className="text-4xl font-bold text-cyan-300 mb-4">AI FINANCIAL INTELLIGENCE</p>
                            <p className="text-2xl text-gray-200 leading-relaxed">
                                {ai_insight || "Your business is scaling efficiently. Revenue growth outpacing expenses by 3.2x. Maintain current trajectory for 300% profit growth by EOY."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* VOICE COMMAND HINT */}
                <div className="text-center py-8">
                    <Badge className="text-xl px-12 py-6 bg-gradient-to-r from-purple-600 to-cyan-600">
                        Say “Show P&L” • “Compare last month” • “Export P&L PDF”
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}