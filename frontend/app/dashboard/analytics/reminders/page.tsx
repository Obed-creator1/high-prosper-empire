"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ReminderAnalytics() {
    const [stats, setStats] = useState({
        totalSent: 0,
        sms: 0,
        whatsapp: 0,
        voice: 0,
        push: 0,
        deliveryRate: 0,
        paymentRate: 0,
        channelPerformance: [],
        timeline: [],
        topVillages: []
    });

    useEffect(() => {
        const fetchData = async () => {
            const res = await api.get("/analytics/reminders/");
            setStats(res.data);
        };
        fetchData();
    }, []);

    const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

    return (
        <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            REMINDER ANALYTICS
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
                            Track every reminder and its impact on collections
                        </p>
                    </div>
                    <Badge variant="outline" className="text-2xl px-6 py-3">
                        Collection Boost: +41.2%
                    </Badge>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <Card className="border-purple-500 border-2">
                        <CardHeader>
                            <CardTitle>Total Sent</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{stats.totalSent.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>SMS</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold text-blue-600">{stats.sms.toLocaleString()}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>WhatsApp</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold text-green-600">{stats.whatsapp.toLocaleString()}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Voice Calls</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold text-orange-600">{stats.voice.toLocaleString()}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Push</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold text-purple-600">{stats.push.toLocaleString()}</p></CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="performance" className="w-full">
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="performance">Channel Performance</TabsTrigger>
                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        <TabsTrigger value="villages">Top Villages</TabsTrigger>
                    </TabsList>

                    <TabsContent value="performance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Payment Rate by Channel</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={stats.channelPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="channel" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="delivery_rate" fill="#8b5cf6" name="Delivery %" />
                                        <Bar dataKey="payment_rate" fill="#10b981" name="Payment %" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="timeline">
                        <Card>
                            <CardHeader>
                                <CardTitle>Reminders & Payments Over Time</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={stats.timeline}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="reminders" stroke="#8b5cf6" strokeWidth={3} name="Reminders Sent" />
                                        <Line type="monotone" dataKey="payments" stroke="#10b981" strokeWidth={3} name="Payments Made" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="villages">
                        <Card>
                            <CardHeader>
                                <CardTitle>Top 10 Villages by Reminder Impact</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.topVillages.map((v: any, i: number) => (
                                        <div key={v.id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-bold text-purple-600">#{i+1}</span>
                                                <div>
                                                    <p className="text-xl font-semibold">{v.name}</p>
                                                    <p className="text-sm text-gray-600">{v.sector}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-600">
                                                    RWF {v.collected_after_reminder.toLocaleString()}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    from {v.reminders_sent} reminders
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="grid grid-cols-2 gap-8 mt-12">
                    <Card>
                        <CardHeader>
                            <CardTitle>Overall Delivery Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-7xl font-black text-purple-600">{stats.deliveryRate}%</p>
                                <p className="text-xl text-gray-600">Across all channels</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Conversion Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-7xl font-black text-green-600">{stats.paymentRate}%</p>
                                <p className="text-xl text-gray-600">Paid within 48h of reminder</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}