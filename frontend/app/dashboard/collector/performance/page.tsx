"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CollectorPerformance() {
    const [data, setData] = useState({
        leaderboard: [],
        stats: {
            totalCollectors: 184,
            activeToday: 172,
            totalCollectedToday: 84200000,
            monthlyTarget: 2400000000,
            hpcRewardsPaid: 1840000
        },
        timeline: [],
        topPerformers: []
    });

    useEffect(() => {
        const fetchData = async () => {
            const res = await api.get("/collectors/performance/");
            setData(res.data);
        };
        fetchData();
    }, []);

    return (
        <div className="p-8 bg-gradient-to-br from-purple-900 via-black to-blue-900 min-h-screen text-white">
            <div className="max-w-7xl mx-auto space-y-10">
                <div className="text-center">
                    <h1 className="text-7xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        COLLECTOR LEADERBOARD
                    </h1>
                    <p className="text-3xl mt-4 opacity-90">
                        Real-time field performance • HPC rewards • Glory
                    </p>
                    <Badge className="text-2xl px-8 py-4 mt-6 bg-yellow-500 text-black">
                        RWF {data.stats.totalCollectedToday.toLocaleString()} collected today
                    </Badge>
                </div>

                {/* Top 3 Podium */}
                <div className="grid grid-cols-3 gap-8 mt-12">
                    {data.topPerformers.slice(0, 3).map((c: any, i: number) => (
                        <Card key={c.id} className={`relative overflow-hidden border-4 ${i === 0 ? 'border-yellow-400' : i === 1 ? 'border-gray-300' : 'border-orange-600'}`}>
                            <div className={`absolute top-0 left-0 right-0 h-32 ${i === 0 ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' : i === 1 ? 'from-gray-300 to-gray-500' : 'from-orange-600 to-orange-800'}`} />
                            <div className="relative text-center pt-20 pb-8">
                                <Avatar className="w-32 h-32 mx-auto border-8 border-white shadow-2xl">
                                    <AvatarFallback className="text-5xl">{c.name[0]}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-4xl font-bold mt-6">{c.name}</h2>
                                <p className="text-2xl opacity-80">{c.village}</p>
                                <div className="mt-8">
                                    <p className="text-5xl font-black text-green-400">
                                        RWF {c.collected_this_month.toLocaleString()}
                                    </p>
                                    <p className="text-xl">This Month</p>
                                    <Badge className="text-xl mt-4 px-6 py-2 bg-yellow-500 text-black">
                                        +{c.hpc_reward} HPC Reward
                                    </Badge>
                                </div>
                                <div className="text-6xl mt-8">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <Tabs defaultValue="leaderboard" className="mt-16">
                    <TabsList className="grid grid-cols-3 w-full bg-black/50">
                        <TabsTrigger value="leaderboard">Full Leaderboard</TabsTrigger>
                        <TabsTrigger value="timeline">Collection Timeline</TabsTrigger>
                        <TabsTrigger value="rewards">HPC Rewards</TabsTrigger>
                    </TabsList>

                    <TabsContent value="leaderboard">
                        <Card className="bg-black/50 border-purple-500">
                            <CardHeader>
                                <CardTitle className="text-4xl">All Collectors Ranked</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {data.leaderboard.map((c: any, i: number) => (
                                        <div key={c.id} className="flex items-center justify-between p-6 bg-purple-900/30 rounded-2xl hover:bg-purple-900/50 transition">
                                            <div className="flex items-center gap-6">
                                                <span className="text-4xl font-bold w-16 text-center">#{i + 1}</span>
                                                <Avatar className="w-20 h-20">
                                                    <AvatarFallback className="text-2xl">{c.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-3xl font-bold">{c.name}</p>
                                                    <p className="text-xl opacity-70">{c.village} • {c.zone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-4xl font-black text-green-400">
                                                    RWF {c.collected_this_month.toLocaleString()}
                                                </p>
                                                <Progress value={c.target_progress} className="w-64 h-8 mt-4" />
                                                <p className="text-xl mt-2">{c.target_progress}% of target</p>
                                                <Badge className="text-xl mt-4 px-6 py-2 bg-yellow-500 text-black">
                                                    +{c.hpc_reward} HPC
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timeline">
                        <Card className="bg-black/50">
                            <CardHeader>
                                <CardTitle className="text-4xl">Daily Collection Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={500}>
                                    <LineChart data={data.timeline}>
                                        <CartesianGrid stroke="#444" />
                                        <XAxis dataKey="date" stroke="#fff" />
                                        <YAxis stroke="#fff" />
                                        <Tooltip contentStyle={{ background: '#000', border: '2px solid #8b5cf6' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={6} name="Collected (RWF)" />
                                        <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={4} strokeDasharray="5 5" name="Daily Target" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rewards">
                        <Card className="bg-black/50">
                            <CardHeader>
                                <CardTitle className="text-4xl">HPC Rewards Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-8">
                                    {data.leaderboard.slice(0, 9).map((c: any) => (
                                        <div key={c.id} className="text-center p-8 bg-purple-900/50 rounded-3xl">
                                            <Avatar className="w-32 h-32 mx-auto mb-6">
                                                <AvatarFallback className="text-4xl">{c.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <p className="text-3xl font-bold">{c.name}</p>
                                            <p className="text-5xl font-black text-yellow-400 mt-6">
                                                {c.hpc_reward.toLocaleString()} HPC
                                            </p>
                                            <p className="text-xl opacity-80 mt-4">Earned This Month</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="text-center mt-16">
                    <p className="text-4xl font-bold">
                        Total HPC Rewards Paid: {data.stats.hpcRewardsPaid.toLocaleString()}
                    </p>
                    <p className="text-2xl opacity-80 mt-4">
                        Motivating excellence in the field
                    </p>
                </div>
            </div>
        </div>
    );
}