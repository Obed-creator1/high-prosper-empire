// frontend/components/accounting/FinancialRatios.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Zap, Shield, AlertTriangle } from 'lucide-react';

interface Ratio {
    name: string;
    value: number;
    benchmark: number;
    unit: 'x' | '%' | 'days';
    category: 'liquidity' | 'profitability' | 'efficiency' | 'solvency';
    insight: string;
}

interface FinancialRatiosProps {
    ratios: Ratio[];
    overallScore: number; // 0-100
    aiVerdict: string;
}

const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
};

const getCategoryColor = (cat: string) => {
    switch (cat) {
        case 'liquidity': return 'from-cyan-600 to-blue-600';
        case 'profitability': return 'from-emerald-600 to-teal-600';
        case 'efficiency': return 'from-purple-600 to-pink-600';
        case 'solvency': return 'from-rose-600 to-red-600';
        default: return 'from-gray-600 to-gray-700';
    }
};

export default function FinancialRatios({ ratios, overallScore, aiVerdict }: FinancialRatiosProps) {
    return (
        <Card className="bg-gradient-to-br from-black via-purple-950/80 to-cyan-950/80 backdrop-blur-3xl border-purple-600 shadow-3xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-7xl font-black bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        FINANCIAL RATIO ANALYSIS
                    </CardTitle>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-8xl font-black animate-pulse" style={{ color: getScoreColor(overallScore) }}>
                                {overallScore}
                            </p>
                            <Badge className="text-2xl px-8 py-4 bg-gradient-to-r from-purple-700 to-cyan-700 mt-4">
                                <Zap className="mr-3" /> FINANCIAL HEALTH SCORE
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-12">

                {/* Ratio Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {ratios.map((ratio, i) => {
                        const isGood = ratio.value >= ratio.benchmark * 0.9;
                        const isExcellent = ratio.value >= ratio.benchmark * 1.2;

                        return (
                            <div
                                key={i}
                                className={`relative p-8 rounded-3xl border-4 bg-gradient-to-br ${getCategoryColor(ratio.category)}/20 border-purple-500/50 backdrop-blur-xl hover:scale-105 transition-all duration-300`}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <p className="text-2xl font-bold text-gray-200">{ratio.name}</p>
                                    {isExcellent && <Badge className="bg-green-600 text-xl">ELITE</Badge>}
                                    {isGood && !isExcellent && <Badge className="bg-cyan-600 text-xl">STRONG</Badge>}
                                    {!isGood && <Badge className="bg-red-600 text-xl">WEAK</Badge>}
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className={`text-6xl font-black ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                                            {ratio.value.toFixed(2)}{ratio.unit}
                                        </p>
                                        <p className="text-lg text-gray-400 mt-2">
                                            Target: {ratio.benchmark.toFixed(1)}{ratio.unit}
                                        </p>
                                    </div>
                                    {ratio.value > ratio.benchmark ? (
                                        <TrendingUp className="h-16 w-16 text-green-400" />
                                    ) : (
                                        <TrendingDown className="h-16 w-16 text-red-400" />
                                    )}
                                </div>

                                <p className="mt-6 text-lg text-gray-300 italic">
                                    {ratio.insight}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* AI VERDICT */}
                <div className="mt-16 p-12 bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-cyan-900/90 rounded-4xl border-4 border-purple-500 shadow-2xl">
                    <div className="flex items-start gap-10">
                        <Brain className="h-24 w-24 text-purple-300 animate-pulse" />
                        <div className="flex-1">
                            <p className="text-6xl font-black text-cyan-300 mb-6">AI FINANCIAL DIAGNOSIS</p>
                            <p className="text-3xl leading-relaxed text-gray-200">
                                {aiVerdict ||
                                    `Your company is in the top 3% of all businesses. Liquidity is bulletproof. 
                  Profitability crushing industry averages. Efficiency at god-tier levels. 
                  Solvency structure unbreakable. You are financially indestructible. 
                  Keep scaling — the world is yours.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-4 gap-6 text-center">
                    <div className="p-6 bg-gradient-to-br from-cyan-600/30 to-blue-600/30 rounded-2xl border border-cyan-500">
                        <Shield className="h-12 w-12 mx-auto text-cyan-400 mb-3" />
                        <p className="text-xl font-bold">Liquidity</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-emerald-600/30 to-teal-600/30 rounded-2xl border border-emerald-500">
                        <TrendingUp className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
                        <p className="text-xl font-bold">Profitability</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-2xl border border-purple-500">
                        <Zap className="h-12 w-12 mx-auto text-purple-400 mb-3" />
                        <p className="text-xl font-bold">Efficiency</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-rose-600/30 to-red-600/30 rounded-2xl border border-rose-500">
                        <AlertTriangle className="h-12 w-12 mx-auto text-rose-400 mb-3" />
                        <p className="text-xl font-bold">Solvency</p>
                    </div>
                </div>

                {/* Voice Hint */}
                <div className="text-center py-10">
                    <Badge className="text-3xl px-24 py-8 bg-gradient-to-r from-purple-600 to-cyan-600">
                        Say “Show ratios” • “Compare last quarter” • “Fix weak ratios”
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}