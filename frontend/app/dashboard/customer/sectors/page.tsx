// app/dashboard/customers/sectors/page.tsx — FINAL SECTORS INTELLIGENCE CENTER 2026
"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import {
    Building2, Users, DollarSign, TrendingUp, Target, AlertCircle,
    MapPin, Home, Activity, Plus, Edit, Trash2, Search, ArrowUpDown,
    ChevronDown, X, Calendar, BarChart3, PieChartIcon, FileText, Download, FileImage, FileSpreadsheet,
    Brush, Crown, UserCheck
} from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const ALLOWED_ROLES = ['admin', 'ceo', 'manager'];

export default function SectorsPage() {
    const router = useRouter();
    const [sectors, setSectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedSector, setSelectedSector] = useState<any>(null);
    const [villageModalOpen, setVillageModalOpen] = useState(false);

    // Form
    const [formData, setFormData] = useState({ name: "", code: "" });

    // Chart Refs
    const revenueChartRef = useRef<any>(null);
    const growthChartRef = useRef<any>(null);
    const riskChartRef = useRef<any>(null);
    const topSectorsChartRef = useRef<any>(null);
    const [villages, setVillages] = useState<any[]>([]);
    const [villageLoading, setVillageLoading] = useState(false);

    const [growthStats, setGrowthStats] = useState<any>({});
    const [growthLoading, setGrowthLoading] = useState(true);

    useEffect(() => {
        const role = Cookies.get("role")?.toLowerCase();
        if (!ALLOWED_ROLES.includes(role)) {
            setAccessDenied(true);
            toast.error("Access denied");
            setTimeout(() => router.push("/dashboard"), 2000);
            return;
        }

        fetchSectors();
    }, [router]);

    useEffect(() => {
        const fetchGrowth = async () => {
            setGrowthLoading(true);
            try {
                const res = await api.get("/customers/sectors/growth/");
                setGrowthStats(res.data);
            } catch (err) {
                toast.error("Failed to load growth analytics");
            } finally {
                setGrowthLoading(false);
            }
        };

        fetchGrowth();
    }, []);

    const fetchSectors = async () => {
        try {
            const res = await api.get("/customers/sectors/");
            const sectorData = res.data.results || res.data || [];
            if (!Array.isArray(sectorData)) {
                console.error("Expected array, got:", sectorData);
                setSectors([]);
            } else {
                setSectors(sectorData);
            }
        } catch (err) {
            toast.error("Failed to load sectors");
            setSectors([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchVillages = async (sectorId: number) => {
        setVillageLoading(true);
        try {
            const res = await api.get(`/customers/sectors/${sectorId}/villages/`);
            setVillages(res.data || []);
        } catch (err) {
            toast.error("Failed to load villages");
            setVillages([]);
        } finally {
            setVillageLoading(false);
        }
    };

    const filteredSectors = Array.isArray(sectors)
        ? sectors.filter(s =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const sortedSectors = [...filteredSectors].sort((a, b) => {
        if (!sortConfig) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: string) => {
        setSortConfig(current =>
            current?.key === key
                ? current.direction === 'asc' ? { key, direction: 'desc' } : null
                : { key, direction: 'asc' }
        );
    };

    const formatCurrency = (amount: number): string => {
        const cleanAmount = Math.round(amount * 100) / 100; // Eliminate floating-point errors

        if (cleanAmount >= 1_000_000_000_000) {
            return (cleanAmount / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
        }
        if (cleanAmount >= 1_000_000_000) {
            return (cleanAmount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (cleanAmount >= 1_000_000) {
            return (cleanAmount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (cleanAmount >= 1_000) {
            return (cleanAmount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return cleanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 });
    };

    // === EXPORT FUNCTIONS ===
    const exportChartToPDF = async (chartRef: any, title: string) => {
        if (!chartRef?.container) {
            toast.error("Chart not ready");
            return;
        }

        try {
            const canvas = await html2canvas(chartRef.container, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? "landscape" : "portrait",
                unit: "px",
                format: [canvas.width, canvas.height]
            });

            // Header
            pdf.setFillColor(88, 28, 135);
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 100, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(28);
            pdf.text("High Prosper Services Ltd", 60, 50);
            pdf.setFontSize(20);
            pdf.text(title, 60, 80);

            // Chart
            pdf.addImage(imgData, "PNG", 60, 140, canvas.width - 120, canvas.height - 240);

            // Footer
            const pageWidth = pdf.internal.pageSize.getWidth();
            pdf.setFillColor(88, 28, 135);
            pdf.rect(0, pdf.internal.pageSize.getHeight() - 80, pageWidth, 80, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 60, pdf.internal.pageSize.getHeight() - 40);
            pdf.text("High Prosper • Intelligence Engine 2026", pageWidth - 60, pdf.internal.pageSize.getHeight() - 40, { align: "right" });

            pdf.save(`${title.replace(/ /g, "_")}_HighProsper_${new Date().toISOString().slice(0,10)}.pdf`);
            toast.success(`${title} exported as PDF`);
        } catch (err) {
            toast.error("PDF export failed");
        }
    };

    const exportAllChartsToPDF = async () => {
        const pdf = new jsPDF("portrait", "pt", "a4");
        const charts = [
            { ref: revenueChartRef, title: "Revenue by Sector" },
            { ref: growthChartRef, title: "Customer Growth Trend" },
            { ref: riskChartRef, title: "Risk Distribution" },
            { ref: topSectorsChartRef, title: "Top 10 Performing Sectors" }
        ];

        let first = true;
        for (const chart of charts) {
            if (!chart.ref?.container) continue;

            if (!first) pdf.addPage();
            first = false;

            const canvas = await html2canvas(chart.ref.container, { scale: 1.8 });
            const imgData = canvas.toDataURL("image/png");

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 100;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Header
            pdf.setFillColor(88, 28, 135);
            pdf.rect(0, 0, pageWidth, 120, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.text("High Prosper Analytics Report", 60, 60);
            pdf.setFontSize(18);
            pdf.text(chart.title, 60, 100);

            // Chart
            pdf.addImage(imgData, "PNG", 50, 140, imgWidth, imgHeight);

            // Footer
            pdf.setFillColor(88, 28, 135);
            pdf.rect(0, pageHeight - 100, pageWidth, 100, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.text(`Page ${pdf.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 100, pageHeight - 50);
            pdf.text("© 2025 High Prosper Services Ltd • Vision 2026", 60, pageHeight - 50);
        }

        pdf.save(`HighProsper_Sectors_Full_Report_${new Date().toISOString().slice(0,10)}.pdf`);
        toast.success("Full analytics report exported as PDF!");
    };

    const handleAdd = async () => {
        try {
            await api.post("/customers/sectors/", formData);
            toast.success("Sector added successfully");
            setAddOpen(false);
            setFormData({ name: "", code: "" });
            fetchSectors();
        } catch (err) {
            toast.error("Failed to add sector");
        }
    };

    const handleEdit = async () => {
        try {
            await api.patch(`/customers/sectors/${selectedSector.id}/`, formData);
            toast.success("Sector updated");
            setEditOpen(false);
            fetchSectors();
        } catch (err) {
            toast.error("Failed to update");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/customers/sectors/${selectedSector.id}/`);
            toast.success("Sector deleted");
            setDeleteOpen(false);
            fetchSectors();
        } catch (err) {
            toast.error("Cannot delete — sector has customers");
        }
    };

    // Summary Stats
    const totalCustomers = sectors.reduce((sum, s) => sum + (s.customer_count || 0), 0);
    const totalRevenue = sectors.reduce((sum, s) => sum + (s.monthly_revenue || 0), 0);
    const totalBalance = sectors.reduce((sum, s) => sum + (s.total_balance || 0), 0);
    const avgRisk = sectors.length ? sectors.reduce((sum, s) => sum + (s.avg_risk || 0), 0) / sectors.length : 0;

    if (accessDenied) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
                <Card className="p-12 text-center bg-white/10 backdrop-blur">
                    <AlertCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
                    <h2 className="text-4xl font-bold text-white">Access Denied</h2>
                </Card>
            </div>
        );
    }

    if (loading) return <Loader fullScreen />;

    // Mock growth data for 2025
    const growthData = [
        { month: "Jan", customers: 1200, revenue: 24000000 },
        { month: "Feb", customers: 1350, revenue: 27000000 },
        { month: "Mar", customers: 1480, revenue: 29600000 },
        { month: "Apr", customers: 1620, revenue: 32400000 },
        { month: "May", customers: 1780, revenue: 35600000 },
        { month: "Jun", customers: 1950, revenue: 39000000 },
        { month: "Jul", customers: 2120, revenue: 42400000 },
        { month: "Aug", customers: 2280, revenue: 45600000 },
        { month: "Sep", customers: 2450, revenue: 49000000 },
        { month: "Oct", customers: 2620, revenue: 52400000 },
        { month: "Nov", customers: 2800, revenue: 56000000 },
        { month: "Dec", customers: sectors.reduce((s, sec) => s + (sec.customer_count || 0), 0), revenue: sectors.reduce((s, sec) => s + (sec.monthly_revenue || 0), 0) },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-slate-100 dark:from-gray-950 dark:via-purple-950 dark:to-slate-950 p-4 md:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">Sectors Intelligence Center</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Manage and analyze all sectors performance</p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={exportAllChartsToPDF} className="bg-gradient-to-r from-red-600 to-pink-600">
                            <FileText className="w-5 h-5 mr-2" /> Full Report PDF
                        </Button>
                        <Dialog open={addOpen} onOpenChange={setAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
                                    <Plus className="w-5 h-5 mr-2" /> Add Sector
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Sector</DialogTitle></DialogHeader>
                                {/* Form content */}
                                <div className="space-y-4">
                                    <div>
                                    <Label>Sector Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Kacyiru"
                                    />
                                </div>
                                <div>
                                    <Label>Sector Code (Optional)</Label>
                                    <Input
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="e.g. KCY"
                                    />
                                </div>
                                <Button onClick={handleAdd} className="w-full">Create Sector</Button>
                                </div>

                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Summary Cards - Compact & Dense */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-600 to-purple-800 hover:scale-105 transition-all">
                        <CardContent className="p-4 text-center">
                            <Building2 className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                            <p className="text-purple-200 text-xs">Total Sectors</p>
                            <p className="text-2xl font-black text-white">{sectors.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800 hover:scale-105 transition-all">
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 text-blue-200 mx-auto mb-2" />
                            <p className="text-blue-200 text-xs">Total Customers</p>
                            <p className="text-2xl font-black text-white">{totalCustomers.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    {/* Monthly Revenue Card */}
                    <Card className="bg-gradient-to-br from-green-600 to-green-800 hover:scale-105 transition-all shadow-lg">
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-8 h-8 text-green-200 mx-auto mb-2" />
                            <p className="text-green-200 text-xs font-medium">Monthly Revenue</p>
                            <p className="font-black text-white mt-2 leading-tight">
      <span className="text-3xl">
        RWF {formatCurrency(totalRevenue)}
      </span>
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Balance Card */}
                    <Card className="bg-gradient-to-br from-red-600 to-red-800 hover:scale-105 transition-all shadow-lg">
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-8 h-8 text-red-200 mx-auto mb-2" />
                            <p className="text-red-200 text-xs font-medium">Total Outstanding Balance</p>
                            <p className="font-black text-white mt-2 leading-tight">
      <span className="text-3xl">
        RWF {formatCurrency(Math.abs(totalBalance))}
      </span>
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-600 to-orange-800 hover:scale-105 transition-all">
                        <CardContent className="p-4 text-center">
                            <Activity className="w-8 h-8 text-orange-200 mx-auto mb-2" />
                            <p className="text-orange-200 text-xs">Avg Risk</p>
                            <p className="text-2xl font-black text-white">{avgRisk.toFixed(1)}%</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Advanced Analytics Charts with Fixed Brush & PDF Export */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                    {/* 1. Revenue by Sector */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" /> Revenue by Sector
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => exportChartToPDF(revenueChartRef, "Revenue by Sector")}>
                                    <FileText className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    ref={revenueChartRef}
                                    data={sectors.map(s => ({ name: s.name, revenue: s.monthly_revenue || 0 }))}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" fontSize={12} tickFormatter={(v) => `RWF ${Number(v).toLocaleString()}`} />
                                    <Tooltip
                                        contentStyle={{ background: "#1e1b4b", border: "2px solid #8b5cf6", borderRadius: "12px" }}
                                        labelStyle={{ color: "#8b5cf6", fontWeight: "bold" }}
                                        formatter={(value: number) => [`RWF ${value.toLocaleString()}`, "Revenue"]}
                                        cursor={{ fill: "rgba(139, 92, 246, 0.2)" }}
                                    />
                                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />

                                    {/* FIXED BRUSH: No dataKey + Custom Labels */}
                                    <Brush height={40} stroke="#8b5cf6" fill="#1e1b4b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 2. Growth Trend 2025 */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" /> Growth Trend 2025
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => exportChartToPDF(growthChartRef, "Customer Growth Trend")}>
                                    <FileText className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart ref={growthChartRef} data={growthData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="month" stroke="#ccc" fontSize={12} />
                                    <YAxis yAxisId="left" stroke="#10b981" fontSize={12} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
                                    <Tooltip contentStyle={{ background: "#1e1b4b", border: "2px solid #10b981" }} />
                                    <Line yAxisId="left" type="monotone" dataKey="customers" stroke="#10b981" strokeWidth={4} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} />
                                    <Legend />

                                    {/* FIXED BRUSH */}
                                    <Brush height={40} stroke="#10b981" fill="#1e1b4b" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3. Risk Distribution */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5" /> Risk Distribution
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => exportChartToPDF(riskChartRef, "Risk Distribution")}>
                                    <FileText className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart ref={riskChartRef}>
                                    <Pie
                                        data={[
                                            { name: "Low", value: sectors.filter(s => (s.avg_risk || 0) < 30).length },
                                            { name: "Medium", value: sectors.filter(s => (s.avg_risk || 0) >= 30 && (s.avg_risk || 0) < 60).length },
                                            { name: "High", value: sectors.filter(s => (s.avg_risk || 0) >= 60 && (s.avg_risk || 0) < 80).length },
                                            { name: "Critical", value: sectors.filter(s => (s.avg_risk || 0) >= 80).length },
                                        ]}
                                        cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={5} dataKey="value"
                                    >
                                        {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: "#1e1b4b", border: "2px solid #f59e0b" }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 4. Top 10 Sectors */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700 lg:col-span-2 xl:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl text-white flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Top 10 Sectors
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => exportChartToPDF(topSectorsChartRef, "Top 10 Sectors")}>
                                    <FileText className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart
                                    ref={topSectorsChartRef}
                                    data={sectors
                                        .sort((a, b) => (b.customer_count || 0) - (a.customer_count || 0))
                                        .slice(0, 20)
                                        .map(s => ({ name: s.name, customers: s.customer_count || 0 }))
                                    }
                                    layout="horizontal"
                                    margin={{ top: 20, right: 30, left: 120, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis type="number" stroke="#ccc" fontSize={12} />
                                    <YAxis dataKey="name" type="category" stroke="#ccc" fontSize={12} width={140} />
                                    <Tooltip contentStyle={{ background: "#1e1b4b", border: "2px solid #3b82f6" }} />
                                    <Bar dataKey="customers" fill="#3b82f6" radius={[0, 8, 8, 0]} />

                                    {/* FIXED BRUSH */}
                                    <Brush height={40} stroke="#3b82f6" fill="#1e1b4b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Real-Time Customer Growth Analytics 2025 - Village Breakdown */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700 lg:col-span-2 xl:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl text-white flex items-center gap-3">
                                    <TrendingUp className="w-7 h-7 text-green-400" />
                                    Customer Growth Analytics 2025
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => exportChartToPDF(growthChartRef, "Customer Growth 2025")}>
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-purple-300 text-sm mt-2">
                                New customers per village • Total 2025: <span className="font-bold text-cyan-300">{growthStats.total_new_2025 || 0}</span> new customers
                            </p>
                        </CardHeader>
                        <CardContent>
                            {growthLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={500}>
                                    <LineChart ref={growthChartRef} data={growthStats.growth_data || []}>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#444" opacity={0.5} />
                                        <XAxis dataKey="month" stroke="#ccc" fontSize={14} />
                                        <YAxis stroke="#e0e0e0" fontSize={14} />
                                        <Tooltip
                                            contentStyle={{ background: "#1e1b4b", border: "2px solid #8b5cf6", borderRadius: "12px" }}
                                            labelStyle={{ color: "#8b5cf6", fontWeight: "bold" }}
                                            formatter={(value: number) => value.toLocaleString()}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: "20px" }} />

                                        {/* Dynamic Lines for Each Village */}
                                        {growthStats.top_villages?.map((village: any, index: number) => (
                                            <Line
                                                key={village.name}
                                                type="monotone"
                                                dataKey={village.name}
                                                stroke={COLORS[index % COLORS.length]}
                                                strokeWidth={3}
                                                dot={{ r: 5 }}
                                                activeDot={{ r: 8 }}
                                                name={`${village.name} (+${village.total_new})`}
                                            />
                                        ))}

                                        {/* Others Line */}
                                        <Line
                                            type="monotone"
                                            dataKey="Others"
                                            stroke="#6b7280"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            name="Others"
                                        />

                                        <Brush height={50} stroke="#8b5cf6" fill="#1e1b4b" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}

                            {/* Top Growing Villages */}
                            <div className="mt-8">
                                <h3 className="text-xl font-bold text-white mb-4">Top Growing Villages 2025</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {growthStats.top_villages?.slice(0, 6).map((village: any, index: number) => (
                                        <div
                                            key={village.name}
                                            className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-4 border border-purple-600 hover:border-purple-400 transition-all"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-purple-200 text-sm">#{index + 1}</p>
                                                    <p className="text-white font-bold text-lg">{village.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-cyan-400">+{village.total_new}</p>
                                                    <p className="text-purple-300 text-xs">new customers</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search sectors..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3"
                        />
                    </div>
                </div>

                {/* Sectors Table - Ultra Dense & Clickable */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-purple-700/50">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white sticky top-0">
                                <tr>
                                    <th
                                        className="text-left py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            Sector
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th className="text-center py-4 px-6 font-bold">Code</th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('cell_count')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Managers
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'cell_count' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('cell_count')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Supervisors
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'cell_count' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('cell_count')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Cells
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'cell_count' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('village_count')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Villages
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'village_count' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('customer_count')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Customers
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'customer_count' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th
                                        className="text-center py-4 px-6 font-bold cursor-pointer hover:bg-purple-700/50 transition-all"
                                        onClick={() => handleSort('monthly_revenue')}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            Revenue
                                            <ArrowUpDown className={`w-4 h-4 transition-transform ${sortConfig?.key === 'monthly_revenue' ? (sortConfig.direction === 'asc' ? 'rotate-180' : '') : ''}`} />
                                        </div>
                                    </th>
                                    <th className="text-center py-4 px-6 font-bold">Balance</th>
                                    <th className="text-center py-4 px-6 font-bold">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedSectors.map((sector) => (
                                    <tr
                                        key={sector.id}
                                        className="border-b border-purple-800/30 hover:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-all cursor-pointer group"
                                        onClick={(e) => {
                                            // Prevent click if target is a button
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            setSelectedSector(sector);
                                            fetchVillages(sector.id);
                                            setVillageModalOpen(true);
                                        }}
                                    >
                                        <td className="py-4 px-6 font-semibold text-purple-100">
                                            {sector.name}
                                        </td>
                                        <td className="text-center py-4 px-6 text-gray-300">
                                            {sector.code || "-"}
                                        </td>
                                        {/* Managers */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                {sector.managers?.length > 0 ? (
                                                    sector.managers.map((m: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <Crown className="w-4 h-4 text-yellow-500" />
                                                            <span className="font-medium">{m.name}</span>
                                                            {m.phone && (
                                                                <>
                                                                    <a href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()} className="text-green-400">
                                                                        📞
                                                                    </a>
                                                                    <a href={`https://wa.me/${m.phone.replace(/\+/g, '')}`} onClick={(e) => e.stopPropagation()} target="_blank" className="text-green-500">
                                                                        💬
                                                                    </a>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-500 italic">No Manager</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Supervisors */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                {sector.supervisors?.length > 0 ? (
                                                    sector.supervisors.map((s: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <UserCheck className="w-4 h-4 text-blue-500" />
                                                            <span className="font-medium">{s.name}</span>
                                                            {s.phone && (
                                                                <>
                                                                    <a href={`tel:${s.phone}`} onClick={(e) => e.stopPropagation()} className="text-green-400">
                                                                        📞
                                                                    </a>
                                                                    <a href={`https://wa.me/${s.phone.replace(/\+/g, '')}`} onClick={(e) => e.stopPropagation()} target="_blank" className="text-green-500">
                                                                        💬
                                                                    </a>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-500 italic">No Supervisor</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center py-4 px-6 font-medium">
                                            {sector.cell_count || 0}
                                        </td>
                                        <td className="text-center py-4 px-6 font-medium text-cyan-300">
                                            {sector.village_count || 0}
                                        </td>
                                        <td className="text-center py-4 px-6 font-bold text-xl text-white">
                                            {sector.customer_count || 0}
                                        </td>
                                        <td className="text-center py-4 px-6">
  <span className="font-bold text-lg text-green-400">
    RWF {formatCurrency(sector.monthly_revenue || 0)}
  </span>
                                        </td>

                                        <td className="text-center py-4 px-6">
  <span className={`font-bold text-lg ${
      sector.total_balance > 0
          ? "text-red-400"
          : sector.total_balance < 0
              ? "text-green-400"
              : "text-gray-400"
  }`}>
    RWF {formatCurrency(Math.abs(sector.total_balance || 0))}
  </span>
                                        </td>
                                        <td className="text-center py-4 px-6">
                                            <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-cyan-300 hover:text-cyan-100 hover:bg-cyan-900/30"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSector(sector);
                                                        fetchVillages(sector.id);
                                                        setVillageModalOpen(true);
                                                    }}
                                                >
                                                    <MapPin className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-blue-300 hover:text-blue-100 hover:bg-blue-900/30"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSector(sector);
                                                        setFormData({ name: sector.name, code: sector.code || "" });
                                                        setEditOpen(true);
                                                    }}
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSector(sector);
                                                        setDeleteOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                            {/* Always visible on mobile */}
                                            <div className="flex items-center justify-center gap-2 md:hidden">
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); fetchVillages(sector.id); setVillageModalOpen(true); }}>
                                                    <MapPin className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Advanced Village Analytics Modal */}
                <Dialog open={villageModalOpen} onOpenChange={setVillageModalOpen}>
                    <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                        <DialogHeader className="p-6 pb-4 border-b border-purple-700 bg-gradient-to-r from-purple-900 to-pink-900">
                            <DialogTitle className="text-3xl font-black">
                                {selectedSector?.name} Sector Leadership & Villages
                            </DialogTitle>
                            <p className="text-purple-200 mt-2">
                                {selectedSector?.village_count || 0} villages • {selectedSector?.customer_count || 0} customers
                            </p>
                        </DialogHeader>

                        {/* Leadership Section */}
                        <div className="p-6 bg-purple-50 dark:bg-purple-900/30">
                            <h3 className="text-2xl font-bold mb-6">Sector Leadership</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Managers */}
                                <div>
                                    <h4 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <Crown className="w-6 h-6 text-yellow-500" /> Managers
                                    </h4>
                                    {selectedSector?.managers?.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedSector.managers.map((m: any, i: number) => (
                                                <Card key={i} className="p-4 bg-white dark:bg-gray-800">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-lg">{m.name}</p>
                                                            <p className="text-sm text-gray-600">{m.email}</p>
                                                        </div>
                                                        {m.phone && (
                                                            <div className="flex gap-3">
                                                                <a href={`tel:${m.phone}`} className="p-3 bg-green-600 rounded-full hover:bg-green-700">
                                                                    📞
                                                                </a>
                                                                <a href={`https://wa.me/${m.phone.replace(/\+/g, '')}`} target="_blank" className="p-3 bg-green-500 rounded-full hover:bg-green-600">
                                                                    💬
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No managers assigned</p>
                                    )}
                                </div>

                                {/* Supervisors */}
                                <div>
                                    <h4 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                        <UserCheck className="w-6 h-6 text-blue-500" /> Supervisors
                                    </h4>
                                    {selectedSector?.supervisors?.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedSector.supervisors.map((s: any, i: number) => (
                                                <Card key={i} className="p-4 bg-white dark:bg-gray-800">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-lg">{s.name}</p>
                                                            <p className="text-sm text-gray-600">{s.email}</p>
                                                        </div>
                                                        {s.phone && (
                                                            <div className="flex gap-3">
                                                                <a href={`tel:${s.phone}`} className="p-3 bg-green-600 rounded-full hover:bg-green-700">
                                                                    📞
                                                                </a>
                                                                <a href={`https://wa.me/${s.phone.replace(/\+/g, '')}`} target="_blank" className="p-3 bg-green-500 rounded-full hover:bg-green-600">
                                                                    💬
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">No supervisors assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {villageLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500"></div>
                                </div>
                            ) : villages.length === 0 ? (
                                <div className="text-center py-16">
                                    <MapPin className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                                    <p className="text-xl text-gray-500">No villages found in this sector</p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-purple-900/50 sticky top-0">
                                                <tr>
                                                    <th className="text-left py-4 px-6 font-bold">Village</th>
                                                    <th className="text-left py-4 px-6 font-bold">Collector</th>
                                                    <th className="text-left py-4 px-6 font-bold">Cell</th>
                                                    <th className="text-center py-4 px-6 font-bold">Customers</th>
                                                    <th className="text-right py-4 px-6 font-bold">Monthly (RWF)</th>
                                                    <th className="text-right py-4 px-6 font-bold">Collected</th>
                                                    <th className="text-right py-4 px-6 font-bold">Outstanding</th>
                                                    <th className="text-center py-4 px-6 font-bold">New This Month</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {villages.map((village) => (
                                                    <tr key={village.id} className="border-b border-purple-800 hover:bg-purple-900/20 transition-all">
                                                        <td className="py-4 px-6 font-semibold">{village.name}</td>
                                                        <td className="py-4 px-6 text-purple-300">{village.collectors || "Unassigned"}</td>
                                                        <td className="py-4 px-6 text-gray-400">{village.cell}</td>
                                                        <td className="text-center py-4 px-6 font-bold text-xl">{village.customer_count}</td>
                                                        <td className="text-right py-4 px-6 text-green-400 font-semibold">
                                                            {village.monthly_revenue.toLocaleString()}
                                                        </td>
                                                        <td className="text-right py-4 px-6 text-cyan-400 font-semibold">
                                                            {village.collected_this_month?.toLocaleString() || "0"}
                                                        </td>
                                                        <td className="text-right py-4 px-6 font-semibold">
                        <span className={village.total_balance > 0 ? "text-red-400" : "text-green-400"}>
                          {Math.abs(village.total_balance).toLocaleString()}
                        </span>
                                                        </td>
                                                        <td className="text-center py-4 px-6">
                                                            <div className="flex flex-col items-center">
                                                                <Badge
                                                                    className={`font-bold px-4 py-2 text-lg ${
                                                                        (village.new_this_month || 0) > 5
                                                                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl"
                                                                            : (village.new_this_month || 0) > 0
                                                                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                                                                                : "bg-gray-700 text-gray-300"
                                                                    }`}
                                                                >
                                                                    +{village.new_this_month || 0}
                                                                </Badge>
                                                                <span className="text-xs text-gray-400 mt-1">New this month</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Mobile Card List */}
                                    <div className="md:hidden space-y-4 p-4">
                                        {villages.map((village) => (
                                            <Card key={village.id} className="bg-purple-900/30 border-purple-700 hover:border-purple-500 transition-all">
                                                <CardContent className="p-5">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-white">{village.name}</h3>
                                                            <p className="text-purple-300 text-sm mt-1">{village.cell}</p>
                                                        </div>
                                                        <Badge variant="outline" className="text-cyan-300 border-cyan-600">
                                                            {village.customer_count} customers
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-400">Collector</p>
                                                            <p className="font-medium text-purple-200">{village.collectors || "Unassigned"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-400 text-xs">New This Month</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className={`inline-flex items-center px-3 py-1.5 rounded-full font-bold text-sm shadow-lg transition-all ${
                                                                    (village.new_this_month || 0) > 10
                                                                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white animate-pulse"
                                                                        : (village.new_this_month || 0) > 5
                                                                            ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                                                                            : (village.new_this_month || 0) > 0
                                                                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                                                                : "bg-gray-700 text-gray-300"
                                                                }`}>
                                                                    <TrendingUp className="w-4 h-4 mr-1" />
                                                                    +{village.new_this_month || 0}
                                                                </div>
                                                                {(village.new_this_month || 0) > 0 && (
                                                                    <span className="text-xs text-green-400 font-medium animate-fade-in">
        ↑ Growth
      </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-400">Monthly Revenue</p>
                                                            <p className="font-bold text-green-400">RWF {village.monthly_revenue.toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-400">Outstanding</p>
                                                            <p className={`font-bold ${village.total_balance > 0 ? "text-red-400" : "text-green-400"}`}>
                                                                RWF {Math.abs(village.total_balance).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Modal */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Sector</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Sector Name</Label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <Label>Code</Label>
                                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                            </div>
                            <Button onClick={handleEdit} className="w-full">Update Sector</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Sector?</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to delete <strong>{selectedSector?.name}</strong>? This cannot be undone.</p>
                        <div className="flex gap-3 mt-6">
                            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}