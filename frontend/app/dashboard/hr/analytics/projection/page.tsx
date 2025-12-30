// app/dashboard/hr/analytics/projection/page.tsx
"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import {
    TrendingUp, DollarSign, Users, AlertTriangle, Brain, Zap, Shield, Flame, Target, Rocket, Coins, Timer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Scenario = "conservative" | "baseline" | "growth" | "hypergrowth" | "crisis";

interface ScenarioConfig {
    name: string;
    icon: React.ReactNode;
    color: string;
    bgGradient: string;
    salaryGrowth: number;
    hiringRate: number;
    revenueGrowth: number;
    profitMargin: number;
    capexRate: number;        // % of revenue spent on expansion
    paymentTermsDays: number; // Avg days to collect revenue
    description: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
    conservative: { name: "Conservative", icon: <Shield />, color: "blue", bgGradient: "from-blue-600 to-cyan-700", salaryGrowth: 5, hiringRate: 6, revenueGrowth: 10, profitMargin: 28, capexRate: 8, paymentTermsDays: 30, description: "Cash-rich fortress" },
    baseline:     { name: "Baseline",     icon: <Brain />, color: "emerald", bgGradient: "from-emerald-600 to-teal-700", salaryGrowth: 8.5, hiringRate: 12, revenueGrowth: 20, profitMargin: 22, capexRate: 12, paymentTermsDays: 45, description: "Current path" },
    growth:       { name: "Growth",       icon: <Zap />,   color: "yellow", bgGradient: "from-yellow-500 to-orange-600", salaryGrowth: 12, hiringRate: 25, revenueGrowth: 40, profitMargin: 18, capexRate: 18, paymentTermsDays: 60, description: "Aggressive scaling" },
    hypergrowth:  { name: "Hypergrowth",  icon: <Flame />, color: "red",    bgGradient: "from-red-600 to-pink-700", salaryGrowth: 18, hiringRate: 40, revenueGrowth: 70, profitMargin: 12, capexRate: 25, paymentTermsDays: 90, description: "Burn cash to rule" },
    crisis:       { name: "Crisis",       icon: <AlertTriangle />, color: "gray", bgGradient: "from-gray-700 to-slate-800", salaryGrowth: 0, hiringRate: -15, revenueGrowth: -15, profitMargin: 15, capexRate: 5, paymentTermsDays: 120, description: "Survival mode" }
};

export default function CashFlowWarRoom() {
    const [selectedScenario, setSelectedScenario] = useState<Scenario>("baseline");
    const [currentCash] = useState(250_000_000); // Current cash reserves (250M CFA)

    const { data: payrolls = [] } = useSWR("/hr/payroll/?year=2025");
    const { data: staffList = [] } = useSWR("/hr/staff/");

    const currentStaff = (staffList?.results || staffList).length || 1;
    const currentAnnualPayroll = payrolls.reduce((s: number, p: any) => s + Number(p.total), 0) * 12;
    const estimatedCurrentRevenue = currentAnnualPayroll / 0.32; // 32% payroll-to-revenue ratio

    const scenario = SCENARIOS[selectedScenario];
    const config = scenario;

    const projection = useMemo(() => {
        let cashBalance = currentCash;
        const years = [];

        for (let y = 2025; y <= 2030; y++) {
            const yearsAhead = y - 2025;
            const staffCount = Math.max(1, currentStaff + config.hiringRate * yearsAhead);
            const salaryFactor = Math.pow(1 + config.salaryGrowth / 100, yearsAhead);
            const revenueFactor = Math.pow(1 + config.revenueGrowth / 100, yearsAhead);

            const revenue = estimatedCurrentRevenue * revenueFactor;
            const payroll = currentAnnualPayroll * salaryFactor * (staffCount / currentStaff);
            const capex = revenue * (config.capexRate / 100);
            const operatingProfit = revenue * (config.profitMargin / 100);
            const cashFromOperations = operatingProfit - payroll - capex;

            // Cash flow timing
            const collectedRevenue = revenue * (1 - config.paymentTermsDays / 365); // Simplified DSO impact
            const cashFlowThisYear = collectedRevenue - payroll - capex;

            cashBalance += cashFlowThisYear;

            const monthsOfRunway = cashBalance > 0 ? "∞" : Math.abs(cashBalance / (payroll / 12)).toFixed(1);

            years.push({
                year: y,
                revenue: Math.round(revenue),
                payroll: Math.round(payroll),
                capex: Math.round(capex),
                cashFlow: Math.round(cashFlowThisYear),
                cashBalance: Math.round(cashBalance),
                runway: cashBalance > 0 ? "Safe" : `${monthsOfRunway} months`,
                isBankrupt: cashBalance < -(payroll * 1.5) // 1.5 months buffer
            });
        }
        return years;
    }, [currentCash, currentStaff, currentAnnualPayroll, estimatedCurrentRevenue, config]);

    const final = projection[5];
    const peakCash = Math.max(...projection.map(p => p.cashBalance));
    const lowestCash = Math.min(...projection.map(p => p.cashBalance));
    const bankruptYear = projection.find(p => p.isBankrupt)?.year;

    const chartSeries = [
        { name: "Cash Balance", data: projection.map(p => Math.round(p.cashBalance / 1_000_000)) },
        { name: "Annual Cash Flow", data: projection.map(p => Math.round(p.cashFlow / 1_000_000)) }
    ];

    const chartOptions = {
        chart: { type: "area", height: 500 },
        xaxis: { categories: projection.map(p => p.year) },
        colors: final.cashBalance > 0 ? ["#10b981", "#22c55e"] : ["#dc2626", "#ef4444"],
        stroke: { width: 4 },
        fill: { opacity: 0.7 },
        markers: { size: 6 },
        yaxis: { title: { text: "CFA (Millions)" }, labels: { formatter: (v: number) => `${v}M` } },
        tooltip: { y: { formatter: (v: number) => `${(v * 1_000_000).toLocaleString()} CFA` } }
    };

    return (
        <div className="space-y-10 p-6 max-w-7xl mx-auto">
            {/* GOD MODE HEADER */}
            <div className="text-center py-16 bg-gradient-to-br from-black via-red-900 to-black rounded-3xl text-white">
                <h1 className="text-8xl font-black mb-6 tracking-tighter">
                    CASH FLOW <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600">WAR ROOM</span>
                </h1>
                <p className="text-4xl opacity-90">Cash is Oxygen. Will Your Empire Breathe in 2030?</p>
            </div>

            {/* Scenario Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {Object.entries(SCENARIOS).map(([k, cfg]) => {
                    const key = k as Scenario;
                    const active = selectedScenario === key;
                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-all ${active ? "ring-4 ring-white shadow-2xl scale-105" : ""}`}
                            onClick={() => setSelectedScenario(key)}
                        >
                            <CardHeader className={`text-center p-8 bg-gradient-to-b ${cfg.bgGradient} text-white`}>
                                <div className="mx-auto w-20 h-20 bg-white/30 rounded-full flex items-center justify-center mb-4">
                                    {cfg.icon}
                                </div>
                                <CardTitle className="text-2xl">{cfg.name}</CardTitle>
                                <div className="mt-4 space-y-2">
                                    <Badge className="text-lg">Rev +{cfg.revenueGrowth}%</Badge>
                                    <Badge variant="secondary" className="text-lg">DSO {cfg.paymentTermsDays}d</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 text-center">
                                <p className="text-sm">{cfg.description}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* CASH FLOW CHART */}
            <Card className="border-4 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-4xl text-center flex items-center justify-center gap-4">
                        <Coins className="h-12 w-12" />
                        Cash Balance & Flow (2025–2030)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Chart options={chartOptions} series={chartSeries} type="area" height={500} />
                </CardContent>
            </Card>

            {/* 2030 CASH VERDICT */}
            <div className="grid md:grid-cols-4 gap-8">
                <Card className="text-center p-10 bg-gradient-to-br from-blue-600 to-cyan-700 text-white">
                    <Timer className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-2xl mb-2">2030 Cash Balance</p>
                    <p className="text-6xl font-black">
                        {final.cashBalance > 0 ? "+" : ""}{Math.round(final.cashBalance / 1_000_000)}M CFA
                    </p>
                </Card>

                <Card className="text-center p-10 bg-gradient-to-br from-green-600 to-emerald-700 text-white">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-2xl mb-2">Peak Cash</p>
                    <p className="text-6xl font-black">
                        {Math.round(peakCash / 1_000_000)}M CFA
                    </p>
                </Card>

                <Card className="text-center p-10 bg-gradient-to-br from-red-600 to-rose-700 text-white">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-2xl mb-2">Lowest Point</p>
                    <p className="text-6xl font-black">
                        {Math.round(lowestCash / 1_000_000)}M CFA
                    </p>
                </Card>

                <Card className={`text-center p-10 ${final.cashBalance > 0 ? "bg-gradient-to-br from-emerald-600 to-green-700" : "bg-gradient-to-br from-red-800 to-rose-900"} text-white`}>
                    <DollarSign className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-2xl mb-2">FINAL STATUS</p>
                    <p className="text-7xl font-black">
                        {final.cashBalance > 0 ? "CASH KING" : "BANKRUPT"}
                    </p>
                    {bankruptYear && <p className="text-3xl mt-4">Year {bankruptYear}</p>}
                </Card>
            </div>

            {/* FINAL JUDGMENT */}
            <Card className={`border-8 ${final.cashBalance > 0 ? "border-green-600 bg-green-50" : "border-red-700 bg-red-50"}`}>
                <CardContent className="text-center py-20">
                    <h2 className={`text-8xl font-black mb-8 ${final.cashBalance > 0 ? "text-green-700" : "text-red-700"}`}>
                        {final.cashBalance > 0 ? "EMPIRE WILL LIVE FOREVER" : "EMPIRE WILL DIE"}
                    </h2>
                    <p className="text-4xl mt-8">
                        In 2030, under <strong>{config.name}</strong> scenario:
                    </p>
                    <p className="text-9xl font-black my-12 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                        {Math.abs(Math.round(final.cashBalance / 1_000_000))} MILLION CFA
                    </p>
                    <p className={`text-6xl font-bold ${final.cashBalance > 0 ? "text-green-600" : "text-red-600"}`}>
                        {final.cashBalance > 0 ? "CASH RESERVE" : "CASH BURNED"}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}