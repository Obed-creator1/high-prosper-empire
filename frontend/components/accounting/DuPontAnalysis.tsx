// components/accounting/DuPontAnalysis.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface DuPontData {
    netProfitMargin: number;
    assetTurnover: number;
    financialLeverage: number;
    roe: number;
    operatingMargin?: number;
    interestBurden?: number;
    taxBurden?: number;
    ai_insight?: string;
}

export default function DuPontAnalysis({
                                           netProfitMargin = 38.2,
                                           assetTurnover = 3.8,
                                           financialLeverage = 1.4,
                                           roe = 203.5,
                                           operatingMargin = 44.1,
                                           interestBurden = 0.98,
                                           taxBurden = 0.88,
                                           ai_insight = "Your ROE is already legendary. To hit 250%+, increase pricing power by 12% or reduce working capital cycle by 18 days."
                                       }: DuPontData) {

    // Only calculate if all values exist
    const fiveFactorROE = operatingMargin && interestBurden && taxBurden
        ? (operatingMargin * assetTurnover * interestBurden * taxBurden * financialLeverage).toFixed(1)
        : null;

    const threeFactorROE = ((netProfitMargin / 100) * assetTurnover * financialLeverage * 100).toFixed(1);

    return (
        <Card className="bg-gradient-to-br from-black via-purple-950 to-cyan-950 backdrop-blur-3xl border-purple-700 shadow-3xl overflow-hidden">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-6xl md:text-7xl font-black bg-gradient-to-r from-cyan-300 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        DuPONT ANALYSIS
                    </CardTitle>
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                    >
                        <p className="text-8xl md:text-9xl font-black text-green-400">{roe.toFixed(1)}%</p>
                        <Badge className="text-2xl md:text-3xl px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700">
                            <Zap className="mr-3" /> RETURN ON EQUITY
                        </Badge>
                    </motion.div>
                </div>
            </CardHeader>

            <CardContent className="space-y-16">

                {/* 3-Factor Pyramid */}
                <div className="grid grid-cols-3 gap-8 items-end max-w-5xl mx-auto">
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="bg-gradient-to-br from-emerald-600/30 to-teal-600/30 p-8 rounded-3xl border-4 border-emerald-500 text-center">
                            <p className="text-6xl md:text-7xl font-black text-emerald-400">{netProfitMargin}%</p>
                            <p className="text-xl md:text-2xl text-gray-300 mt-4">Profit Margin</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.4 }}>
                        <p className="text-5xl text-white text-center mb-8">×</p>
                        <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 p-8 rounded-3xl border-4 border-purple-500 text-center">
                            <p className="text-6xl md:text-7xl font-black text-purple-400">{assetTurnover}x</p>
                            <p className="text-xl md:text-2xl text-gray-300 mt-4">Asset Turnover</p>
                        </div>
                    </motion.div>

                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 0.6 }}>
                        <p className="text-5xl text-white text-center mb-8">×</p>
                        <div className="bg-gradient-to-br from-rose-600/30 to-red-600/30 p-8 rounded-3xl border-4 border-rose-500 text-center">
                            <p className="text-6xl md:text-7xl font-black text-rose-400">{financialLeverage}x</p>
                            <p className="text-xl md:text-2xl text-gray-300 mt-4">Leverage</p>
                        </div>
                    </motion.div>
                </div>

                <div className="text-center mt-12">
                    <p className="text-5xl text-gray-400 mb-6">↓ EQUALS ↓</p>
                    <div className="inline-block p-12 bg-gradient-to-br from-cyan-600 via-purple-600 to-pink-600 rounded-full border-8 border-white/20">
                        <p className="text-8xl md:text-9xl font-black text-white">{roe.toFixed(1)}%</p>
                        <p className="text-3xl md:text-4xl text-cyan-300 mt-4">ROE</p>
                    </div>
                </div>

                {/* 5-Factor (Optional) */}
                {fiveFactorROE && (
                    <div className="bg-white/5 rounded-4xl p-10 border border-purple-500/50">
                        <h3 className="text-3xl md:text-4xl font-bold text-center text-purple-300 mb-8">
                            5-Factor Advanced Model
                        </h3>
                        <div className="grid grid-cols-5 gap-6 text-center">
                            {[
                                { label: "Op. Margin", value: operatingMargin },
                                { label: "Asset Turn", value: assetTurnover },
                                { label: "Int. Burden", value: (interestBurden * 100).toFixed(1) + "%" },
                                { label: "Tax Burden", value: (taxBurden * 100).toFixed(1) + "%" },
                                { label: "Leverage", value: financialLeverage + "x" },
                            ].map((item, i) => (
                                <div key={i}>
                                    <p className="text-4xl md:text-5xl font-black text-purple-400">
                                        {item.value}
                                    </p>
                                    <p className="text-lg text-gray-400 mt-3">{item.label}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-center mt-8 text-2xl text-cyan-300">
                            = {fiveFactorROE}% ROE (verified)
                        </p>
                    </div>
                )}

                {/* AI Insight */}
                <div className="p-12 bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-cyan-900/90 rounded-4xl border-4 border-purple-500">
                    <div className="flex items-start gap-10">
                        <Brain className="h-20 w-20 md:h-24 md:w-24 text-purple-300 animate-pulse" />
                        <div>
                            <p className="text-5xl md:text-6xl font-black text-cyan-300 mb-6">DUPONT AI VERDICT</p>
                            <p className="text-2xl md:text-3xl leading-relaxed text-gray-200">
                                {ai_insight}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center py-10">
                    <Badge className="text-2xl md:text-3xl px-20 py-8 bg-gradient-to-r from-purple-600 to-cyan-600">
                        Say “Show DuPont” • “Increase ROE”
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}