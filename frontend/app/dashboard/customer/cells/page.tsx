// app/dashboard/customer/cells/page.tsx — FINAL CELLS INTELLIGENCE CENTER 2026
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
    Users, DollarSign, TrendingUp, MapPin, Plus, Edit, Trash2,
    Search, ArrowUpDown, Download, FileText, BarChart3, PieChartIcon, AlertCircle
} from "lucide-react";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush
} from "recharts";
import { BuildingOffice2Icon } from "@heroicons/react/24/solid";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const ALLOWED_ROLES = ['admin', 'ceo', 'manager'];

export default function CellsPage() {
    const router = useRouter();
    const [cells, setCells] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<any>(null);
    const [villageModalOpen, setVillageModalOpen] = useState(false);
    const [villages, setVillages] = useState<any[]>([]);
    const [villageLoading, setVillageLoading] = useState(false);

    // Form
    const [formData, setFormData] = useState({ name: "", code: "", sector_id: "" });

    // Chart refs
    const revenueChartRef = useRef<any>(null);
    const growthChartRef = useRef<any>(null);
    const riskChartRef = useRef<any>(null);
    const topVillagesChartRef = useRef<any>(null);

    useEffect(() => {
        const role = Cookies.get("role")?.toLowerCase();
        if (!ALLOWED_ROLES.includes(role)) {
            setAccessDenied(true);
            toast.error("Access denied");
            setTimeout(() => router.push("/dashboard"), 2000);
            return;
        }

        Promise.all([fetchCells(), fetchSectors()]);
    }, [router]);

    const fetchCells = async () => {
        try {
            const res = await api.get("/customers/cells/");
            setCells(res.data.results || res.data || []);
        } catch (err) {
            toast.error("Failed to load cells");
        } finally {
            setLoading(false);
        }
    };

    const fetchSectors = async () => {
        try {
            const res = await api.get("/customers/sectors/");
            setSectors(res.data.results || res.data || []);
        } catch (err) {
            console.error("Failed to load sectors");
        }
    };

    const fetchVillagesInCell = async (cellId: number) => {
        setVillageLoading(true);
        try {
            const res = await api.get(`/customers/cells/${cellId}/villages/`);
            setVillages(res.data || []);
        } catch (err) {
            toast.error("Failed to load villages");
            setVillages([]);
        } finally {
            setVillageLoading(false);
        }
    };

    const filteredCells = cells.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sector_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedCells = [...filteredCells].sort((a, b) => {
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

    const handleAdd = async () => {
        try {
            await api.post("/customers/cells/", formData);
            toast.success("Cell added successfully");
            setAddOpen(false);
            setFormData({ name: "", code: "", sector_id: "" });
            fetchCells();
        } catch (err) {
            toast.error("Failed to add cell");
        }
    };

    const handleEdit = async () => {
        try {
            await api.patch(`/customers/cells/${selectedCell.id}/`, formData);
            toast.success("Cell updated");
            setEditOpen(false);
            fetchCells();
        } catch (err) {
            toast.error("Failed to update");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/customers/cells/${selectedCell.id}/`);
            toast.success("Cell deleted");
            setDeleteOpen(false);
            fetchCells();
        } catch (err) {
            toast.error("Cannot delete — cell has villages");
        }
    };

    const formatLargeNumber = (num: number): string => {
        if (num >= 1_000_000_000_000) {
            return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
        }
        if (num >= 1_000_000_000) {
            return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1_000) {
            return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toLocaleString();
    };

    const formatCurrency = (amount: number): string => {
        // Clean floating-point errors
        const cleanAmount = Math.round(amount * 100) / 100;

        // Smart abbreviation for large numbers
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
            { ref: revenueChartRef, title: "Revenue by Cell" },
            { ref: growthChartRef, title: "Customer Growth Trend" },
            { ref: riskChartRef, title: "Risk Distribution" },
            { ref: topVillagesChartRef, title: "Top 10 Performing Cells" }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-slate-100 dark:from-gray-950 dark:via-purple-950 dark:to-slate-950 p-4 md:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">Cells Intelligence Center</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Deep analytics & management at cell level</p>
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                                <Plus className="w-5 h-5 mr-2" /> Add Cell
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New Cell</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Cell Name</Label>
                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Code (Optional)</Label>
                                    <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                                </div>
                                <div>
                                    <Label>Sector</Label>
                                    <Select value={formData.sector_id} onValueChange={(v) => setFormData({ ...formData, sector_id: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select sector" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sectors.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAdd} className="w-full">Create Cell</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-600 to-purple-800">
                        <CardContent className="p-4 text-center">
                            <BuildingOffice2Icon className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                            <p className="text-purple-200 text-xs">Total Cells</p>
                            <p className="text-2xl font-black text-white">{cells.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800">
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 text-blue-200 mx-auto mb-2" />
                            <p className="text-blue-200 text-xs">Total Customers</p>
                            <p className="text-2xl font-black text-white">{cells.reduce((s, c) => s + (c.customer_count || 0), 0).toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600 to-green-800 hover:scale-105 transition-all shadow-lg">
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-8 h-8 text-green-200 mx-auto mb-2" />
                            <p className="text-green-200 text-xs font-medium">Monthly Revenue</p>

                            {/* Smart Formatted Revenue */}
                            <p className="font-black text-white mt-2 leading-tight">
      <span className="text-3xl">
        RWF {formatCurrency(
          cells.reduce((sum, cell) => sum + Number(cell.monthly_revenue || 0), 0)
      )}
      </span>
                            </p>
                        </CardContent>
                    </Card>
                    {/* Add more summary cards as needed */}
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search cells..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3"
                        />
                    </div>
                </div>

                {/* Cells Table - Clickable Rows */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort('name')}>
                                        Cell <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold">Code</th>
                                    <th className="text-center py-3 px-4 font-semibold">Sector</th>
                                    <th className="text-center py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort('village_count')}>
                                        Villages <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort('customer_count')}>
                                        Customers <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold cursor-pointer" onClick={() => handleSort('monthly_revenue')}>
                                        Revenue <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold">Balance</th>
                                    <th className="text-center py-3 px-4 font-semibold">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedCells.map((cell) => (
                                    <tr
                                        key={cell.id}
                                        className="border-b hover:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-all cursor-pointer group"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('button')) return;
                                            setSelectedCell(cell);
                                            fetchVillagesInCell(cell.id);
                                            setVillageModalOpen(true);
                                        }}
                                    >
                                        <td className="py-3 px-4 font-medium">{cell.name}</td>
                                        <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">{cell.code || "-"}</td>
                                        <td className="text-center py-3 px-4 text-purple-300">{cell.sector_name}</td>
                                        <td className="text-center py-3 px-4">{cell.village_count || 0}</td>
                                        <td className="text-center py-3 px-4 font-semibold">{cell.customer_count || 0}</td>
                                        <td className="text-center py-3 px-4 font-bold text-green-600 dark:text-green-400 text-lg">
                                            RWF {formatCurrency(cell.monthly_revenue || 0)}
                                        </td>

                                        <td className="text-center py-3 px-4">
  <span className={`font-bold text-lg ${cell.total_balance > 0 ? "text-red-600 dark:text-red-400" : cell.total_balance < 0 ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
    RWF {formatCurrency(Math.abs(cell.total_balance || 0))}
  </span>
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); fetchVillagesInCell(cell.id); setVillageModalOpen(true); }}>
                                                    <MapPin className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCell(cell); setFormData({ name: cell.name, code: cell.code || "", sector_id: cell.sector_id }); setEditOpen(true); }}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCell(cell); setDeleteOpen(true); }}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
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
                            <DialogTitle className="text-2xl font-black text-white">
                                Villages in <span className="text-cyan-300">{selectedCell?.name || "Sector"}</span>
                            </DialogTitle>
                            <p className="text-purple-200 mt-2">
                                {selectedCell?.village_count || 0} villages • {selectedCell?.customer_count || 0} customers
                            </p>
                        </DialogHeader>

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
                            <Button onClick={handleEdit} className="w-full">Update Cell</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirm */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Sector?</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to delete <strong>{selectedCell?.name}</strong>? This cannot be undone.</p>
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