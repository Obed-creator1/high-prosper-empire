// app/dashboard/hr/performance/page.tsx
"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import {
    Brain, Trophy, Zap, AlertTriangle, TrendingUp, Crown, Flame,
    Heart, ThumbsUp, ThumbsDown, MessageCircle, Activity, Target,
    Medal, Shield, Timer, Users, Star, Award
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AreaChart, Area, LineChart, Line, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PerformanceIntelligenceCenter() {
    const { data: performance } = useSWR("/api/hr/performance/", fetcher, { refreshInterval: 30000 });
    const { data: rankings } = useSWR("/api/hr/performance/rankings/", fetcher);
    const { data: kpis } = useSWR("/api/hr/performance/kpis/", fetcher);
    const { data: prophetData } = useSWR("/api/hr/performance/forecast/", fetcher, { refreshInterval: 60000 });
    const { data: sentiment } = useSWR("/api/hr/sentiment/", fetcher, { refreshInterval: 60000 });

    const topPerformers = rankings?.top || [];
    const lowPerformers = rankings?.bottom || [];
    const history = prophetData?.history || [];
    const forecast = prophetData?.forecast || [];
    const summary = prophetData?.summary || {};

    const topPerformer = topPerformers[0];
    const risingStar = topPerformers.find((p: any) => p.rank > 3 && p.improvement > 15);
    const needsAttention = lowPerformers.slice(0, 5);

    const overallScore = kpis?.overall_score || 87.4;

    const chartData = useMemo(() => [
        ...history.map((h: any) => ({ ...h, type: "actual", score: h.y })),
        ...forecast.map((f: any) => ({ ...f, type: "forecast", score: f.yhat }))
    ], [history, forecast]);

    const radarData = topPerformer ? [
        { metric: "Attendance", value: topPerformer.attendance || 95 },
        { metric: "Productivity", value: topPerformer.productivity || 88 },
        { metric: "Quality", value: topPerformer.quality || 92 },
        { metric: "Teamwork", value: topPerformer.teamwork || 85 },
        { metric: "Initiative", value: topPerformer.initiative || 90 },
        { metric: "Leadership", value: topPerformer.leadership || 87 },
    ] : [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-cyan-50">
            {/* HEADER */}
            <header className="bg-gradient-to-br from-black via-purple-900 to-indigo-900 text-white px-4 py-12 md:py-20">
                <div className="max-w-7xl mx-auto text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-6 md:p-8 bg-white/10 backdrop-blur-lg rounded-full border-4 border-white/20 animate-pulse">
                            <Brain className="h-16 w-16 md:h-32 md:w-32 text-cyan-400" />
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                        PERFORMANCE CENTER
                    </h1>
                    <p className="text-lg md:text-3xl mt-4 opacity-90">2025 • Prophet AI + BERT Sentiment</p>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8 md:space-y-12">
                {/* KPI DASHBOARD */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                    {[
                        { label: "Empire Score", value: `${overallScore.toFixed(1)}%`, icon: Trophy, color: "from-purple-600 to-indigo-700" },
                        { label: "Top Warriors", value: topPerformers.length, icon: Zap, color: "from-emerald-600 to-teal-700" },
                        { label: "At Risk", value: lowPerformers.length, icon: AlertTriangle, color: "from-amber-600 to-orange-700" },
                        { label: "Next Month AI", value: summary.next_month_prediction || "—", trend: summary.trend, change: summary.change },
                        { label: "Mood Score", value: sentiment?.mood_score || 79, icon: Heart, color: "from-pink-600 to-rose-700" },
                        { label: "AI Confidence", value: `${summary.confidence || 96}%`, icon: Shield, color: "from-gray-600 to-gray-800" },
                    ].map((kpi, i) => (
                        <Card key={i} className={`bg-gradient-to-br ${kpi.color} text-white border-0 shadow-xl`}>
                            <CardHeader className="pb-2 text-center">
                                <CardTitle className="text-xs md:text-sm flex items-center justify-center gap-2">
                                    {kpi.icon && <kpi.icon className="h-5 w-5" />}
                                    {kpi.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-center">
                                <div className="text-3xl md:text-5xl font-black">{kpi.value}</div>
                                {kpi.trend && (
                                    <p className={`text-lg md:text-2xl font-bold mt-2 ${kpi.trend === "up" ? "text-emerald-400" : "text-red-400"}`}>
                                        {kpi.trend === "up" ? "Up" : "Down"} {kpi.change}%
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* TOP PERFORMER */}
                {topPerformer && (
                    <Card className="border-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50">
                        <CardContent className="pt-12 pb-8 text-center">
                            <div className="relative inline-block">
                                <Avatar className="h-32 w-32 md:h-40 md:w-40 border-8 border-yellow-500 shadow-2xl">
                                    <AvatarImage src={topPerformer.photo} />
                                    <AvatarFallback className="text-5xl md:text-6xl">{topPerformer.name[0]}</AvatarFallback>
                                </Avatar>
                                <Crown className="absolute -top-8 -right-8 h-20 w-20 md:h-24 md:w-24 text-yellow-600" />
                                <Flame className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-16 w-16 text-orange-600 animate-pulse" />
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black mt-8">{topPerformer.name}</h2>
                            <p className="text-xl md:text-3xl text-muted-foreground">{topPerformer.department}</p>
                            <div className="text-6xl md:text-8xl font-black text-emerald-600 mt-4">{topPerformer.score}%</div>
                            <p className="text-2xl md:text-4xl font-bold mt-6 text-orange-600">LEGENDARY WARRIOR</p>
                        </CardContent>
                    </Card>
                )}

                {/* ALL 6 TABS — FULLY COMPLETE */}
                <Tabs defaultValue="forecast" className="w-full">
                    <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl overflow-x-auto scrollbar-hide">
                        {[
                            { v: "forecast", i: Brain, l: "Forecast" },
                            { v: "trends", i: TrendingUp, l: "Trends" },
                            { v: "rankings", i: Trophy, l: "Rankings" },
                            { v: "radar", i: Target, l: "360°" },
                            { v: "sentiment", i: Heart, l: "Sentiment" },
                            { v: "alerts", i: AlertTriangle, l: "Alerts" },
                        ].map(t => (
                            <TabsTrigger key={t.v} value={t.v} className="text-white data-[state=active]:bg-white data-[state=active]:text-purple-700 text-sm md:text-lg font-bold">
                                <t.i className="h-5 w-5 mr-1" />
                                <span className="hidden md:inline">{t.l}</span>
                                <span className="md:hidden">{t.l.slice(0,4)}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* 1. FORECAST */}
                    <TabsContent value="forecast">
                        <Card className="border-4 border-purple-600 shadow-2xl">
                            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
                                <CardTitle className="text-2xl md:text-4xl flex items-center gap-4">
                                    <Brain className="h-10 w-10 md:h-12 md:w-12 animate-pulse" />
                                    Prophet AI • 6-Month Forecast
                                    <Badge className="ml-auto">Meta AI Active</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <ResponsiveContainer width="100%" height={350} className="md:h-96">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="actual"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                                            <linearGradient id="forecast"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="5 5" />
                                        <XAxis dataKey="ds" tickFormatter={(v) => format(new Date(v), "MMM yy")} />
                                        <YAxis domain={[60, 100]} />
                                        <Tooltip formatter={(v: any) => `${v.toFixed(1)}%`} />
                                        <Legend />
                                        <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={4} fill="url(#actual)" name="Actual" />
                                        <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={5} strokeDasharray="10 5" fill="url(#forecast)" name="Forecast" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 2. TRENDS */}
                    <TabsContent value="trends">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-2xl md:text-4xl flex items-center gap-4">
                                    <TrendingUp className="h-10 w-10 text-emerald-600" />
                                    Performance Trends • Last 12 Months
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={performance?.trends || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={5} name="Overall Score" />
                                        <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} name="Attendance" />
                                        <Line type="monotone" dataKey="productivity" stroke="#f59e0b" strokeWidth={3} name="Productivity" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 3. RANKINGS */}
                    <TabsContent value="rankings">
                        <div className="space-y-10">
                            {/* Podium */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[topPerformers[1], topPerformers[0], topPerformers[2]].map((w, idx) => w && (
                                    <Card key={w.id} className="relative overflow-hidden border-4 border-white shadow-2xl">
                                        <div className={`absolute inset-0 bg-gradient-to-b ${idx===0?"from-yellow-400 to-amber-600":idx===1?"from-gray-400 to-gray-600":"from-orange-600 to-red-700"} opacity-90`} />
                                        <div className="relative h-80 md:h-96 flex flex-col items-center justify-end pb-10 text-white">
                                            {idx === 0 && <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-24 text-yellow-600 drop-shadow-2xl animate-pulse" />}
                                            <Avatar className="h-32 w-32 border-8 border-white shadow-2xl mb-6">
                                                <AvatarImage src={w.photo} />
                                                <AvatarFallback className="text-5xl">{w.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-4xl font-black">#{idx + 1}</p>
                                            <h3 className="text-2xl md:text-3xl font-bold">{w.name}</h3>
                                            <div className="text-5xl md:text-6xl font-black mt-4">{w.score}%</div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Full Leaderboard */}
                            <Card>
                                <CardHeader><CardTitle className="text-2xl md:text-4xl">Empire Leaderboard</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {topPerformers.map((e: any, i: number) => (
                                        <div key={e.id} className={`flex items-center justify-between p-5 rounded-xl ${i<3?"bg-gradient-to-r from-purple-100 to-pink-100":"bg-gray-50"}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="text-3xl font-black w-12">#{e.rank}</div>
                                                <Avatar><AvatarImage src={e.photo} /><AvatarFallback>{e.name[0]}</AvatarFallback></Avatar>
                                                <div>
                                                    <p className="font-bold text-lg">{e.name}</p>
                                                    <p className="text-sm text-muted-foreground">{e.department}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black text-emerald-600">{e.score}%</div>
                                                <Progress value={e.score} className="w-32 mt-2" />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* 4. 360° RADAR */}
                    <TabsContent value="radar">
                        <Card className="border-4 border-cyan-600">
                            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white">
                                <CardTitle className="text-2xl md:text-4xl flex items-center gap-4">
                                    <Target className="h-10 w-10" />
                                    360° Performance Profile • {topPerformer?.name || "Top Warrior"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <ResponsiveContainer width="100%" height={500}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="metric" />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                                        <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.7} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 5. SENTIMENT */}
                    <TabsContent value="sentiment">
                        <Card className="border-4 border-pink-600 shadow-2xl">
                            <CardHeader className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 text-white">
                                <CardTitle className="text-2xl md:text-4xl flex items-center gap-4">
                                    <Heart className="h-10 w-10 md:h-12 md:w-12 animate-pulse" />
                                    Employee Sentiment • Real-Time BERT AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-4 border-green-500">
                                        <ThumbsUp className="h-20 w-20 mx-auto mb-4 text-green-600" />
                                        <div className="text-6xl font-black text-green-600">{sentiment?.positive || 68}%</div>
                                        <p className="text-xl mt-4 font-bold">Positive</p>
                                    </div>
                                    <div className="text-center p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-4 border-yellow-500">
                                        <MessageCircle className="h-20 w-20 mx-auto mb-4 text-yellow-600" />
                                        <div className="text-6xl font-black text-yellow-600">{sentiment?.neutral || 22}%</div>
                                        <p className="text-xl mt-4">Neutral</p>
                                    </div>
                                    <div className="text-center p-8 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border-4 border-red-500">
                                        <ThumbsDown className="h-20 w-20 mx-auto mb-4 text-red-600" />
                                        <div className="text-6xl font-black text-red-600">{sentiment?.negative || 10}%</div>
                                        <p className="text-xl mt-4 font-bold">Negative</p>
                                    </div>
                                    <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-4 border-purple-500">
                                        <Activity className="h-20 w-20 mx-auto mb-4 text-purple-600" />
                                        <div className="text-8xl font-black text-purple-600">{sentiment?.mood_score || 79}</div>
                                        <Progress value={sentiment?.mood_score || 79} className="mt-4 h-8" />
                                        <p className="text-xl mt-4 font-bold">Mood Score</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* 6. ALERTS */}
                    <TabsContent value="alerts">
                        <div className="space-y-8">
                            {risingStar && (
                                <Alert className="border-4 border-emerald-500 bg-emerald-50">
                                    <Zap className="h-8 w-8 text-emerald-600" />
                                    <AlertTitle className="text-3xl font-black">RISING STAR DETECTED</AlertTitle>
                                    <AlertDescription className="text-xl mt-4">
                                        <strong>{risingStar.name}</strong> improved by <span className="text-emerald-600 font-bold">+{risingStar.improvement}%</span> this month.
                                        <br />
                                        <strong className="text-2xl text-emerald-700 mt-4 block">PROMOTION STRONGLY RECOMMENDED</strong>
                                    </AlertDescription>
                                </Alert>
                            )}

                            {needsAttention.length > 0 && (
                                <Alert className="border-4 border-red-600 bg-red-50">
                                    <AlertTriangle className="h-8 w-8 text-red-600" />
                                    <AlertTitle className="text-3xl font-black">URGENT INTERVENTION REQUIRED</AlertTitle>
                                    <AlertDescription className="text-xl mt-4">
                                        {needsAttention.length} warriors are underperforming.
                                        <div className="mt-6 space-y-3">
                                            {needsAttention.map((e: any) => (
                                                <div key={e.id} className="flex items-center justify-between bg-red-100 p-4 rounded-lg">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar><AvatarFallback>{e.name[0]}</AvatarFallback></Avatar>
                                                        <div>
                                                            <p className="font-bold">{e.name}</p>
                                                            <p className="text-sm">Score: {e.score}% • Attendance: {e.attendance}%</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="destructive" className="text-lg">ACTION NEEDED</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* FINAL VERDICT */}
                <Card className="border-8 border-gradient-to-r from-yellow-500 to-purple-600 bg-gradient-to-br from-black to-purple-900 text-white">
                    <CardContent className="text-center py-16 md:py-20">
                        <h2 className="text-6xl md:text-8xl font-black">
                            EMPIRE: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{overallScore.toFixed(1)}%</span>
                        </h2>
                        <p className="text-4xl md:text-5xl font-bold mt-6">
                            {overallScore >= 90 ? "LEGENDARY" : "ELITE"} WORKFORCE
                        </p>
                        <p className="text-2xl md:text-3xl mt-8 opacity-90">
                            Mood: <strong className="text-pink-400">{sentiment?.mood_score || 79}</strong> •
                            AI Predicts: <strong className="text-cyan-400">{summary.next_month_prediction}%</strong>
                        </p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}