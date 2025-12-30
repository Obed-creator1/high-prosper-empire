// HIGH PROSPER DASHBOARD 2026 – Admin / Collector View
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
    const [stats, setStats] = useState<any>({});
    const [trends, setTrends] = useState({ daily: [], monthly: [] });
    const [topVillages, setTopVillages] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const [statsRes, villagesRes] = await Promise.all([
                api.get("/customers/stats/"),
                api.get("/customers/villages/")
            ]);
            setStats(statsRes.data.summary);
            setTrends(statsRes.data.trends);
            setTopVillages(statsRes.data.topVillages);
        };
        fetchData();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    High Prosper Dashboard 2026
                </h1>
                <Avatar className="h-12 w-12">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
                        {stats.totalCustomers?.toString().slice(0,2)}
                    </div>
                </Avatar>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <span className="text-3xl">👥</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCustomers || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.active} Active • {stats.passive} Passive
                        </p>
                    </CardContent>
                </Card>

                <Card className={`${stats.totalOutstanding > 0 ? 'border-red-500' : 'border-green-500'} border-2`}>
                    <CardHeader>
                        <CardTitle className="text-sm">Outstanding Debt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                            RWF {Number(stats.totalOutstanding || 0).toLocaleString()}
                        </div>
                        <Badge variant={stats.totalOutstanding > 5000000 ? "destructive" : "secondary"}>
                            {stats.totalOutstanding > 0 ? "High Risk" : "Healthy"}
                        </Badge>
                    </CardContent>
                </Card>
                {/* More cards... */}
            </div>

            {/* Charts */}
            <Tabs defaultValue="monthly" className="w-full">
                <TabsList>
                    <TabsTrigger value="daily">Last 30 Days</TabsTrigger>
                    <TabsTrigger value="monthly">Year Trend</TabsTrigger>
                </TabsList>
                <TabsContent value="daily">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends.daily}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="new_customers" stroke="#8b5cf6" strokeWidth={3} />
                        </LineChart>
                    </ResponsiveContainer>
                </TabsContent>
            </Tabs>

            {/* Top 5 Villages at Risk */}
            <Card>
                <CardHeader>
                    <CardTitle>Top 5 Villages by Outstanding</CardTitle>
                </CardHeader>
                <CardContent>
                    {topVillages.map((v: any) => (
                        <div key={v.id} className="flex justify-between items-center py-3 border-b last:border-0">
                            <div>
                                <p className="font-medium">{v.name}</p>
                                <p className="text-sm text-gray-500">{v.total_customers} customers</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-red-600">
                                    RWF {v.total_outstanding.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}