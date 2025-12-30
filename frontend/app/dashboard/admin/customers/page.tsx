// app/dashboard/admin/customers/page.tsx — FINAL CLEAN VERSION
"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import api from "@/lib/api";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
    Users, TrendingUp, DollarSign, AlertTriangle, Target, Brain,
    FileText, Activity, Send, Bot, Menu, MapPin as MapPinIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Loader from "@/components/Loader";
import VillagePerformanceTable from "@/components/admin/VillagePerformanceTable";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export default function CustomerAnalyticsDashboard() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState<any>({});
    const [trendData, setTrendData] = useState<any[]>([]);
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([
        { role: "ai", content: "Hello! I'm your High Prosper AI analyst. Ask me anything about customers, villages, risk, or growth." }
    ]);
    const [input, setInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await api.get("/customers/stats/");
                setStats(statsRes.data);

                // Mock trend & forecast (replace with real data later)
                const months = [];
                for (let i = 11; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    months.push({
                        month: format(date, "MMM yyyy"),
                        new: Math.floor(Math.random() * 80) + 20,
                        active: Math.floor(Math.random() * 400) + 300,
                        overdue: Math.floor(Math.random() * 50) + 10
                    });
                }
                setTrendData(months);

                setForecastData([
                    { month: "Jan 2026", baseline: 2400000000, optimized: 2800000000 },
                    { month: "Feb 2026", baseline: 2450000000, optimized: 3100000000 },
                    { month: "Mar 2026", baseline: 2500000000, optimized: 3500000000 },
                ]);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const exportToPDF = async () => {
        if (!dashboardRef.current) return;
        const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: "#0f172a" });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`HighProsper_Analytics_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    const askAI = async () => {
        if (!input.trim()) return;
        setMessages(prev => [...prev, { role: "user", content: input }]);
        setAiLoading(true);

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: "ai", content: "AI response: This is a mock answer. Replace with real API." }]);
            setAiLoading(false);
        }, 1000);

        setInput("");
    };

    if (loading) return <Loader fullScreen />;

    const totalCustomers = stats.summary?.totalCustomers || 0;
    const activeCustomers = stats.summary?.active || 0;
    const totalBalance = stats.summary?.totalBalance || 0;
    const newThisMonth = stats.summary?.newThisMonth || 0;

    const kpis = [
        { label: "Total Customers", value: totalCustomers.toLocaleString(), icon: Users, color: "text-purple-600" },
        { label: "Active Customers", value: activeCustomers.toLocaleString(), icon: Activity, color: "text-green-600" },
        { label: "Total Outstanding", value: `RWF ${Math.abs(totalBalance).toLocaleString()}`, icon: DollarSign, color: totalBalance > 0 ? "text-red-600" : "text-green-600" },
        { label: "New This Month", value: `+${newThisMonth}`, icon: TrendingUp, color: "text-blue-600" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Navbar */}
            <nav className="bg-black/60 backdrop-blur-lg border-b border-purple-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
                                <h1 className="text-2xl font-bold text-white">High Prosper Analytics</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button onClick={exportToPDF} className="bg-gradient-to-r from-purple-600 to-blue-600">
                                <FileText className="w-5 h-5 mr-2" />
                                Export PDF Report
                            </Button>
                            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="md:hidden">
                                        <Menu className="w-6 h-6 text-white" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="bg-slate-900 border-purple-800">
                                    <SidebarContent currentPage="customers" />
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex">
                <aside className="hidden md:block w-64 bg-black/30 backdrop-blur-lg border-r border-purple-800 min-h-screen">
                    <SidebarContent currentPage="customers" />
                </aside>

                <main className="flex-1 p-8">
                    <div ref={dashboardRef}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                            {/* Header */}
                            <div className="text-center">
                                <h1 className="text-6xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                                    CUSTOMER INTELLIGENCE CENTER
                                </h1>
                                <p className="text-2xl text-purple-300 mt-4">
                                    Real-time insights • AI recommendations • Growth forecasting
                                </p>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {kpis.map((kpi, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                                        <Card className="bg-white/10 backdrop-blur-lg border-purple-700 hover:border-purple-500 transition">
                                            <CardContent className="p-8">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-purple-300 text-lg">{kpi.label}</p>
                                                        <p className="text-5xl font-black text-white mt-4">{kpi.value}</p>
                                                    </div>
                                                    <kpi.icon className={`w-16 h-16 ${kpi.color} opacity-80`} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Village Performance Table - Imported */}
                            <div className="mt-12">
                                <VillagePerformanceTable />
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-3xl text-white">Growth Trend</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <LineChart data={trendData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                                <XAxis dataKey="month" stroke="#ccc" />
                                                <YAxis stroke="#ccc" />
                                                <Tooltip contentStyle={{ background: "#1e1b4b", border: "1px solid #8b5cf6" }} />
                                                <Legend />
                                                <Line type="monotone" dataKey="new" stroke="#8b5cf6" strokeWidth={4} name="New Customers" />
                                                <Line type="monotone" dataKey="active" stroke="#10b981" strokeWidth={4} name="Active" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-3xl text-white">Risk Distribution</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie data={[
                                                    { name: "Low", value: 65 },
                                                    { name: "Medium", value: 20 },
                                                    { name: "High", value: 10 },
                                                    { name: "Critical", value: 5 }
                                                ]} cx="50%" cy="50%" outerRadius={120} dataKey="value">
                                                    {[65,20,10,5].map((_, i) => (
                                                        <Cell key={i} fill={COLORS[i]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Revenue Forecast */}
                            <Card className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-700">
                                <CardHeader>
                                    <CardTitle className="text-4xl text-white flex items-center gap-4">
                                        <TrendingUp className="w-12 h-12 text-green-400" />
                                        REVENUE FORECAST Q1 2026
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={forecastData}>
                                            <CartesianGrid stroke="#444" />
                                            <XAxis dataKey="month" stroke="#ccc" />
                                            <YAxis stroke="#ccc" formatter={(v) => `RWF ${(v / 1000000000).toFixed(1)}B`} />
                                            <Tooltip formatter={(v: number) => `RWF ${(v / 1000000000).toFixed(2)}B`} />
                                            <Legend />
                                            <Line type="monotone" dataKey="baseline" stroke="#f59e0b" strokeWidth={4} name="Current Path" />
                                            <Line type="monotone" dataKey="optimized" stroke="#10b981" strokeWidth={5} name="With AI Actions" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                    <div className="grid grid-cols-2 gap-8 mt-8 text-center">
                                        <div>
                                            <p className="text-yellow-300 text-2xl">Current Trajectory</p>
                                            <p className="text-6xl font-black text-yellow-400 mt-4">RWF 7.35B</p>
                                        </div>
                                        <div>
                                            <p className="text-green-300 text-2xl">Optimized with AI Plan</p>
                                            <p className="text-7xl font-black text-green-400 mt-4">RWF 9.4B</p>
                                            <p className="text-green-300 text-3xl mt-2">+28% ↑</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Chat */}
                            <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-700">
                                <CardHeader>
                                    <CardTitle className="text-3xl text-white flex items-center gap-4">
                                        <Bot className="w-10 h-10" />
                                        AI Analyst — Ask Me Anything
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-96 flex flex-col">
                                    <ScrollArea className="flex-1 pr-4">
                                        <div className="space-y-4">
                                            {messages.map((m, i) => (
                                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-lg p-4 rounded-2xl ${
                                                        m.role === 'user'
                                                            ? 'bg-purple-600 text-white'
                                                            : 'bg-white/10 text-white border border-purple-700'
                                                    }`}>
                                                        {m.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {aiLoading && <p className="text-purple-300">AI is thinking...</p>}
                                        </div>
                                    </ScrollArea>
                                    <div className="flex gap-3 mt-4">
                                        <Input
                                            placeholder="e.g. Why is Nyamata high risk?"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && askAI()}
                                            className="flex-1"
                                        />
                                        <Button onClick={askAI} disabled={aiLoading}>
                                            <Send className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarContent({ currentPage }: { currentPage: string }) {
    const items = [
        { icon: Users, label: "Customers", href: "/dashboard/admin/customers", active: currentPage === "customers" },
        { icon: MapPinIcon, label: "Village Performance", href: "/dashboard/admin/villages", active: currentPage === "villages" },
        { icon: DollarSign, label: "Collections", href: "/dashboard/admin/collections" },
        { icon: TrendingUp, label: "Analytics", href: "/dashboard/admin/analytics" },
    ];

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl" />
                <div>
                    <h2 className="text-3xl font-bold text-white">High Prosper</h2>
                    <p className="text-purple-400">Admin Portal</p>
                </div>
            </div>
            <nav className="space-y-3">
                {items.map((item) => (
                    <Button
                        key={item.label}
                        asChild
                        variant={item.active ? "secondary" : "ghost"}
                        className={`w-full justify-start text-xl py-6 ${item.active ? "bg-purple-600 text-white shadow-lg" : "text-purple-300 hover:text-white hover:bg-purple-900/50"}`}
                    >
                        <a href={item.href}>
                            <item.icon className="w-8 h-8 mr-4" />
                            {item.label}
                        </a>
                    </Button>
                ))}
            </nav>
        </div>
    );
}