// app/dashboard/admin/analytics/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { DateRangePicker } from "react-date-range";
import { addDays, format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { Sparklines, SparklinesLine } from "react-sparklines";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import SummaryCard from "@/components/admin/SummaryCard";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";
import { Line, Pie, Bar } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";

import api from "@/lib/api";

// Register plugins
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend, annotationPlugin);

// Notification Interface
interface Notification {
    id: number;
    title?: string;
    message?: string;
    description?: string;
    unread: boolean;
    created_at: string;
    notification_type?: string;
    action_url?: string;
    image?: string;
    verb?: string;
}

// Settings Interface
interface NotificationSettings {
    notify_realtime: boolean;
    notify_browser: boolean;
    notify_sound: boolean;
    notify_payment: boolean;
    notify_customer_update: boolean;
    notify_chat: boolean;
    notify_task: boolean;
    notify_leave: boolean;
    notify_system: boolean;
}

export default function AnalyticsDashboard() {
    const router = useRouter();
    const token = Cookies.get("token");

    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [analytics, setAnalytics] = useState<any>({
        revenue: { daily: [], weekly: [], monthly: [] },
        paymentMethods: { mobile: 0, bank: 0, cash: 0 },
        topCustomers: [],
        customerGrowth: [],
        collections: 0,
        pending: 0,
        totalRevenue: 0,
        insights: [],
        reportSummary: "",
        collectorPerformance: [],
    });
    const [customers, setCustomers] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);

    // Filters
    const [dateRange, setDateRange] = useState([
        {
            startDate: addDays(new Date(), -30),
            endDate: new Date(),
            key: "selection",
        },
    ]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedVillage, setSelectedVillage] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("");

    // Live Counters
    const [liveCollections, setLiveCollections] = useState(0);
    const [livePending, setLivePending] = useState(0);

    // Collector Toggle
    const [visibleCollectors, setVisibleCollectors] = useState<boolean[]>([true, true, true, true, true]);

    // Refs
    const revenueChartRef = useRef(null);
    const paymentChartRef = useRef(null);
    const weeklyChartRef = useRef(null);
    const collectorChartRef = useRef<any>(null);

    useEffect(() => {
        const saved = localStorage.getItem("darkMode") === "true";
        setDarkMode(saved);
        if (saved) document.documentElement.classList.add("dark");
    }, []);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem("darkMode", String(newMode));
        document.documentElement.classList.toggle("dark", newMode);
    };

    const fetchAnalytics = async () => {
        if (!token) return router.push("/login");
        setLoading(true);
        try {
            const start = format(dateRange[0].startDate, "yyyy-MM-dd");
            const end = format(dateRange[0].endDate, "yyyy-MM-dd");

            let url = `/users/analytics/summary/?start=${start}&end=${end}`;
            if (selectedVillage) url += `&village=${selectedVillage}`;
            if (selectedMethod) url += `&method=${selectedMethod}`;

            const res = await api.get(url, {
                headers: { Authorization: `Token ${token}` },
            });

            setAnalytics(res.data || {});
            setLiveCollections(res.data?.collections || 0);
            setLivePending(res.data?.pending || 0);

            // Fetch customers for village filter
            const customersRes = await api.get("/customers/customers/", {
                headers: { Authorization: `Token ${token}` },
            });
            setCustomers(customersRes.data?.results || customersRes.data || []);

            // Fetch user notification settings
            const settingsRes = await api.get("/users/notification-settings/", {
                headers: { Authorization: `Token ${token}` },
            });
            setSettings(settingsRes.data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                Cookies.remove("token");
                router.push("/login");
            } else {
                toast.error("Failed to load analytics");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange, selectedVillage, selectedMethod, token, router]);

    // Load & save toggle state
    useEffect(() => {
        const saved = localStorage.getItem("visibleCollectors");
        if (saved) setVisibleCollectors(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem("visibleCollectors", JSON.stringify(visibleCollectors));
    }, [visibleCollectors]);

    const toggleCollector = (index: number) => {
        setVisibleCollectors(prev => {
            const newVisible = [...prev];
            newVisible[index] = !newVisible[index];
            return newVisible;
        });
    };

    // Real-time WebSocket — Only connect if realtime is enabled
    useEffect(() => {
        if (!settings?.notify_realtime) {
            console.log("Realtime notifications disabled by user settings");
            return;
        }

        if (!token) {
            console.warn("No auth token — notifications disabled");
            return;
        }

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/notifications/?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("Notification WS Connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Skip if user disabled this type
                const type = data.notification_type || data.verb || "info";
                if (
                    (type.includes("payment") && !settings.notify_payment) ||
                    (type.includes("update") && !settings.notify_customer_update) ||
                    (type === "chat" && !settings.notify_chat) ||
                    (type === "task" && !settings.notify_task) ||
                    (type === "leave" && !settings.notify_leave) ||
                    (type === "system" && !settings.notify_system)
                ) {
                    return;
                }

                if (data.type === "notification") {
                    const newNotif: Notification = {
                        id: data.id || Date.now(),
                        title: data.title || data.verb || "Notification",
                        message: data.message || data.description || "New update",
                        unread: true,
                        created_at: data.timestamp || new Date().toISOString(),
                        notification_type: type,
                        action_url: data.action_url,
                        image: data.image,
                        verb: data.verb,
                    };

                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);

                    // Sound only if enabled
                    if (settings.notify_sound) {
                        const config = getCategoryConfig(type);
                        playNotificationSound(config.sound);
                    }

                    // Browser push only if enabled
                    if (settings.notify_browser && Notification.permission === "granted" && document.hidden) {
                        new Notification(newNotif.title, {
                            body: newNotif.message,
                            icon: "/icon-192x192.png",
                            badge: "/badge-72x72.png",
                            image: newNotif.image,
                            vibrate: [200, 100, 200],
                            tag: "high-prosper-notification"
                        });
                    }

                    // Toast always
                    toast(newNotif.message, {
                        duration: 5000,
                        position: "top-right"
                    });
                } else if (data.type === "unread_count") {
                    setUnreadCount(data.count);
                }
            } catch (err) {
                console.error("Invalid WS message:", err);
            }
        };

        ws.onerror = (err) => console.error("WS error:", err);
        ws.onclose = () => console.log("WS closed");

        return () => ws.close();
    }, [settings]);

    // Export to PDF
    const exportToPDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const password = "HPS2025";

        // Cover Page
        const coverImage = "/images/cover-banner.png";
        try {
            doc.addImage(coverImage, "PNG", 0, 0, pageWidth, pageHeight);
        } catch (err) {
            doc.setFillColor(124, 58, 237);
            doc.rect(0, 0, pageWidth, pageHeight, "F");
        }

        doc.setFontSize(36);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("High Prosper Services", pageWidth / 2, pageHeight / 2 - 20, { align: "center" });

        doc.setFontSize(16);
        doc.text("Empowering Rwanda's Financial Future", pageWidth / 2, pageHeight / 2 + 10, { align: "center" });

        doc.setFontSize(14);
        doc.text("Analytics Dashboard Report", pageWidth / 2, pageHeight / 2 + 40, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Generated on: ${format(new Date(), "MMMM d, yyyy")}`, pageWidth / 2, pageHeight / 2 + 60, { align: "center" });

        doc.setFontSize(10);
        doc.text("Password Protected Document", pageWidth / 2, pageHeight - 20, { align: "center" });

        // Page 2: AI Summary + Insights
        doc.addPage();
        doc.setFillColor(124, 58, 237);
        doc.rect(0, 0, pageWidth, 40, "F");

        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("AI-Powered Report Summary", 20, 25);

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        const summaryLines = doc.splitTextToSize(analytics.reportSummary || "No summary available", pageWidth - 40);
        doc.text(summaryLines, 20, 60);

        // Critical Alerts
        const criticalAlerts = analytics.insights?.filter((i: any) => i.type === "warning") || [];
        if (criticalAlerts.length > 0) {
            doc.setFontSize(16);
            doc.setTextColor(220, 38, 38);
            doc.text("Critical Alerts", 20, 90);

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            let yPos = 110;
            criticalAlerts.forEach((alert: any) => {
                doc.text(`⚠️ ${alert.title}: ${alert.message}`, 20, yPos);
                yPos += 20;
            });
        }

        // KPI Table
        autoTable(doc, {
            startY: criticalAlerts.length > 0 ? yPos + 20 : 120,
            head: [["Metric", "Value"]],
            body: [
                ["Total Revenue", `${analytics.totalRevenue.toLocaleString()} RWF`],
                ["Collections", `${analytics.collections.toLocaleString()} RWF`],
                ["Pending", `${analytics.pending.toLocaleString()} RWF`],
                ["Growth Rate", "+24%"],
            ],
            theme: "grid",
            headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
            styles: { fontSize: 12 },
        });

        // Charts as Images
        const addChartImage = async (ref: any, y: number, title: string) => {
            if (!ref.current) return;
            const canvas = await html2canvas(ref.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            doc.addImage(imgData, "PNG", 20, y, pageWidth - 40, 80);
            doc.setFontSize(14);
            doc.text(title, 20, y - 5);
        };

        doc.addPage();
        await addChartImage(revenueChartRef, 20, "Revenue Trend");
        await addChartImage(paymentChartRef, 120, "Payment Methods");
        await addChartImage(weeklyChartRef, 220, "Weekly Revenue");

        // Collector Performance Table
        doc.addPage();
        autoTable(doc, {
            startY: 20,
            head: [["Rank", "Collector", "Customers", "Collected", "Pending", "Avg/Customer", "Bonus"]],
            body: analytics.collectorPerformance.slice(0, 5).map((c: any, i: number) => [
                i + 1,
                c.collector,
                c.customers,
                `${c.total_collected.toLocaleString()} RWF`,
                `${c.pending.toLocaleString()} RWF`,
                `${c.avg_per_customer.toLocaleString()} RWF`,
                c.bonus > 0 ? `${c.bonus.toLocaleString()} RWF` : "-",
            ]),
            theme: "striped",
            headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255] },
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
            doc.text("© 2025 High Prosper Services | www.hps.rw | +250 788 123 456", pageWidth / 2, pageHeight - 20, { align: "center" });
        }

        // Password Protection
        doc.setProtection({ userPassword: "HPS2025", ownerPassword: "HPS2025" });

        // Save & Send
        const pdfBlob = doc.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `HPS_Analytics_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
        link.click();
        toast.success("Password-protected report exported!");

        sendBrandedPDFByEmail(pdfBlob);
    };

    // Send PDF to backend for email
    const sendBrandedPDFByEmail = async (pdfBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append("pdf", pdfBlob, `HPS_Analytics_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);

            await api.post("/users/analytics/send-report/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Branded report sent to admin email!");
        } catch (err) {
            toast.error("Failed to send report email");
        }
    };

    // Charts
    const revenueLineData = {
        labels: analytics.revenue.daily?.map((d: any) => d.date) || [],
        datasets: [{
            label: "Daily Revenue (RWF)",
            data: analytics.revenue.daily?.map((d: any) => d.amount) || [],
            borderColor: "#10B981",
            backgroundColor: "rgba(16, 185, 129, 0.2)",
            tension: 0.4,
            fill: true,
        }],
    };

    const paymentPieData = {
        labels: ["Mobile Money", "Bank Transfer", "Cash"],
        datasets: [{
            data: [
                analytics.paymentMethods.mobile || 0,
                analytics.paymentMethods.bank || 0,
                analytics.paymentMethods.cash || 0,
            ],
            backgroundColor: ["#10B981", "#3B82F6", "#F59E0B"],
            borderWidth: 0,
        }],
    };

    const weeklyBarData = {
        labels: analytics.revenue.weekly?.map((w: any) => w.week) || [],
        datasets: [{
            label: "Weekly Revenue",
            data: analytics.revenue.weekly?.map((w: any) => w.amount) || [],
            backgroundColor: "#8B5CF6",
        }],
    };

    const customerGrowthData = {
        labels: analytics.customerGrowth?.map((g: any) => g.month) || [],
        datasets: [{
            label: "New Customers",
            data: analytics.customerGrowth?.map((g: any) => g.count) || [],
            borderColor: "#F59E0B",
            backgroundColor: "rgba(245, 158, 11, 0.2)",
            tension: 0.4,
            fill: true,
        }],
    };

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center text-3xl font-bold">Loading Analytics Empire...</div>;
    }

    return (
        <>
            <Toaster position="top-right" />
            <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900">
                <Sidebar />

                <div className="flex-1 flex flex-col">
                    <Navbar
                        title="Analytics Dashboard"
                        subtitle="Real-time insights & performance overview"
                        wsNotifications={notifications}
                        rightElement={
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-xl font-bold transition"
                                >
                                    Select Date Range
                                </button>
                                <button
                                    onClick={exportToPDF}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-xl font-bold transition"
                                >
                                    Export PDF (with Charts)
                                </button>
                            </div>
                        }
                    />

                    {/* Date Range Picker */}
                    {showDatePicker && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-20 right-8 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
                        >
                            <DateRangePicker
                                ranges={dateRange}
                                onChange={(ranges) => setDateRange([ranges.selection])}
                                moveRangeOnFirstSelection={false}
                                direction="horizontal"
                            />
                        </motion.div>
                    )}

                    <main className="flex-1 p-8 space-y-12 overflow-y-auto">
                        {/* AI Summary */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-8"
                        >
                            <h3 className="text-3xl font-black mb-4">AI Report Summary</h3>
                            <p className="text-xl font-medium">{analytics.reportSummary || "Loading summary..."}</p>
                        </motion.div>

                        {/* Critical Alerts */}
                        {analytics.insights?.filter((i: any) => i.type === "warning").length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-6 rounded-xl shadow-lg"
                            >
                                <h4 className="text-xl font-bold text-red-700 dark:text-red-300 mb-3">Critical Alerts</h4>
                                <ul className="space-y-2">
                                    {analytics.insights.filter((i: any) => i.type === "warning").map((alert: any, i: number) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="text-red-600 font-bold">⚠️</span>
                                            <div>
                                                <p className="font-semibold">{alert.title}</p>
                                                <p className="text-sm text-red-700 dark:text-red-300">{alert.message}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <SummaryCard title="Total Revenue" value={`${(analytics.totalRevenue || 0).toLocaleString()} RWF`} icon="money" trend="up" />
                            <SummaryCard title="Collections" value={`${liveCollections.toLocaleString()} RWF`} icon="growth" trend="up" />
                            <SummaryCard title="Pending" value={`${livePending.toLocaleString()} RWF`} icon="stock" trend="down" />
                            <SummaryCard title="New Customers" value={analytics.customerGrowth?.reduce((sum: number, g: any) => sum + g.count, 0) || 0} icon="users" trend="up" />
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-4">
                            <select
                                value={selectedVillage}
                                onChange={(e) => setSelectedVillage(e.target.value)}
                                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">All Villages</option>
                                {[...new Set(customers.map((c: any) => c.village?.name))].filter(Boolean).map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>

                            <select
                                value={selectedMethod}
                                onChange={(e) => setSelectedMethod(e.target.value)}
                                className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500"
                            >
                                <option value="">All Payment Methods</option>
                                {Object.keys(analytics.paymentMethods || {}).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <motion.div ref={revenueChartRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
                                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Revenue Trend</h3>
                                <div className="h-80"><Line data={revenueLineData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                            </motion.div>

                            <motion.div ref={paymentChartRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
                                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Payment Methods</h3>
                                <div className="h-80 flex items-center justify-center"><Pie data={paymentPieData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                            </motion.div>

                            <motion.div ref={weeklyChartRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
                                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Weekly Revenue</h3>
                                <div className="h-80"><Bar data={weeklyBarData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8">
                                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">Customer Growth</h3>
                                <div className="h-80"><Line data={customerGrowthData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
                            </motion.div>
                        </div>

                        {/* Collector Performance Section */}
                        {analytics.collectorPerformance?.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                                className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8"
                            >
                                <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Collector Performance
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="p-4 text-left">Rank</th>
                                            <th className="p-4 text-left">Collector</th>
                                            <th className="p-4 text-right">Customers</th>
                                            <th className="p-4 text-right">Collected</th>
                                            <th className="p-4 text-right">Pending</th>
                                            <th className="p-4 text-right">Avg/Customer</th>
                                            <th className="p-4 text-right">Bonus</th>
                                            <th className="p-4 text-center">Trend</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {analytics.collectorPerformance.slice(0, 5).map((c: any, i: number) => {
                                            const badge = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
                                            const bonus = c.bonus || 0;
                                            return (
                                                <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="p-4">
                                                        {i === 0 && <span className="text-yellow-500 text-xl">🥇</span>}
                                                        {i === 1 && <span className="text-gray-400 text-xl">🥈</span>}
                                                        {i === 2 && <span className="text-amber-700 text-xl">🥉</span>}
                                                        {i > 2 && <span className="text-gray-500">{i + 1}</span>}
                                                    </td>
                                                    <td className="p-4 font-medium">{c.collector}</td>
                                                    <td className="p-4 text-right">{c.customers}</td>
                                                    <td className="p-4 text-right text-green-600">{c.total_collected.toLocaleString()} RWF</td>
                                                    <td className="p-4 text-right text-red-600">{c.pending.toLocaleString()} RWF</td>
                                                    <td className="p-4 text-right">{c.avg_per_customer.toLocaleString()} RWF</td>
                                                    <td className="p-4 text-right text-yellow-600">
                                                        {bonus > 0 ? `${bonus.toLocaleString()} RWF` : "-"}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Sparklines data={c.monthly_trends?.map((t: any) => t.collected) || []} width={100} height={30}>
                                                            <SparklinesLine color={["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"][i]} />
                                                        </Sparklines>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}