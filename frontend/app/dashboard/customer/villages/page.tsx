// app/dashboard/customer/villages/page.tsx — FINAL VILLAGES DASHBOARD 2026
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import {
    MapPin, Users, DollarSign, TrendingUp, Target, Plus, Edit, Trash2,
    Search, ArrowUpDown, Download, FileText, Calendar, BarChart3, PieChartIcon, AlertCircle, FileSpreadsheet,
    Crown
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
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush,
    RadarChart, PolarRadiusAxis, PolarGrid, Radar,
    PolarAngleAxis
} from "recharts";
import { MultiCollectorSelect } from "@/components/multi-collector-select";
import {cn} from "@/lib/utils";

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
const ALLOWED_ROLES = ['admin', 'ceo', 'manager'];
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const formatCurrency = (amount: number): string => {
    const cleanAmount = Math.round(amount * 100) / 100;
    if (cleanAmount >= 1_000_000_000_000) return (cleanAmount / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 'T';
    if (cleanAmount >= 1_000_000_000) return (cleanAmount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (cleanAmount >= 1_000_000) return (cleanAmount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (cleanAmount >= 1_000) return (cleanAmount / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return cleanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const parseCollectorString = (collectorStr: string) => {
    const str = collectorStr.trim();

    // First: try parentheses (recommended format)
    const parenMatch = str.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (parenMatch) {
        const name = parenMatch[1].trim();
        const phone = parenMatch[2].replace(/[^\d+]/g, '');
        return { name, phone };
    }

    // Second: try — separator (your current format)
    const dashMatch = str.match(/^(.+?)\s*—\s*(.+)$/);
    if (dashMatch) {
        const name = dashMatch[1].trim();
        const phone = dashMatch[2].replace(/[^\d+]/g, '');
        return { name, phone };
    }

    // Fallback
    return { name: str, phone: "" };
};

export default function VillagesPage() {
    const router = useRouter();
    const [villages, setVillages] = useState<any[]>([]);
    const [cells, setCells] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedVillage, setSelectedVillage] = useState<any>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        name: "",
        cell_id: "",
        gps_coordinates: "",
        collector_ids: [] as string[],
        monthly_revenue_target: 0,
        monthly_new_customers_target: 0
    });

    // Chart refs
    const revenueChartRef = useRef<any>(null);
    const growthChartRef = useRef<any>(null);
    const topVillagesChartRef = useRef<any>(null);

    // Chart data
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [growthData, setGrowthData] = useState<any[]>([]);
    const [topVillagesData, setTopVillagesData] = useState<any[]>([]);
    const [chartLoading, setChartLoading] = useState(true);

    // Summary
    const totalVillages = villages.length;
    const totalCustomers = villages.reduce((s, v) => s + (v.customer_count || 0), 0);
    const totalRevenueTarget = villages.reduce((s, v) => s + (v.monthly_revenue_target || 0), 0);
    const totalCollected = villages.reduce((s, v) => s + (v.collected_this_month || 0), 0);
    const totalNewCustomersTarget = villages.reduce((s, v) => s + (v.monthly_new_customers_target || 0), 0);
    const totalNewCustomers = villages.reduce((s, v) => s + (v.new_customers_this_month || 0), 0);
    const [collectors, setCollectors] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false); // Add this state at top

    useEffect(() => {
        const role = Cookies.get("role")?.toLowerCase();
        if (!ALLOWED_ROLES.includes(role)) {
            setAccessDenied(true);
            toast.error("Access denied");
            setTimeout(() => router.push("/dashboard"), 2000);
            return;
        }

        Promise.all([fetchVillages(), fetchCells()]);
    }, [router]);

    useEffect(() => {
        const fetchChartData = async () => {
            setChartLoading(true);
            try {
                const res = await api.get("/customers/villages/");
                const data = (res.data.results || res.data || []);

                // Revenue Top 10
                setRevenueData(
                    data
                        .sort((a: any, b: any) => (b.collected_this_month || 0) - (a.collected_this_month || 0))
                        .slice(0, 10)
                        .map((v: any) => ({
                            name: v.name.slice(0, 15) + (v.name.length > 15 ? '...' : ''),
                            revenue: v.collected_this_month || 0,
                            villageId: v.id
                        }))
                );

                // Growth data
                const growthRes = await api.get("/customers/villages/growth/");
                setGrowthData(growthRes.data.growth_data || []);

                // Top 10 by customers
                setTopVillagesData(
                    data
                        .sort((a: any, b: any) => (b.customer_count || 0) - (a.customer_count || 0))
                        .slice(0, 10)
                        .map((v: any) => ({
                            name: v.name.slice(0, 15) + (v.name.length > 15 ? '...' : ''),
                            customers: v.customer_count || 0,
                            villageId: v.id
                        }))
                );
            } catch (err) {
                toast.error("Failed to load chart data");
            } finally {
                setChartLoading(false);
            }
        };

        if (villages.length > 0) fetchChartData();
    }, [villages]);

    const fetchVillages = async () => {
        try {
            const res = await api.get("/customers/villages/");
            setVillages(res.data.results || res.data || []);
        } catch (err) {
            toast.error("Failed to load villages");
        } finally {
            setLoading(false);
        }
    };

    const fetchCells = async () => {
        try {
            const res = await api.get("/customers/cells/");
            setCells(res.data.results || res.data || []);
        } catch (err) {
            console.error("Failed to load cells");
        }
    };

    useEffect(() => {
        const fetchCollectors = async () => {
            try {
                // Fetch users filtered by role=collector
                const res = await api.get("/users/", {
                    params: {
                        role: "collector",  // Filter by role
                        limit: 1000         // Optional: get all if needed
                    }
                });

                // Expected response: paginated or list of users
                const collectorList = res.data.results || res.data || [];

                // Map to clean format for Select
                const formattedCollectors = collectorList.map((user: any) => ({
                    id: user.id,
                    username: user.username,
                    first_name: user.first_name || "",
                    last_name: user.last_name || "",
                    phone: user.phone || "",
                    get_full_name: user.get_full_name || `${user.first_name} ${user.last_name}`.trim() || user.username
                }));

                setCollectors(formattedCollectors);
            } catch (err) {
                console.error("Failed to load collectors:", err);
                toast.error("Could not load collectors for assignment");
                setCollectors([]);
            }
        };

        fetchCollectors();
    }, []);

    const fetchVillageDetail = async (villageId: number) => {
        setProfileLoading(true);
        try {
            const res = await api.get(`/customers/villages/${villageId}/`);
            setSelectedVillage(res.data);
        } catch (err) {
            toast.error("Failed to load village details");
        } finally {
            setProfileLoading(false);
        }
    };

    const filteredVillages = villages.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.cell_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.sector_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.collectors?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedVillages = [...filteredVillages].sort((a, b) => {
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
        if (saving) return; // Prevent double-click

        setSaving(true);

        try {
            // Validation
            if (!formData.name.trim()) {
                toast.error("Village name is required");
                return;
            }
            if (!formData.cell_id) {
                toast.error("Please select a cell");
                return;
            }

            const payload = {
                name: formData.name.trim(),
                cell: Number(formData.cell_id),
                gps_coordinates: formData.gps_coordinates.trim() || null,
                collectors: formData.collector_ids.map(id => Number(id)),
                monthly_revenue_target: Number(formData.monthly_revenue_target) || 0,
                monthly_new_customers_target: Number(formData.monthly_new_customers_target) || 0
            };

            await api.post("/customers/villages/", payload);

            toast.success("Village created successfully!", {
                icon: '🎉',
                style: {
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    border: '1px solid #10b981',
                    backdropFilter: 'blur(10px)',
                },
            });

            // Success: reset + close + refresh
            setAddOpen(false);
            setFormData({
                name: "",
                cell_id: "",
                gps_coordinates: "",
                collector_ids: [],
                monthly_revenue_target: 0,
                monthly_new_customers_target: 0
            });
            fetchVillages(); // Refresh list with new village
        } catch (err: any) {
            console.error("Village creation error:", err);

            const errorData = err.response?.data;
            let errorMessage = "Failed to create village";

            if (errorData) {
                if (typeof errorData === 'object') {
                    // Handle field errors (e.g. name already exists)
                    errorMessage = Object.keys(errorData)
                        .map(key => `${key}: ${Array.isArray(errorData[key]) ? errorData[key].join(', ') : errorData[key]}`)
                        .join(' | ');
                } else {
                    errorMessage = errorData.detail || errorData || errorMessage;
                }
            }

            toast.error(errorMessage, {
                duration: 6000,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (editing || !selectedVillage) return; // Prevent double-click & null

        setEditing(true);

        try {
            // Basic validation
            if (!formData.name.trim()) {
                toast.error("Village name is required");
                return;
            }
            if (!formData.cell_id) {
                toast.error("Please select a cell");
                return;
            }

            const payload = {
                name: formData.name.trim(),
                cell: Number(formData.cell_id),
                gps_coordinates: formData.gps_coordinates.trim() || null,
                collectors: formData.collector_ids.map(id => Number(id)),
                monthly_revenue_target: Number(formData.monthly_revenue_target) || 0,
                monthly_new_customers_target: Number(formData.monthly_new_customers_target) || 0
            };

            console.log("Sending payload:", payload);

            await api.patch(`/customers/villages/${selectedVillage.id}/`, payload);

            toast.success("Village updated successfully!", {
                icon: '✨',
                style: {
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: '#8b5cf6',
                    border: '1px solid #8b5cf6',
                    backdropFilter: 'blur(10px)',
                },
            });

            // Success: close + refresh
            setEditOpen(false);
            fetchVillages(); // Refresh main list
            fetchVillageDetail(selectedVillage.id); // Refresh profile if open
        } catch (err: any) {
            console.error("Village update error:", err);

            const errorData = err.response?.data;
            let errorMessage = "Failed to update village";

            if (errorData) {
                if (typeof errorData === 'object') {
                    errorMessage = Object.keys(errorData)
                        .map(key => `${key}: ${Array.isArray(errorData[key]) ? errorData[key].join(', ') : errorData[key]}`)
                        .join(' | ');
                } else {
                    errorMessage = errorData.detail || errorData || errorMessage;
                }
            }

            toast.error(errorMessage, {
                duration: 6000,
            });
        } finally {
            setEditing(false);
        }
    };


    const handleDelete = async () => {
        try {
            await api.delete(`/customers/villages/${selectedVillage.id}/`);
            toast.success("Village deleted");
            setDeleteOpen(false);
            fetchVillages();
        } catch (err) {
            toast.error("Cannot delete — village has customers");
        }
    };



    const exportChartToPDF = async (chartRef: any, title: string) => {
        if (!chartRef?.container) {
            toast.error("Chart not ready for export");
            return;
        }

        try {
            const canvas = await html2canvas(chartRef.container, {
                scale: 2,
                useCORS: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#000000' : '#ffffff'
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? "landscape" : "portrait",
                unit: "px",
                format: [canvas.width, canvas.height]
            });

            // Professional Header
            pdf.setFillColor(88, 28, 135); // High Prosper Purple
            pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 120, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(32);
            pdf.setFont("helvetica", "bold");
            pdf.text("High Prosper Services Ltd", 60, 60);
            pdf.setFontSize(24);
            pdf.text(title, 60, 100);

            // Add Chart Image
            const imgWidth = canvas.width - 120;
            const imgHeight = canvas.height - 240;
            pdf.addImage(imgData, "PNG", 60, 160, imgWidth, imgHeight);

            // Professional Footer
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.setFillColor(88, 28, 135);
            pdf.rect(0, pageHeight - 100, pageWidth, 100, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 60, pageHeight - 60);
            pdf.text("High Prosper • Intelligence Engine 2026", pageWidth - 60, pageHeight - 60, { align: "right" });
            pdf.setFontSize(12);
            pdf.text("© 2026 High Prosper Services Ltd • All Rights Reserved", pageWidth / 2, pageHeight - 30, { align: "center" });

            // Save
            pdf.save(`${title.replace(/ /g, "_")}_HighProsper_${new Date().toISOString().slice(0,10)}.pdf`);
            toast.success(`${title} exported as PDF successfully!`);
        } catch (err) {
            console.error("PDF Export Error:", err);
            toast.error("Failed to export PDF");
        }
    };

    const exportChartToExcel = (data: any[], title: string) => {
        if (!data || data.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            // Prepare worksheet
            const worksheetData = data.map(item => {
                const row: any = { ...item };
                // Clean keys for Excel
                Object.keys(row).forEach(key => {
                    if (key === 'villageId') delete row[key]; // Remove internal IDs
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(worksheetData);

            // Auto-size columns
            const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
                wch: Math.max(key.length, ...worksheetData.map(row => String(row[key] || "").length)) + 4
            }));
            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");

            // Add title row
            XLSX.utils.sheet_add_aoa(ws, [[`High Prosper - ${title}`]], { origin: "A1" });
            XLSX.utils.sheet_add_aoa(ws, [[`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`]], { origin: "A2" });

            // Export
            XLSX.writeFile(wb, `${title.replace(/ /g, "_")}_HighProsper_${new Date().toISOString().slice(0,10)}.xlsx`);
            toast.success(`${title} exported as Excel successfully!`);
        } catch (err) {
            console.error("Excel Export Error:", err);
            toast.error("Failed to export Excel");
        }
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
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">Villages Intelligence Center</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Dual-target performance: Revenue + Customer Growth</p>
                    </div>
                    {/* Add Village Modal — With Multi-Collector Assignment */}
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                <Plus className="w-5 h-5 mr-2" /> Add Village
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Create New Village</DialogTitle>
                                <p className="text-sm text-gray-500 mt-2">Assign collectors and set monthly targets</p>
                            </DialogHeader>
                            <div className="space-y-5 mt-6">
                                {/* Village Name */}
                                <div>
                                    <Label className="text-base font-medium">Village Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Gatare"
                                        className="mt-2"
                                    />
                                </div>

                                {/* Cell Selection */}
                                <div>
                                    <Label className="text-base font-medium">Cell</Label>
                                    <Select value={formData.cell_id} onValueChange={(v) => setFormData({ ...formData, cell_id: v })}>
                                        <SelectTrigger className="mt-2">
                                            <SelectValue placeholder="Select a cell" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cells.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name} — {c.sector_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Multi-Collector Assignment */}
                                <div>
                                    <Label className="text-base font-medium">Assign Collectors</Label>
                                    <MultiCollectorSelect
                                        value={formData.collector_ids}
                                        onChange={(values) => setFormData({ ...formData, collector_ids: values })}
                                        collectors={collectors}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Hold Ctrl/Cmd or drag to select multiple collectors
                                    </p>
                                </div>

                                {/* GPS Coordinates */}
                                <div>
                                    <Label className="text-base font-medium">GPS Coordinates (lat,lng)</Label>
                                    <Input
                                        value={formData.gps_coordinates}
                                        onChange={(e) => setFormData({ ...formData, gps_coordinates: e.target.value })}
                                        placeholder="e.g. -1.9441,30.0619"
                                        className="mt-2"
                                    />
                                </div>

                                {/* Targets */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-base font-medium">Revenue Target (RWF)</Label>
                                        <Input
                                            type="number"
                                            value={formData.monthly_revenue_target || ''}
                                            onChange={(e) => setFormData({ ...formData, monthly_revenue_target: Number(e.target.value) || 0 })}
                                            placeholder="50000000"
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">New Customers Target</Label>
                                        <Input
                                            type="number"
                                            value={formData.monthly_new_customers_target || ''}
                                            onChange={(e) => setFormData({ ...formData, monthly_new_customers_target: Number(e.target.value) || 0 })}
                                            placeholder="50"
                                            className="mt-2"
                                        />
                                    </div>
                                </div>

                                {/* Submit */}
                                <Button
                                    onClick={handleAdd}
                                    disabled={saving}
                                    className={cn(
                                        "w-full text-lg py-6 font-bold transition-all",
                                        saving
                                            ? "bg-gray-600 cursor-not-allowed opacity-70"
                                            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                    )}
                                >
                                    {saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3" />
                                            Creating Village...
                                        </>
                                    ) : (
                                        "Create Village"
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-purple-600 to-purple-800">
                        <CardContent className="p-4 text-center">
                            <MapPin className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                            <p className="text-purple-200 text-xs">Total Villages</p>
                            <p className="text-2xl font-black text-white">{totalVillages}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-800">
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 text-blue-200 mx-auto mb-2" />
                            <p className="text-blue-200 text-xs">Total Customers</p>
                            <p className="text-2xl font-black text-white">{totalCustomers.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600 to-green-800">
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-8 h-8 text-green-200 mx-auto mb-2" />
                            <p className="text-green-200 text-xs">Revenue Target</p>
                            <p className="text-2xl font-black text-white">RWF {formatCurrency(totalRevenueTarget)}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-600 to-teal-800">
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                            <p className="text-emerald-200 text-xs">Collected</p>
                            <p className="text-2xl font-black text-white">RWF {formatCurrency(totalCollected)}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-cyan-600 to-blue-800">
                        <CardContent className="p-4 text-center">
                            <Target className="w-8 h-8 text-cyan-200 mx-auto mb-2" />
                            <p className="text-cyan-200 text-xs">New Cust Target</p>
                            <p className="text-2xl font-black text-white">+{totalNewCustomersTarget}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-800">
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 text-indigo-200 mx-auto mb-2" />
                            <p className="text-indigo-200 text-xs">New This Month</p>
                            <p className="text-2xl font-black text-white">+{totalNewCustomers}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Advanced Performance & Target Charts — Real-Time from Village Model */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                    {/* 1. Revenue Target vs Collected (Top 10) */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5" /> Revenue Target vs Collected
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={villages
                                    .sort((a, b) => (b.monthly_revenue_target || 0) - (a.monthly_revenue_target || 0))
                                    .slice(0, 10)
                                    .map(v => ({
                                        name: v.name.slice(0, 12) + '...',
                                        target: v.monthly_revenue_target || 0,
                                        collected: v.collected_this_month || 0,
                                        villageId: v.id
                                    }))
                                }>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" tickFormatter={(v) => `RWF ${formatCurrency(v)}`} />
                                    <Tooltip
                                        formatter={(value: number) => `RWF ${formatCurrency(value)}`}
                                        contentStyle={{ background: "#1e1b4b", border: "2px solid #8b5cf6" }}
                                    />
                                    <Legend />
                                    <Bar dataKey="target" fill="#f59e0b" name="Target" />
                                    <Bar dataKey="collected" fill="#10b981" name="Collected" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 2. New Customers Target vs Acquired */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Users className="w-5 h-5" /> New Customers Target vs Acquired
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={villages
                                    .sort((a, b) => (b.monthly_new_customers_target || 0) - (a.monthly_new_customers_target || 0))
                                    .slice(0, 10)
                                    .map(v => ({
                                        name: v.name.slice(0, 12) + '...',
                                        target: v.monthly_new_customers_target || 0,
                                        acquired: v.new_customers_this_month || 0,
                                        villageId: v.id
                                    }))
                                }>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip contentStyle={{ background: "#1e1b4b", border: "2px solid #3b82f6" }} />
                                    <Legend />
                                    <Bar dataKey="target" fill="#8b5cf6" name="Target" />
                                    <Bar dataKey="acquired" fill="#06b6d4" name="Acquired" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 3. Overall Target Achievement % */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Target className="w-5 h-5" /> Overall Target Achievement
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart
                                    data={villages
                                        .sort((a, b) => (b.overall_target_percentage || 0) - (a.overall_target_percentage || 0))
                                        .slice(0, 10)
                                        .map(v => ({
                                            name: v.name.slice(0, 12) + '...',
                                            percentage: Math.round((v.overall_target_percentage || 0) * 10) / 10, // Clean number
                                            villageId: v.id
                                        }))}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" domain={[0, 120]} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />

                                    {/* Dynamic color via Cell */}
                                    <Bar dataKey="percentage" name="Overall %">
                                        {villages
                                            .sort((a, b) => (b.overall_target_percentage || 0) - (a.overall_target_percentage || 0))
                                            .slice(0, 10)
                                            .map((entry, index) => {
                                                const percentage = entry.overall_target_percentage || 0;
                                                const fillColor = percentage >= 100 ? "#10b981" : percentage >= 80 ? "#f59e0b" : "#ef4444";
                                                return <Cell key={`cell-${index}`} fill={fillColor} />;
                                            })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 4. Performance Rank Leaderboard */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700 lg:col-span-2 xl:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <Crown className="w-5 h-5" /> Village Performance Ranking
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart
                                    data={villages
                                        .filter(v => v.performance_rank)
                                        .sort((a, b) => (a.performance_rank || 999) - (b.performance_rank || 999))
                                        .slice(0, 15)
                                        .map(v => ({
                                            name: v.name,
                                            rank: v.performance_rank || 0,
                                            score: v.overall_target_percentage || 0,
                                            villageId: v.id
                                        }))
                                    }
                                    layout="horizontal"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis type="number" stroke="#ccc" domain={[0, 15]} />
                                    <YAxis dataKey="name" type="category" stroke="#ccc" width={160} fontSize={12} />
                                    <Tooltip
                                        formatter={(value: number, name: string) => name === "rank" ? `#${value}` : `${value.toFixed(1)}%`}
                                    />
                                    <Bar dataKey="rank" fill="#ffd700" name="Rank" />
                                    <Bar dataKey="score" fill="#8b5cf6" name="Score %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 5. Remaining Targets (Revenue & Customers) */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> Remaining Targets
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={villages
                                    .filter(v => (v.remaining_revenue_target || 0) > 0 || (v.remaining_new_customers_target || 0) > 0)
                                    .sort((a, b) => (b.remaining_revenue_target || 0) - (a.remaining_revenue_target || 0))
                                    .slice(0, 10)
                                    .map(v => ({
                                        name: v.name.slice(0, 12) + '...',
                                        revenue: v.remaining_revenue_target || 0,
                                        customers: v.remaining_new_customers_target || 0,
                                        villageId: v.id
                                    }))
                                }>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" tickFormatter={(v) => v > 1000000 ? `RWF ${formatCurrency(v)}` : v} />
                                    <Tooltip formatter={(v: number) => v > 1000000 ? `RWF ${formatCurrency(v)}` : `+${v}`} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#ef4444" name="Remaining Revenue" />
                                    <Bar dataKey="customers" fill="#f97316" name="Remaining Customers" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* 6. Collection Performance This Month */}
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-xl text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" /> Collection vs Target This Month
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={villages
                                    .sort((a, b) => (b.revenue_target_percentage || 0) - (a.revenue_target_percentage || 0))
                                    .slice(0, 10)
                                    .map(v => ({
                                        name: v.name.slice(0, 12) + '...',
                                        collected: v.collected_this_month || 0,
                                        target: v.monthly_revenue_target || 0,
                                        percentage: v.revenue_target_percentage || 0,
                                        villageId: v.id
                                    }))
                                }>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" angle={-45} textAnchor="end" height={80} fontSize={12} />
                                    <YAxis stroke="#ccc" tickFormatter={(v) => `RWF ${formatCurrency(v)}`} />
                                    <Tooltip formatter={(v: number) => v > 1000000 ? `RWF ${formatCurrency(v)}` : v} />
                                    <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={3} name="Target" />
                                    <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={4} name="Collected" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Export Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                            placeholder="Search villages by name, cell, sector, or collector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 w-full"
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => exportChartToPDF(null, "All Villages Report")}
                            className="flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Export PDF
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => exportChartToExcel(villages, "All Villages Data")}
                            className="flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Export Excel
                        </Button>
                    </div>
                </div>

                {/* Villages Table - Ultra Professional & Responsive */}
                <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-purple-700/30">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                                <tr>
                                    <th className="text-left py-4 px-6 font-bold cursor-pointer" onClick={() => handleSort('name')}>
                                        Village <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-4 px-6 font-bold">Sector</th>
                                    <th className="text-center py-4 px-6 font-bold">Cell</th>
                                    <th className="text-center py-4 px-6 font-bold">Collector(s)</th>
                                    <th className="text-center py-4 px-6 font-bold cursor-pointer" onClick={() => handleSort('customer_count')}>
                                        Customers <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                    </th>
                                    <th className="text-center py-4 px-6 font-bold">Revenue Target</th>
                                    <th className="text-center py-4 px-6 font-bold">Collected</th>
                                    <th className="text-center py-4 px-6 font-bold">Revenue %</th>
                                    <th className="text-center py-4 px-6 font-bold">New Cust Target</th>
                                    <th className="text-center py-4 px-6 font-bold">New This Month</th>
                                    <th className="text-center py-4 px-6 font-bold">Growth %</th>
                                    <th className="text-center py-4 px-6 font-bold">Overall Score</th>
                                    <th className="text-center py-4 px-6 font-bold">Rank</th>
                                    <th className="text-center py-4 px-6 font-bold">Balance</th>
                                    <th className="text-center py-4 px-6 font-bold">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {sortedVillages.map((village) => (
                                    <tr
                                        key={village.id}
                                        className="border-b hover:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-all cursor-pointer group"
                                        onClick={(e) => {
                                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                                            setSelectedVillage(village);
                                            fetchVillageDetail(village.id);
                                            setProfileOpen(true);
                                        }}
                                    >
                                        {/* Village Name */}
                                        <td className="py-4 px-6 font-bold text-purple-100">
                                            {village.name}
                                        </td>

                                        {/* Sector */}
                                        <td className="text-center py-4 px-6 text-purple-300">
                                            {village.sector_name}
                                        </td>

                                        {/* Cell */}
                                        <td className="text-center py-4 px-6 text-gray-300">
                                            {village.cell_name}
                                        </td>

                                        {/* Collectors with Phone Links - Table */}
                                        <td className="text-center py-4 px-6">
                                            <div className="flex flex-col gap-2">
                                                {village.collectors_info && village.collectors_info.length > 0 ? (
                                                    village.collectors_info.map((collector: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-center gap-3">
                                                            <span className="text-cyan-300 font-medium">{collector.name}</span>
                                                            {collector.phone ? (
                                                                <div className="flex gap-2">
                                                                    <a
                                                                        href={`tel:${collector.phone}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-green-400 hover:text-green-300 text-xl"
                                                                        title="Call"
                                                                    >
                                                                        📞
                                                                    </a>
                                                                    <a
                                                                        href={`https://wa.me/${collector.phone.replace(/\+/g, '')}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-green-500 hover:text-green-400 text-xl"
                                                                        title="WhatsApp"
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                    >
                                                                        💬
                                                                    </a>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-500 italic">Unassigned</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Customers */}
                                        <td className="text-center py-4 px-6 font-bold text-2xl text-white">
                                            {village.customer_count || 0}
                                        </td>

                                        {/* Revenue Target */}
                                        <td className="text-center py-4 px-6 font-semibold text-orange-300">
                                            RWF {formatCurrency(village.monthly_revenue_target || 0)}
                                        </td>

                                        {/* Collected */}
                                        <td className="text-center py-4 px-6 font-bold text-green-400">
                                            RWF {formatCurrency(village.collected_this_month || 0)}
                                        </td>

                                        {/* Revenue % */}
                                        <td className="text-center py-4 px-6">
                                            <Badge className={
                                                village.revenue_target_percentage >= 100 ? "bg-green-600" :
                                                    village.revenue_target_percentage >= 80 ? "bg-yellow-600" :
                                                        "bg-red-600"
                                            }>
                                                {village.revenue_target_percentage?.toFixed(1)}%
                                            </Badge>
                                        </td>

                                        {/* New Cust Target */}
                                        <td className="text-center py-4 px-6 font-semibold text-blue-300">
                                            +{village.monthly_new_customers_target || 0}
                                        </td>

                                        {/* New This Month */}
                                        <td className="text-center py-4 px-6 font-bold text-indigo-400 text-xl">
                                            +{village.new_customers_this_month || 0}
                                        </td>

                                        {/* Growth % */}
                                        <td className="text-center py-4 px-6">
                                            <Badge className={
                                                village.new_customers_target_percentage >= 100 ? "bg-emerald-600" :
                                                    village.new_customers_target_percentage >= 80 ? "bg-cyan-600" :
                                                        "bg-orange-600"
                                            }>
                                                {village.new_customers_target_percentage?.toFixed(1)}%
                                            </Badge>
                                        </td>

                                        {/* Overall Score */}
                                        <td className="text-center py-4 px-6">
                                            <div className="font-black text-2xl">
                                                {village.overall_target_percentage >= 100 ? "🥇" :
                                                    village.overall_target_percentage >= 90 ? "🥈" :
                                                        village.overall_target_percentage >= 80 ? "🥉" : ""}
                                                <span className={
                                                    village.overall_target_percentage >= 100 ? "text-emerald-500" :
                                                        village.overall_target_percentage >= 90 ? "text-cyan-500" :
                                                            village.overall_target_percentage >= 80 ? "text-yellow-500" :
                                                                "text-gray-500"
                                                }>
                    {village.overall_target_percentage?.toFixed(1)}%
                  </span>
                                            </div>
                                        </td>

                                        {/* Rank */}
                                        <td className="text-center py-4 px-6">
                                            {village.performance_rank ? (
                                                <Badge className={
                                                    village.performance_rank === 1 ? "bg-gradient-to-r from-yellow-400 to-amber-600 text-black" :
                                                        village.performance_rank <= 3 ? "bg-gradient-to-r from-gray-400 to-gray-600" :
                                                            village.performance_rank <= 10 ? "bg-gradient-to-r from-orange-600 to-yellow-600" :
                                                                "bg-gray-600"
                                                }>
                                                    {village.performance_rank === 1 ? "👑" : village.performance_rank <= 3 ? "🏅" : "🎖️"} #{village.performance_rank}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-400 italic">Unranked</span>
                                            )}
                                        </td>

                                        {/* Balance */}
                                        <td className="text-center py-4 px-6">
                <span className={`font-bold text-lg ${village.total_balance > 0 ? "text-red-400" : "text-green-400"}`}>
                  RWF {formatCurrency(Math.abs(village.total_balance || 0))}
                </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="text-center py-4 px-6">
                                            <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); fetchVillageDetail(village.id); setProfileOpen(true); }}>
                                                    <MapPin className="w-5 h-5 text-cyan-400" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedVillage(village); setEditOpen(true); }}>
                                                    <Edit className="w-5 h-5 text-blue-400" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedVillage(village); setDeleteOpen(true); }}>
                                                    <Trash2 className="w-5 h-5 text-red-500" />
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

                {/* Village Profile Modal — Executive Intelligence View */}
                <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                    <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-950 dark:to-purple-950">
                        <DialogHeader className="p-8 border-b-4 border-purple-700 bg-gradient-to-r from-purple-900 via-pink-900 to-purple-900 shadow-2xl">
                            <div className="flex items-start justify-between">
                                <div>
                                    <DialogTitle className="text-4xl font-black text-white flex items-center gap-4">
                                        {selectedVillage?.performance_rank && (
                                            <span className="text-5xl">
                {selectedVillage.performance_rank === 1 ? "👑" :
                    selectedVillage.performance_rank <= 3 ? "🏅" : "🎖️"}
              </span>
                                        )}
                                        {selectedVillage?.name || "Village Profile"}
                                    </DialogTitle>
                                    <p className="text-purple-200 text-lg mt-3">
                                        {selectedVillage?.sector_name} • {selectedVillage?.cell_name}
                                    </p>
                                    <p className="text-purple-300 text-sm mt-1">
                                        Rank #{selectedVillage?.performance_rank || "Unranked"} •
                                        Overall Score: <span className="font-bold text-2xl text-cyan-300">
              {selectedVillage?.overall_target_percentage?.toFixed(1)}%
            </span>
                                    </p>
                                </div>
                                {/* Header Buttons — Edit & Delete */}
                                <div className="flex gap-4">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur"
                                        onClick={() => {
                                            if (!selectedVillage) {
                                                toast.error("No village selected");
                                                return;
                                            }

                                            const assignedCollectors = selectedVillage.collectors
                                                ? selectedVillage.collectors.split(',').map((c: string) => c.trim())
                                                : [];

                                            const matchedCollectorIds = collectors
                                                .filter(collector => {
                                                    const fullName = collector.full_name?.trim() || "";
                                                    const phone = collector.phone?.trim() || "";
                                                    const nameWithPhone = fullName && phone ? `${fullName} (${phone})` : fullName;

                                                    return assignedCollectors.some(assigned =>
                                                            assigned && (
                                                                assigned.includes(fullName) ||
                                                                assigned.includes(phone) ||
                                                                assigned === nameWithPhone
                                                            )
                                                    );
                                                })
                                                .map(collector => collector.id.toString());

                                            setFormData({
                                                name: selectedVillage.name || "",
                                                cell_id: selectedVillage.cell?.id?.toString() || selectedVillage.cell || "",
                                                gps_coordinates: selectedVillage.gps_coordinates || "",
                                                monthly_revenue_target: selectedVillage.monthly_revenue_target || 0,
                                                monthly_new_customers_target: selectedVillage.monthly_new_customers_target || 0,
                                                collector_ids: matchedCollectorIds  // Always array
                                            });
                                            setEditOpen(true);
                                        }}
                                    >
                                        <Edit className="w-5 h-5 mr-2" /> Edit Village
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="destructive"
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => setDeleteOpen(true)}
                                    >
                                        <Trash2 className="w-5 h-5 mr-2" /> Delete Village
                                    </Button>
                                </div>

                                {/* Edit Village Modal — Safe & Professional */}
                                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                                    <DialogContent className="sm:max-w-lg">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold">Edit Village</DialogTitle>
                                            <p className="text-sm text-gray-500 mt-2">
                                                {selectedVillage ? `Updating ${selectedVillage.name}` : "Loading village data..."}
                                            </p>
                                        </DialogHeader>
                                        {selectedVillage ? (
                                            <div className="space-y-5 mt-6">
                                                {/* Village Name */}
                                                <div>
                                                    <Label>Village Name</Label>
                                                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-2" />
                                                </div>

                                                {/* Cell */}
                                                <div>
                                                    <Label>Cell</Label>
                                                    <Select value={formData.cell_id} onValueChange={(v) => setFormData({ ...formData, cell_id: v })}>
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue placeholder="Select cell" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {cells.map(c => (
                                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                                    {c.name} — {c.sector_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Multi Collector Assignment */}
                                                <div>
                                                    <Label>Assigned Collectors</Label>
                                                    <MultiCollectorSelect
                                                        value={formData.collector_ids}
                                                        onChange={(values) => setFormData({ ...formData, collector_ids: values })}
                                                        collectors={collectors}
                                                    />
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Currently assigned: {selectedVillage.collectors || "None"}
                                                    </p>
                                                </div>

                                                {/* GPS */}
                                                <div>
                                                    <Label>GPS Coordinates</Label>
                                                    <Input value={formData.gps_coordinates} onChange={(e) => setFormData({ ...formData, gps_coordinates: e.target.value })} className="mt-2" />
                                                </div>

                                                {/* Targets */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Revenue Target (RWF)</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.monthly_revenue_target || ''}
                                                            onChange={(e) => setFormData({ ...formData, monthly_revenue_target: Number(e.target.value) || 0 })}
                                                            className="mt-2"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>New Customers Target</Label>
                                                        <Input
                                                            type="number"
                                                            value={formData.monthly_new_customers_target || ''}
                                                            onChange={(e) => setFormData({ ...formData, monthly_new_customers_target: Number(e.target.value) || 0 })}
                                                            className="mt-2"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Buttons */}
                                                <div className="flex gap-3 pt-4">
                                                    <Button
                                                        onClick={handleEdit}
                                                        disabled={editing}
                                                        className={cn(
                                                            "flex-1 text-lg py-6 font-bold transition-all",
                                                            editing
                                                                ? "bg-gray-600 cursor-not-allowed opacity-70"
                                                                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                                        )}
                                                    >
                                                        {editing ? (
                                                            <>
                                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3" />
                                                                Saving Changes...
                                                            </>
                                                        ) : (
                                                            "Save Changes"
                                                        )}
                                                    </Button>
                                                    <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-16">
                                                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-600"></div>
                                            </div>
                                        )}
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </DialogHeader>

                        {profileLoading ? (
                            <div className="flex items-center justify-center h-96">
                                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-500"></div>
                            </div>
                        ) : selectedVillage ? (
                            <div className="p-8 space-y-10">
                                {/* Section 1: Key Performance Cards */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                        <Target className="w-7 h-7 text-purple-600" /> Performance Overview
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl">
                                            <CardContent className="p-6 text-center">
                                                <Users className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                                                <p className="text-blue-200 text-sm">Total Customers</p>
                                                <p className="text-4xl font-black text-white mt-2">{selectedVillage.customer_count || 0}</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-emerald-600 to-teal-800 shadow-xl">
                                            <CardContent className="p-6 text-center">
                                                <DollarSign className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                                                <p className="text-emerald-200 text-sm">Collected This Month</p>
                                                <p className="text-4xl font-black text-white mt-2">RWF {formatCurrency(selectedVillage.collected_this_month || 0)}</p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-purple-600 to-indigo-800 shadow-xl">
                                            <CardContent className="p-6 text-center">
                                                <TrendingUp className="w-12 h-12 text-purple-200 mx-auto mb-3" />
                                                <p className="text-purple-200 text-sm">New Customers This Month</p>
                                                <p className="text-4xl font-black text-white mt-2">+{selectedVillage.new_customers_this_month || 0}</p>
                                            </CardContent>
                                        </Card>

                                        <Card className={`shadow-xl ${selectedVillage.overall_target_percentage >= 100 ? 'bg-gradient-to-br from-yellow-500 to-amber-600' : 'bg-gradient-to-br from-cyan-600 to-blue-800'}`}>
                                            <CardContent className="p-6 text-center">
                                                <Crown className="w-12 h-12 text-yellow-200 mx-auto mb-3" />
                                                <p className="text-white text-sm">Overall Achievement</p>
                                                <p className="text-5xl font-black text-white mt-2">
                                                    {selectedVillage.overall_target_percentage?.toFixed(1)}%
                                                </p>
                                                <p className="text-white/80 text-xs mt-2">
                                                    {selectedVillage.overall_target_percentage >= 100 ? "Exceeded Target!" : "On Track"}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Section 2: Dual Targets Detail */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Target Performance</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Revenue Target */}
                                        <Card className="bg-white dark:bg-gray-800 shadow-2xl border border-purple-300 dark:border-purple-700">
                                            <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                                                <CardTitle className="flex items-center gap-3">
                                                    <DollarSign className="w-6 h-6" /> Revenue Target
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Monthly Target</span>
                                                    <span className="font-bold">RWF {formatCurrency(selectedVillage.monthly_revenue_target || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Collected</span>
                                                    <span className="font-bold text-green-600">RWF {formatCurrency(selectedVillage.collected_this_month || 0)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                                                    <span className={`font-bold ${selectedVillage.remaining_revenue_target > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    RWF {formatCurrency(selectedVillage.remaining_revenue_target || 0)}
                  </span>
                                                </div>
                                                <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xl font-semibold">Achievement</span>
                                                        <Badge className={`text-2xl px-6 py-3 ${selectedVillage.revenue_target_percentage >= 100 ? 'bg-green-600' : selectedVillage.revenue_target_percentage >= 80 ? 'bg-yellow-600' : 'bg-red-600'}`}>
                                                            {selectedVillage.revenue_target_percentage?.toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Customer Growth Target */}
                                        <Card className="bg-white dark:bg-gray-800 shadow-2xl border border-cyan-300 dark:border-cyan-700">
                                            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                                                <CardTitle className="flex items-center gap-3">
                                                    <Users className="w-6 h-6" /> Customer Growth Target
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Monthly Target</span>
                                                    <span className="font-bold">+{selectedVillage.monthly_new_customers_target || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Acquired</span>
                                                    <span className="font-bold text-indigo-600">+{selectedVillage.new_customers_this_month || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-lg">
                                                    <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                                                    <span className={`font-bold ${selectedVillage.remaining_new_customers_target > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    +{selectedVillage.remaining_new_customers_target || 0}
                  </span>
                                                </div>
                                                <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xl font-semibold">Achievement</span>
                                                        <Badge className={`text-2xl px-6 py-3 ${selectedVillage.new_customers_target_percentage >= 100 ? 'bg-emerald-600' : selectedVillage.new_customers_target_percentage >= 80 ? 'bg-cyan-600' : 'bg-orange-600'}`}>
                                                            {selectedVillage.new_customers_target_percentage?.toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* Section 3: Collector & Location */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Card className="bg-white dark:bg-gray-800 shadow-2xl">
                                        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                                            <CardTitle className="flex items-center gap-3">
                                                <Users className="w-6 h-6" /> Collector Assignment
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {selectedVillage.collectors_info && selectedVillage.collectors_info.length > 0 ? (
                                                <div className="space-y-4">
                                                    {selectedVillage.collectors_info.map((collector: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between p-5 bg-purple-50 dark:bg-purple-900/40 rounded-xl shadow-sm">
                                                            <div>
                                                                <p className="font-bold text-lg text-purple-900 dark:text-purple-100">{collector.name}</p>
                                                                {collector.phone && (
                                                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-mono">
                                                                        {collector.phone.replace(/(\+?\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {collector.phone && (
                                                                <div className="flex gap-4">
                                                                    <a
                                                                        href={`tel:${collector.phone}`}
                                                                        className="p-4 bg-green-600 rounded-full hover:bg-green-700 transition-all shadow-lg"
                                                                        title="Call"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        📞
                                                                    </a>
                                                                    <a
                                                                        href={`https://wa.me/${collector.phone.replace(/\+/g, '')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-4 bg-green-500 rounded-full hover:bg-green-600 transition-all shadow-lg"
                                                                        title="WhatsApp"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        💬
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4 opacity-50" />
                                                    <p className="text-gray-500 text-lg">No collectors assigned</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Google Map */}
                                    {selectedVillage.gps_coordinates && GOOGLE_MAPS_API_KEY && (
                                        <Card className="bg-white dark:bg-gray-800 shadow-2xl">
                                            <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
                                                <CardTitle className="flex items-center gap-3">
                                                    <MapPin className="w-6 h-6" /> Village Location
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="h-96 rounded-b-xl overflow-hidden">
                                                    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
                                                        <GoogleMap
                                                            mapContainerStyle={{ width: "100%", height: "100%" }}
                                                            center={{
                                                                lat: parseFloat(selectedVillage.gps_coordinates.split(',')[0].trim()),
                                                                lng: parseFloat(selectedVillage.gps_coordinates.split(',')[1].trim())
                                                            }}
                                                            zoom={15}
                                                        >
                                                            <Marker
                                                                position={{
                                                                    lat: parseFloat(selectedVillage.gps_coordinates.split(',')[0].trim()),
                                                                    lng: parseFloat(selectedVillage.gps_coordinates.split(',')[1].trim())
                                                                }}
                                                                title={selectedVillage.name}
                                                            />
                                                        </GoogleMap>
                                                    </LoadScript>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Section 4: Financial Summary */}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Financial Summary</h2>
                                    <Card className="bg-white dark:bg-gray-800 shadow-2xl">
                                        <CardContent className="p-8">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">Total Balance</p>
                                                    <p className={`text-3xl font-black ${selectedVillage.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        RWF {formatCurrency(Math.abs(selectedVillage.total_balance || 0))}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">Risk Level</p>
                                                    <Badge className={`text-lg px-6 py-2 ${selectedVillage.avg_risk > 70 ? 'bg-red-600' : selectedVillage.avg_risk > 40 ? 'bg-yellow-600' : 'bg-green-600'}`}>
                                                        {selectedVillage.avg_risk > 70 ? "Critical" : selectedVillage.avg_risk > 40 ? "High" : "Low"}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">Population Estimate</p>
                                                    <p className="text-3xl font-black text-purple-600">{selectedVillage.population_estimate || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm">Status</p>
                                                    <Badge className={selectedVillage.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                                                        {selectedVillage.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Export Buttons */}
                                <div className="flex justify-center gap-6 pt-8 border-t border-gray-300 dark:border-gray-700">
                                    <Button
                                        size="lg"
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                        onClick={() => exportChartToPDF(null, selectedVillage.name + " Profile")}
                                    >
                                        <FileText className="w-6 h-6 mr-3" /> Export PDF Report
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => exportChartToExcel([selectedVillage], selectedVillage.name + " Data")}
                                    >
                                        <FileSpreadsheet className="w-6 h-6 mr-3" /> Export Excel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-32 text-gray-500 text-xl">No village data available</div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}