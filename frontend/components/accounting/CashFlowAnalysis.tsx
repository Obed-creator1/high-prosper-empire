// frontend/components/accounting/CashFlowAnalysis.tsx
import { format, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Brain } from 'lucide-react';

interface CashFlowDay {
    date: string;
    inflows: number;
    outflows: number;
    net: number;
    balance: number;
}

interface CashFlowAnalysisProps {
    forecast: CashFlowDay[];
    currentBalance: number;
    burnRate?: number;
    runwayDays?: number;
}

export default function CashFlowAnalysis({
                                             forecast,
                                             currentBalance,
                                             burnRate = 0,
                                             runwayDays = 0
                                         }: CashFlowAnalysisProps) {
    const lowestBalance = Math.min(...forecast.map(d => d.balance));
    const isDanger = lowestBalance < 0;
    const isWarning = lowestBalance < currentBalance * 0.2;

    return (
        <Card className="bg-gradient-to-br from-purple-900/50 via-black to-cyan-900/50 backdrop-blur-xl border-purple-500/50 shadow-2xl">
            <CardHeader>
                <CardTitle className="text-5xl flex items-center justify-between">
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            30-Day Cash Flow Forecast
          </span>
                    <Badge className={`text-2xl px-8 py-3 ${isDanger ? 'bg-red-600' : isWarning ? 'bg-yellow-600' : 'bg-green-600'}`}>
                        {isDanger ? <AlertTriangle className="mr-2" /> : <Brain className="mr-2 animate-pulse" />}
                        {isDanger ? 'CASH CRISIS' : isWarning ? 'CAUTION' : 'HEALTHY'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-6">
                    <div className="text-center">
                        <p className="text-gray-400 text-lg">Current Balance</p>
                        <p className="text-4xl font-black text-cyan-400">₦{currentBalance.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-400 text-lg">Avg Daily Burn</p>
                        <p className="text-4xl font-black text-rose-400">-₦{Math.abs(burnRate).toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-400 text-lg">Runway</p>
                        <p className={`text-4xl font-black ${runwayDays < 30 ? 'text-red-400' : 'text-green-400'}`}>
                            {runwayDays} days
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-400 text-lg">Lowest Point</p>
                        <p className={`text-4xl font-black ${isDanger ? 'text-red-500' : 'text-yellow-400'}`}>
                            ₦{lowestBalance.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Daily Forecast */}
                <div className="space-y-4">
                    {forecast.slice(0, 15).map((day, i) => {
                        const isToday = i === 0;
                        const isNegative = day.balance < 0;
                        const isLow = day.balance < currentBalance * 0.3;

                        return (
                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isToday ? 'bg-white/10 border-purple-500' : 'border-white/10'} ${isNegative ? 'bg-red-950/50' : ''}`}>
                                <div className="flex items-center gap-6">
                                    <div className="text-right w-32">
                                        <p className={`text-2xl font-bold ${isToday ? 'text-cyan-400' : 'text-gray-300'}`}>
                                            {format(new Date(day.date), 'MMM dd')}
                                        </p>
                                        <p className="text-sm text-gray-500">{isToday ? 'Today' : format(new Date(day.date), 'EEE')}</p>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-green-400 text-xl">+₦{day.inflows.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">In</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-rose-400 text-xl">-₦{day.outflows.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">Out</p>
                                        </div>
                                        <div className="text-right w-32">
                                            <p className={`text-2xl font-black ${isNegative ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
                                                ₦{day.balance.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isNegative && <Badge className="bg-red-600">GOING NEGATIVE</Badge>}
                                    {isLow && !isNegative && <Badge className="bg-yellow-600">LOW CASH</Badge>}
                                    {day.net > 5000000 && <TrendingUp className="h-8 w-8 text-green-400" />}
                                    {day.net < -3000000 && <TrendingDown className="h-8 w-8 text-red-400" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* AI Prediction */}
                <div className="mt-10 p-8 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-3xl border border-purple-500/50">
                    <div className="flex items-center gap-6">
                        <Brain className="h-16 w-16 text-purple-400 animate-pulse" />
                        <div>
                            <p className="text-3xl font-bold text-cyan-300">AI CASH FLOW PREDICTION</p>
                            <p className="text-xl text-gray-300 mt-2">
                                {isDanger
                                    ? "URGENT: You will run out of cash in the next 15 days. Immediate action required."
                                    : isWarning
                                        ? "Warning: Cash buffer dropping below 20%. Consider delaying payments or accelerating collections."
                                        : "Healthy cash position. Projected runway: " + runwayDays + " days. Keep dominating."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}