// app/dashboard/admin/customers/page.tsx — FINAL WORKING VERSION 2025
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
    Users, DollarSign, TrendingUp, Search,
    Download, Printer, ChevronLeft, ChevronRight,
    ArrowUpDown, Sun, Moon, MapPin, FileText, AlertCircle, Plus,
    X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import Loader from "@/components/Loader";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import CustomerRegister from "@/components/auth/CustomerRegister";
import CustomerProfile from "@/components/customer/CustomerProfile";
import NotificationBell from "@/components/NotificationBell";
import Cookies from "js-cookie";
import CustomerHeader from "@/components/customer/CustomerHeader";

const COLORS = ["#10b981", "#f59e0b", "#f97316", "#dc2626"];
const ALLOWED_ROLES = ['admin', 'ceo', 'manager', 'collector'];

export default function CustomersTablePage() {
    const router = useRouter();

    const [customers, setCustomers] = useState<any[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [villages, setVillages] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [registerOpen, setRegisterOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [riskFilter, setRiskFilter] = useState<string>("all");
    const [villageFilter, setVillageFilter] = useState<string>("all");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [darkMode, setDarkMode] = useState(true);
    const itemsPerPage = 10;
    // === MODAL STATE ===
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalCustomers, setModalCustomers] = useState<any[]>([]);
    const [modalSortConfig, setModalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [modalSearch, setModalSearch] = useState("");
    const [modalPage, setModalPage] = useState(1);
    const modalItemsPerPage = 10;
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const fetchStats = async () => {
        try {
            const statsRes = await api.get("/customers/stats/");
            setStats(statsRes.data || {});
            toast("Dashboard stats updated in real-time!", { icon: "🔄" });
        } catch (err) {
            console.error("Failed to refresh stats:", err);
        }
    };


    useEffect(() => {
        let customerWs: WebSocket | null = null;
        let statsWs: WebSocket | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;

        const token = Cookies.get("token");

        if (!token) {
            console.warn("No auth token — WebSockets disabled");
            toast.error("Authentication required for real-time updates");
            setLoading(false);
            return;
        }

        const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

        const connectWebSockets = () => {
            // === CUSTOMER LIST WEBSOCKET ===
            const customerUrl = `${wsBase}/ws/customers/?token=${token}`;
            customerWs = new WebSocket(customerUrl);

            customerWs.onopen = () => {
                console.log("Customer WS Connected");
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = null;
                }
            };

            customerWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Real-time customer update:", data);

                    if (data.action === "create") {
                        setCustomers(prev => [...prev, data.customer]);
                        setFilteredCustomers(prev => [...prev, data.customer]);
                    } else if (data.action === "update") {
                        setCustomers(prev => prev.map(c =>
                            c.id === data.customer.id ? { ...c, ...data.customer } : c
                        ));
                        setFilteredCustomers(prev => prev.map(c =>
                            c.id === data.customer.id ? { ...c, ...data.customer } : c
                        ));
                    } else if (data.action === "delete") {
                        setCustomers(prev => prev.filter(c => c.id !== data.customer_id));
                        setFilteredCustomers(prev => prev.filter(c => c.id !== data.customer_id));
                    }
                } catch (err) {
                    console.error("Invalid customer WS message:", err);
                }
            };

            customerWs.onerror = (err) => {
                console.error("Customer WS error:", err);
            };

            customerWs.onclose = () => {
                console.log("Customer WS closed — reconnecting in 5s");
                reconnectTimeout = setTimeout(connectWebSockets, 5000);
            };

            // === STATS WEBSOCKET ===
            const statsUrl = `${wsBase}/ws/stats/?token=${token}`;
            statsWs = new WebSocket(statsUrl);

            statsWs.onopen = () => {
                console.log("Stats WS Connected");
            };

            statsWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("Real-time stats update:", data);
                    if (data.type === "stats_update") {
                        fetchStats();
                    }
                } catch (err) {
                    console.error("Invalid stats WS message:", err);
                }
            };

            statsWs.onerror = (err) => {
                console.error("Stats WS error:", err);
            };

            statsWs.onclose = () => {
                console.log("Stats WS closed — reconnecting in 5s");
                reconnectTimeout = setTimeout(connectWebSockets, 5000);
            };
        };

        const init = async () => {
            if (!loading) return;

            try {
                // Fetch user
                const userRes = await api.get("/users/me/");
                const currentUser = userRes.data;
                setUser(currentUser);

                const role = currentUser.role?.toLowerCase();

                if (!ALLOWED_ROLES.includes(role)) {
                    setAccessDenied(true);
                    toast.error("Access denied — insufficient permissions");
                    setTimeout(() => router.push("/"), 2000);
                    return;
                }

                // Fetch initial data
                const [custRes, statsRes, villageRes] = await Promise.all([
                    api.get("/customers/customers/"),
                    api.get("/customers/stats/"),
                    api.get("/customers/villages-list/")
                ]);

                const custData = Array.isArray(custRes.data) ? custRes.data : [];
                console.log("Customers loaded:", custData.length);
                if (custData.length > 0) console.log("First:", custData[0]);

                setCustomers(custData);
                setFilteredCustomers(custData);
                setStats(statsRes.data || {});
                setVillages(Array.isArray(villageRes.data) ? villageRes.data : []);

                toast.success(`Welcome back, ${currentUser.first_name || currentUser.username}!`);

                // Start WebSockets after data is loaded
                connectWebSockets();
            } catch (err: any) {
                console.error("Load failed:", err);
                if (err.response?.status === 401) {
                    router.push("/login");
                } else if (err.response?.status === 403) {
                    setAccessDenied(true);
                }
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        init();

        // Cleanup
        return () => {
            if (customerWs) customerWs.close();
            if (statsWs) statsWs.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, [router, loading, fetchStats]); // Dependencies

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    useEffect(() => {
        let filtered = customers;

        if (searchTerm) {
            filtered = filtered.filter((c: any) =>
                c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm) ||
                c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.payment_account?.includes(searchTerm)
            );
        }

        if (statusFilter !== "all") filtered = filtered.filter(c => c.status === statusFilter);
        if (riskFilter !== "all") filtered = filtered.filter(c => c.risk_level === riskFilter);
        if (villageFilter !== "all") filtered = filtered.filter(c => c.village_id === parseInt(villageFilter));

        setFilteredCustomers(filtered);
        setCurrentPage(1);
    }, [searchTerm, statusFilter, riskFilter, villageFilter, customers]);

    if (accessDenied) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-900">
                <Card className="bg-white/10 backdrop-blur-lg border-red-700 p-12 text-center">
                    <AlertCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
                    <h2 className="text-4xl font-bold text-white mb-4">Access Denied</h2>
                    <p className="text-xl text-purple-300">Redirecting...</p>
                </Card>
            </div>
        );
    }

    if (loading) return <Loader fullScreen />;

    // === CARD CLICK HANDLER ===
    const openModal = (title: string, filterFn: (c: any) => boolean) => {
        const filtered = safeCustomers.filter(filterFn);
        setModalTitle(title);
        setModalCustomers(filtered);
        setModalSearch("");
        setModalPage(1);
        setModalSortConfig(null); // ← Reset sorting
        setModalOpen(true);
    };



    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        if (!sortConfig) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
    });

    const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
    const paginatedCustomers = sortedCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSort = (key: string) => {
        setSortConfig(current => current?.key === key ? (current.direction === 'asc' ? { key, direction: 'desc' } : null) : { key, direction: 'asc' });
    };

    const toggleSelectAll = () => {
        setSelectedRows(selectedRows.length === paginatedCustomers.length ? [] : paginatedCustomers.map(c => c.id));
    };

    const toggleSelectRow = (id: number) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const exportToCSV = () => {
        const headers = ["Name", "Phone", "Village", "Monthly Fee", "Balance", "Status", "Risk"];
        const rows = sortedCustomers.map(c => [
            c.name, c.phone, c.village_name || "N/A", c.monthly_fee, c.balance, c.balance_status, c.risk_level
        ]);
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "HighProsper_Customers.csv";
        a.click();
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(sortedCustomers.map(c => ({
            Name: c.name,
            Phone: c.phone,
            Village: c.village_name || "N/A",
            "Monthly Fee": c.monthly_fee,
            Balance: c.balance,
            Status: c.balance_status,
            Risk: c.risk_level
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "HighProsper_Customers.xlsx");
    };

    const exportModalToExcel = () => {
        if (modalCustomers.length === 0) {
            toast.error("No data to export");
            return;
        }

        // Apply current search filter
        let exportData = modalCustomers;
        if (modalSearch) {
            const lowerSearch = modalSearch.toLowerCase();
            exportData = exportData.filter((c: any) =>
                c.name?.toLowerCase().includes(lowerSearch) ||
                c.phone?.includes(lowerSearch) ||
                c.email?.toLowerCase().includes(lowerSearch) ||
                c.village_name?.toLowerCase().includes(lowerSearch) ||
                c.payment_account?.includes(lowerSearch)
            );
        }

        // Apply current sorting
        if (modalSortConfig) {
            exportData = [...exportData].sort((a, b) => {
                let aVal = a[modalSortConfig.key];
                let bVal = b[modalSortConfig.key];

                if (['monthly_fee', 'balance'].includes(modalSortConfig.key)) {
                    aVal = parseFloat(aVal || 0);
                    bVal = parseFloat(bVal || 0);
                }

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return modalSortConfig.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                if (aVal < bVal) return modalSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return modalSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Prepare data for Excel
        const worksheetData = exportData.map(c => ({
            Name: c.name || "",
            Phone: c.phone || "",
            Village: c.village_name || "N/A",
            "Monthly Fee (RWF)": parseFloat(c.monthly_fee || 0),
            "Balance (RWF)": parseFloat(c.balance || 0),
            Status: c.status || "",
            "Risk Level": c.risk_level || "Low",
            "Payment Account": c.payment_account || "",
            "Contract No": c.contract_no || ""
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);

        // Auto-size columns
        const colWidths = [
            { wch: 25 }, // Name
            { wch: 15 }, // Phone
            { wch: 20 }, // Village
            { wch: 18 }, // Monthly Fee
            { wch: 18 }, // Balance
            { wch: 12 }, // Status
            { wch: 15 }, // Risk Level
            { wch: 20 }, // Payment Account
            { wch: 18 }  // Contract No
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");

        // Add title
        XLSX.utils.sheet_add_aoa(ws, [[`High Prosper - ${modalTitle}`]], { origin: "A1" });
        XLSX.utils.sheet_add_aoa(ws, [[`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`]], { origin: "A2" });

        // Save file
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `HighProsper_${modalTitle.replace(/ /g, "_")}_${dateStr}.xlsx`);

        toast.success("Excel exported successfully!");
    };

    const exportModalToPDF = async () => {
        if (modalCustomers.length === 0) {
            toast.error("No data to export");
            return;
        }

        try {
            // Get current filtered + sorted data
            let exportData = modalCustomers;
            if (modalSearch) {
                const lowerSearch = modalSearch.toLowerCase();
                exportData = exportData.filter((c: any) =>
                    c.name?.toLowerCase().includes(lowerSearch) ||
                    c.phone?.includes(lowerSearch) ||
                    c.email?.toLowerCase().includes(lowerSearch) ||
                    c.village_name?.toLowerCase().includes(lowerSearch) ||
                    c.payment_account?.includes(lowerSearch)
                );
            }

            if (modalSortConfig) {
                exportData = [...exportData].sort((a, b) => {
                    let aVal = a[modalSortConfig.key];
                    let bVal = b[modalSortConfig.key];

                    if (['monthly_fee', 'balance'].includes(modalSortConfig.key)) {
                        aVal = parseFloat(aVal || 0);
                        bVal = parseFloat(bVal || 0);
                    }

                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                        return modalSortConfig.direction === 'asc'
                            ? aVal.localeCompare(bVal)
                            : bVal.localeCompare(aVal);
                    }

                    if (aVal < bVal) return modalSortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return modalSortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // Create hidden table for html2canvas
            const tableHTML = `
            <div style="padding: 40px; background: white; font-family: Arial, sans-serif;">
                <h1 style="text-align: center; color: #581c87; margin-bottom: 30px;">
                    High Prosper Services Ltd - ${modalTitle}
                </h1>
                <p style="text-align: center; color: #666; margin-bottom: 40px;">
                    Generated on: ${new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            })}
                </p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background: #581c87; color: white;">
                            <th style="padding: 12px; text-align: left;">Name</th>
                            <th style="padding: 12px; text-align: left;">Phone</th>
                            <th style="padding: 12px; text-align: left;">Village</th>
                            <th style="padding: 12px; text-align: right;">Monthly Fee</th>
                            <th style="padding: 12px; text-align: right;">Balance</th>
                            <th style="padding: 12px; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exportData.map(c => `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 12px;">${c.name || ''}</td>
                                <td style="padding: 12px;">${c.phone || ''}</td>
                                <td style="padding: 12px;">${c.village_name || 'N/A'}</td>
                                <td style="padding: 12px; text-align: right;">
                                    RWF ${parseFloat(c.monthly_fee || 0).toLocaleString()}
                                </td>
                                <td style="padding: 12px; text-align: right;">
                                    RWF ${Math.abs(parseFloat(c.balance || 0)).toLocaleString()}
                                </td>
                                <td style="padding: 12px; text-align: center;">${c.status || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 60px; text-align: center; color: #666; font-size: 12px;">
                    <p>High Prosper Services Ltd • +250 785 340 438 • highprosperservicesltd@gmail.com</p>
                    <p>Kigali, Gikondo • TIN: 102569672</p>
                </div>
            </div>
        `;

            // Create temporary div
            const printContainer = document.createElement('div');
            printContainer.innerHTML = tableHTML;
            printContainer.style.position = 'absolute';
            printContainer.style.left = '-9999px';
            printContainer.style.background = 'white';
            document.body.appendChild(printContainer);

            const canvas = await html2canvas(printContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            document.body.removeChild(printContainer);

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? "landscape" : "portrait",
                unit: "px",
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save(`HighProsper_${modalTitle.replace(/ /g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`);

            toast.success("PDF exported successfully!");
        } catch (err) {
            console.error("PDF export failed:", err);
            toast.error("Failed to export PDF");
        }
    };

    const exportModalToCSV = () => {
        if (modalCustomers.length === 0) {
            toast.error("No data to export");
            return;
        }

        // Apply current search filter
        let exportData = modalCustomers;
        if (modalSearch) {
            const lowerSearch = modalSearch.toLowerCase();
            exportData = exportData.filter((c: any) =>
                c.name?.toLowerCase().includes(lowerSearch) ||
                c.phone?.includes(lowerSearch) ||
                c.email?.toLowerCase().includes(lowerSearch) ||
                c.village_name?.toLowerCase().includes(lowerSearch) ||
                c.payment_account?.includes(lowerSearch)
            );
        }

        // Apply current sorting
        if (modalSortConfig) {
            exportData = [...exportData].sort((a, b) => {
                let aVal = a[modalSortConfig.key];
                let bVal = b[modalSortConfig.key];

                if (['monthly_fee', 'balance'].includes(modalSortConfig.key)) {
                    aVal = parseFloat(aVal || 0);
                    bVal = parseFloat(bVal || 0);
                }

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return modalSortConfig.direction === 'asc'
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                if (aVal < bVal) return modalSortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return modalSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // Headers
        const headers = ["Name", "Phone", "Village", "Monthly Fee (RWF)", "Balance (RWF)", "Status"];
        const rows = exportData.map(c => [
            c.name || "",
            c.phone || "",
            c.village_name || "N/A",
            parseFloat(c.monthly_fee || 0).toLocaleString(),
            parseFloat(c.balance || 0).toLocaleString(),
            c.status || ""
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `HighProsper_${modalTitle.replace(/ /g, "_")}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("CSV exported successfully!");
    };

    const handleModalSort = (key: string) => {
        setModalSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
        setModalPage(1); // Reset to first page on sort
    };

    const LOGO_URL = "/logo.png";

    const exportToPDF = async () => {
        const element = document.getElementById("customers-table");
        if (!element) {
            toast.error("Table not found for export");
            return;
        }

        let originalClass = false;
        let originalBg = '';

        try {
            // Save theme
            originalClass = document.documentElement.classList.contains('dark');
            originalBg = document.body.style.background;

            // Force light mode for clean print
            document.documentElement.classList.remove('dark');
            document.body.style.background = '#ffffff';

            // Short delay for re-render
            await new Promise(resolve => setTimeout(resolve, 100));

            // OPTIMIZED html2canvas settings for SPEED
            const canvas = await html2canvas(element, {
                scale: 1.5,                    // ↓ Reduced from 2 → 40% faster, still sharp
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: element.scrollWidth,    // Exact size, no extra padding
                height: element.scrollHeight,
                scrollX: 0,
                scrollY: -window.scrollY,      // Fix scroll position issues
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95); // Use JPEG for smaller size & faster processing
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // Use standard A4 landscape for better compatibility & speed
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: 'a4'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const contentWidth = pageWidth - 2 * margin;
            const contentHeight = pageHeight - 160; // Leave space for header/footer

            // Calculate scale to fit table on page
            const scale = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
            const scaledWidth = imgWidth * scale;
            const scaledHeight = imgHeight * scale;

            let positionY = margin + 80; // Start below header

            // Add first page
            pdf.addImage(imgData, "JPEG", margin + (contentWidth - scaledWidth) / 2, positionY, scaledWidth, scaledHeight);

            // === HEADER (every page) ===
            const addHeader = () => {
                pdf.setFillColor(88, 28, 135);
                pdf.rect(0, 0, pageWidth, 80, 'F');

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(20);
                pdf.setFont("helvetica", "bold");
                pdf.text("High Prosper Services Ltd", 50, 35);

                pdf.setFontSize(14);
                pdf.text("Customers Intelligence Report", 50, 55);

                pdf.setFontSize(10);
                pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                })}`, 50, 70);
            };

            // === FOOTER (every page) ===
            const addFooter = (pageNum: number, totalPages: number) => {
                const footerY = pageHeight - 60;
                pdf.setFillColor(88, 28, 135);
                pdf.rect(0, footerY, pageWidth, 60, 'F');

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(11);
                pdf.text("High Prosper Services Ltd • +250 785 340 438 • highprosperservicesltd@gmail.com", 50, footerY + 20);
                pdf.text("Kigali, Gikondo • TIN: 102569672", 50, footerY + 35);

                pdf.setFontSize(10);
                pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 120, footerY + 30);
            };

            addHeader();
            addFooter(1, 1); // Temporary, will update later

            // If content is too tall → add pages
            if (scaledHeight > contentHeight) {
                const pagesNeeded = Math.ceil(scaledHeight / contentHeight);
                let currentPage = 1;

                for (let i = 1; i < pagesNeeded; i++) {
                    pdf.addPage();
                    currentPage++;
                    positionY = margin + 80 - (contentHeight * i);

                    pdf.addImage(imgData, "JPEG", margin + (contentWidth - scaledWidth) / 2, positionY, scaledWidth, scaledHeight);

                    addHeader();
                    addFooter(currentPage, pagesNeeded);
                }
            } else {
                addFooter(1, 1);
            }

            // Save
            const dateStr = new Date().toISOString().slice(0, 10);
            pdf.save(`HighProsper_Customers_Report_${dateStr}.pdf`);

            toast.success("PDF exported quickly & professionally!");

        } catch (err) {
            console.error("PDF export failed:", err);
            toast.error("Failed to export PDF");
        } finally {
            // Restore theme
            if (originalClass) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            document.body.style.background = originalBg;
        }
    };
    const handlePrint = () => window.print();

    const safeCustomers = Array.isArray(customers) ? customers : [];

    const totalOutstanding = safeCustomers.reduce((sum, c) => {
        const bal = parseFloat(c.balance) || 0;
        return sum + (bal > 0 ? bal : 0);
    }, 0);
    const totalOverpaid = Math.abs(safeCustomers.reduce((sum, c) => {
        const bal = parseFloat(c.balance) || 0;
        return sum + (bal < 0 ? bal : 0);
    }, 0));
    const totalMonthly = safeCustomers.reduce((sum, c) => {
        const fee = parseFloat(c.monthly_fee) || 0;
        return sum + fee;
    }, 0);
    // NEW: Total Active Customers
    const totalActive = safeCustomers.filter(c => c.status === "Active").length;


    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const newThisMonth = safeCustomers.filter(c => {
        if (!c.connection_date) return false;
        const connDate = new Date(c.connection_date);
        return connDate.getMonth() === currentMonth && connDate.getFullYear() === currentYear;
    }).length;

    const riskData = [
        { name: "Low", value: safeCustomers.filter(c => c.risk_level === "Low").length },
        { name: "Medium", value: safeCustomers.filter(c => c.risk_level === "Medium").length },
        { name: "High", value: safeCustomers.filter(c => c.risk_level === "High").length },
        { name: "Critical", value: safeCustomers.filter(c => c.risk_level === "Critical").length },
    ];

    const trendData = stats.dailyTrend || [];

    const isAdmin = user && (user.is_superuser || ['admin', 'ceo', 'manager'].includes(user.role?.toLowerCase()));

    if (paginatedCustomers.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <Card className="bg-white/10 backdrop-blur-lg border-purple-700 p-16 text-center max-w-2xl">
                    <Users className="w-24 h-24 text-purple-400 mx-auto mb-6" />
                    <h3 className="text-3xl font-bold text-white mb-4">No Customers Found</h3>
                    <p className="text-xl text-purple-300 leading-relaxed">
                        {isAdmin
                            ? "There are currently no customers in the system. Add your first customer to get started."
                            : searchTerm || statusFilter !== "all" || riskFilter !== "all" || villageFilter !== "all"
                                ? "No customers match your current filters. Try adjusting them."
                                : "No customers are assigned to your villages yet."}
                    </p>

                    {isAdmin && (
                        <Button
                            onClick={() => setRegisterOpen(true)}
                            className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 text-xl px-8 py-6"
                        >
                            <Plus className="mr-3 w-6 h-6" /> Add First Customer
                        </Button>
                    )}
                </Card>

                {registerOpen && (
                    <CustomerRegister
                        onClose={() => setRegisterOpen(false)}
                        villages={villages}
                        onSuccess={() => window.location.reload()}
                    />
                )}
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gray-100'} p-8`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-5xl font-black text-white">Customers Intelligence Center</h1>
                    <div className="flex gap-4">
                        <NotificationBell />
                        <Button onClick={() => setDarkMode(!darkMode)} variant="outline">
                            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                        </Button>
                        <Button onClick={handlePrint}>
                            <Printer className="mr-2" /> Print
                        </Button>
                        <Button onClick={exportToCSV}>
                            <Download className="mr-2" /> CSV
                        </Button>
                        <Button onClick={exportToExcel} className="bg-green-600">
                            <Download className="mr-2" /> Excel
                        </Button>
                        <Button onClick={exportToPDF} className="bg-red-600">
                            <FileText className="mr-2" /> PDF
                        </Button>
                        {isAdmin && (
                            <Button
                                onClick={() => setRegisterOpen(true)}
                                className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 text-xl px-8 py-6"
                            >
                                <Plus className="mr-3 w-6 h-6" /> Add New Customer
                            </Button>
                        )}
                    </div>
                </div>

                {/* Professional Compact Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
                    {/* Total Customers */}
                    <Card
                        className="bg-gradient-to-br from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("All Customers", () => true)}
                    >
                        <CardContent className="p-4 text-center">
                            <Users className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                            <p className="text-purple-200 text-xs font-medium">Total</p>
                            <p className="text-3xl font-black text-white mt-1">{safeCustomers.length}</p>
                        </CardContent>
                    </Card>

                    {/* Active Customers */}
                    <Card
                        className="bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("Active Customers", c => c.status === "Active")}
                    >
                        <CardContent className="p-4 text-center">
                            <Users className="w-10 h-10 text-green-300 mx-auto mb-2" />
                            <p className="text-green-200 text-xs font-medium">Active</p>
                            <p className="text-3xl font-black text-white mt-1">{totalActive}</p>
                        </CardContent>
                    </Card>

                    {/* New This Month */}
                    <Card
                        className="bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("New This Month", c => {
                            if (!c.connection_date) return false;
                            const connDate = new Date(c.connection_date);
                            const now = new Date();
                            return connDate.getMonth() === now.getMonth() && connDate.getFullYear() === now.getFullYear();
                        })}
                    >
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-10 h-10 text-blue-300 mx-auto mb-2" />
                            <p className="text-blue-200 text-xs font-medium">New</p>
                            <p className="text-3xl font-black text-white mt-1">{newThisMonth}</p>
                        </CardContent>
                    </Card>

                    {/* Outstanding */}
                    <Card
                        className="bg-gradient-to-br from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("Outstanding", c => parseFloat(c.balance || 0) > 0)}
                    >
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-10 h-10 text-red-300 mx-auto mb-2" />
                            <p className="text-red-200 text-xs font-medium">Outstanding</p>
                            <p className="text-2xl font-black text-white mt-1">RWF {totalOutstanding.toLocaleString()}</p>
                        </CardContent>
                    </Card>

                    {/* Overpaid */}
                    <Card
                        className="bg-gradient-to-br from-orange-800 to-orange-900 hover:from-orange-700 hover:to-orange-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("Overpaid", c => parseFloat(c.balance || 0) < 0)}
                    >
                        <CardContent className="p-4 text-center">
                            <DollarSign className="w-10 h-10 text-orange-300 mx-auto mb-2" />
                            <p className="text-orange-200 text-xs font-medium">Overpaid</p>
                            <p className="text-2xl font-black text-white mt-1">RWF {totalOverpaid.toLocaleString()}</p>
                        </CardContent>
                    </Card>

                    {/* Monthly Revenue */}
                    <Card
                        className="bg-gradient-to-br from-indigo-800 to-indigo-900 hover:from-indigo-700 hover:to-indigo-800 cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg"
                        onClick={() => openModal("Revenue", () => true)}
                    >
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-10 h-10 text-indigo-300 mx-auto mb-2" />
                            <p className="text-indigo-200 text-xs font-medium">Monthly</p>
                            <p className="text-2xl font-black text-white mt-1">RWF {totalMonthly.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Analysis Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700">
                        <CardHeader>
                            <CardTitle className="text-3xl text-white">Customer Growth Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="date" stroke="#ccc" />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip contentStyle={{ background: "#1e1b4b", border: "1px solid #8b5cf6" }} />
                                    <Line type="monotone" dataKey="new" stroke="#8b5cf6" strokeWidth={4} name="New Customers" />
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
                                    <Pie data={riskData} cx="50%" cy="50%" outerRadius={120} dataKey="value" label>
                                        {riskData.map((_, i) => (
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

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-4 w-6 h-6 text-purple-300" />
                        <Input
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white/10 border-purple-500 text-white"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-white/10 border-purple-500 text-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                            <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={riskFilter} onValueChange={setRiskFilter}>
                        <SelectTrigger className="bg-white/10 border-purple-500 text-white">
                            <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Risk</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={villageFilter} onValueChange={setVillageFilter}>
                        <SelectTrigger className="bg-white/10 border-purple-500 text-white">
                            <SelectValue placeholder="Village" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Villages</SelectItem>
                            {villages.map(v => (
                                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Desktop Table - Compact & Data-Dense */}
                <div className="hidden md:block">
                    <Card className="bg-white/10 backdrop-blur-lg border-purple-700 overflow-hidden">
                        <CardContent className="p-0" id="customers-table">
                            <div className="overflow-x-auto">
                                <table className="w-full text-white text-sm">
                                    <thead className="bg-purple-900/70 border-b-2 border-purple-600">
                                    <tr>
                                        <th className="text-center py-4 px-3">
                                            <Checkbox checked={selectedRows.length === paginatedCustomers.length && paginatedCustomers.length > 0} onCheckedChange={toggleSelectAll} />
                                        </th>
                                        <th className="text-left py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('name')}>
                                            Customer <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                        </th>
                                        <th className="text-center py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('phone')}>
                                            Phone <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                        </th>
                                        <th className="text-center py-4 px-6 font-semibold">Village</th>
                                        <th className="text-center py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('monthly_fee')}>
                                            Fee <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                        </th>
                                        <th className="text-center py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('balance')}>
                                            Balance <ArrowUpDown className="w-4 h-4 inline ml-1" />
                                        </th>
                                        <th className="text-center py-4 px-6 font-semibold">Status</th>
                                        <th className="text-center py-4 px-6 font-semibold">Risk</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paginatedCustomers.map((c: any) => (
                                        <motion.tr
                                            key={c.id}
                                            className="border-b border-purple-900/50 hover:bg-purple-900/40 cursor-pointer transition-all"
                                            onClick={() => {
                                                setSelectedCustomer(c);
                                                setProfileMode("view");
                                            }}
                                        >
                                            <td className="text-center py-3 px-3">
                                                <Checkbox checked={selectedRows.includes(c.id)} onCheckedChange={() => toggleSelectRow(c.id)} />
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-9 h-9">
                                                        <AvatarFallback className="text-xs">{c.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{c.name}</p>
                                                        <p className="text-xs text-purple-300">{c.email || "No email"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center py-3 px-6">{c.phone}</td>
                                            <td className="text-center py-3 px-6 text-sm">{c.village_name || "N/A"}</td>
                                            <td className="text-center py-3 px-6">RWF {parseFloat(c.monthly_fee).toLocaleString()}</td>
                                            <td className="text-center py-3 px-6">
                                                <p className={`text-xl font-bold ${c.balance > 0 ? "text-red-400" : c.balance < 0 ? "text-green-400" : "text-gray-400"}`}>
                                                    RWF {Math.abs(parseFloat(c.balance)).toLocaleString()}
                                                </p>
                                                <Badge variant={c.balance > 0 ? "destructive" : c.balance < 0 ? "default" : "secondary"} className="text-xs">
                                                    {c.balance_status}
                                                </Badge>
                                            </td>
                                            <td className="text-center py-3 px-6">
                                                <Badge className="text-xs">{c.status}</Badge>
                                            </td>
                                            <td className="text-center py-3 px-6">
                                                <Badge variant={c.risk_level === "Critical" ? "destructive" : c.risk_level === "High" ? "secondary" : "outline"} className="text-xs">
                                                    {c.risk_level}
                                                </Badge>
                                            </td>
                                        </motion.tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Mobile List View */}
                <div className="lg:hidden space-y-6">
                    {paginatedCustomers.map((c: any) => (
                        <Card
                            key={c.id}
                            className="bg-white/10 backdrop-blur-lg border-purple-700 cursor-pointer hover:border-purple-500 transition-all"
                            onClick={() => {
                                setSelectedCustomer(c);
                                setProfileMode("view");
                                setDeleteConfirm(false);
                            }}
                        >
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <Checkbox
                                            checked={selectedRows.includes(c.id)}
                                            onCheckedChange={() => toggleSelectRow(c.id)}
                                        />
                                        <Avatar className="w-16 h-16">
                                            <AvatarFallback>{c.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-2xl font-bold text-white">{c.name}</p>
                                            <p className="text-purple-300">{c.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-3xl font-black ${
                                            c.balance > 0 ? "text-red-400" :
                                                c.balance < 0 ? "text-green-400" : "text-gray-400"
                                        }`}>
                                            RWF {Math.abs(c.balance).toLocaleString()}
                                        </p>
                                        <Badge variant={c.balance > 0 ? "destructive" : "default"}>
                                            {c.balance_status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><MapPin className="inline w-4" /> {c.village_name || "N/A"}</div>
                                    <div><DollarSign className="inline w-4" /> RWF {c.monthly_fee.toLocaleString()}</div>
                                    <div>Risk: <Badge>{c.risk_level}</Badge></div>
                                    <div>Status: <Badge>{c.status}</Badge></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-center mt-12 gap-3">
                    <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <Button
                            key={i + 1}
                            variant={currentPage === i + 1 ? "default" : "outline"}
                            onClick={() => setCurrentPage(i + 1)}
                        >
                            {i + 1}
                        </Button>
                    ))}
                    <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                        <ChevronRight />
                    </Button>
                </div>
            </div>

            {selectedCustomer && (
                <CustomerProfile
                    customerId={selectedCustomer.id}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}

            {registerOpen && (
                <CustomerRegister
                    onClose={() => setRegisterOpen(false)}
                    villages={villages}
                    onSuccess={() => window.location.reload()}
                />
            )}

            {/* MODAL - Complete Professional Modal with Search, Sort, Pagination & Export */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col
                        md:max-w-5xl lg:max-w-6xl
                        sm:w-full sm:mx-4
                        xs:w-[95vw]">
                        {/* Header */}
                        <div className="p-6 md:p-8 border-b border-purple-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
                            <h2 className="text-2xl md:text-4xl font-black text-white truncate pr-4">{modalTitle}</h2>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={exportModalToCSV} variant="outline" size="sm" className="text-white border-purple-500 hover:bg-purple-800">
                                    <Download className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">CSV</span>
                                </Button>
                                <Button onClick={exportModalToPDF} variant="outline" size="sm" className="text-white border-purple-500 hover:bg-purple-800">
                                    <FileText className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">PDF</span>
                                </Button>
                                <Button onClick={exportModalToExcel} variant="outline" size="sm" className="text-white border-green-500 hover:bg-green-800">
                                    <Download className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Excel</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setModalOpen(false);
                                        setModalSearch("");
                                        setModalPage(1);
                                        setModalSortConfig(null);
                                    }}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="px-6 md:px-8 py-4 flex-shrink-0">
                            <div className="relative">
                                <Search className="absolute left-4 top-4 w-5 h-5 text-purple-300" />
                                <Input
                                    placeholder="Search customers..."
                                    value={modalSearch}
                                    onChange={(e) => setModalSearch(e.target.value)}
                                    className="pl-11 pr-4 py-5 bg-white/10 border-purple-500 text-white placeholder-purple-300 w-full"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto px-4 md:px-8 pb-4">
                            {modalCustomers.length === 0 ? (
                                <p className="text-center text-xl text-purple-300 py-12">No customers match this category</p>
                            ) : (
                                <>
                                    {(() => {
                                        let displayed = modalCustomers;

                                        // Search
                                        if (modalSearch) {
                                            const q = modalSearch.toLowerCase();
                                            displayed = displayed.filter(c =>
                                                c.name?.toLowerCase().includes(q) ||
                                                c.phone?.includes(q) ||
                                                c.email?.toLowerCase().includes(q) ||
                                                c.village_name?.toLowerCase().includes(q) ||
                                                c.payment_account?.includes(q)
                                            );
                                        }

                                        // Sorting
                                        if (modalSortConfig) {
                                            displayed = [...displayed].sort((a, b) => {
                                                let aVal = a[modalSortConfig.key];
                                                let bVal = b[modalSortConfig.key];

                                                if (['monthly_fee', 'balance'].includes(modalSortConfig.key)) {
                                                    aVal = parseFloat(aVal || 0);
                                                    bVal = parseFloat(bVal || 0);
                                                }

                                                if (typeof aVal === 'string' && typeof bVal === 'string') {
                                                    return modalSortConfig.direction === 'asc'
                                                        ? aVal.localeCompare(bVal)
                                                        : bVal.localeCompare(aVal);
                                                }
                                                return modalSortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
                                            });
                                        }

                                        const pages = Math.ceil(displayed.length / modalItemsPerPage);
                                        const pageData = displayed.slice(
                                            (modalPage - 1) * modalItemsPerPage,
                                            modalPage * modalItemsPerPage
                                        );

                                        return (
                                            <>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-white min-w-[700px]">
                                                        <thead className="bg-purple-900/50 sticky top-0">
                                                        <tr>
                                                            <th className="text-left py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('name')}>
                                                                <div className="flex items-center gap-2">Name <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                            <th className="text-left py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('phone')}>
                                                                <div className="flex items-center gap-2">Phone <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                            <th className="text-left py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('village_name')}>
                                                                <div className="flex items-center gap-2">Village <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                            <th className="text-right py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('monthly_fee')}>
                                                                <div className="flex items-center gap-2 justify-end">Fee <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                            <th className="text-right py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('balance')}>
                                                                <div className="flex items-center gap-2 justify-end">Balance <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                            <th className="text-center py-3 px-4 cursor-pointer hover:bg-purple-800/50" onClick={() => handleModalSort('status')}>
                                                                <div className="flex items-center gap-2 justify-center">Status <ArrowUpDown className="w-4 h-4" /></div>
                                                            </th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {pageData.length === 0 ? (
                                                            <tr><td colSpan={6} className="text-center py-12 text-purple-300">No results</td></tr>
                                                        ) : (
                                                            pageData.map(c => (
                                                                <tr key={c.id} className="border-b border-purple-800 hover:bg-purple-900/30">
                                                                    <td className="py-3 px-4">{c.name}</td>
                                                                    <td className="py-3 px-4">{c.phone}</td>
                                                                    <td className="py-3 px-4">{c.village_name || "N/A"}</td>
                                                                    <td className="py-3 px-4 text-right">RWF {parseFloat(c.monthly_fee || 0).toLocaleString()}</td>
                                                                    <td className="py-3 px-4 text-right">
                                                                <span className={parseFloat(c.balance || 0) > 0 ? "text-red-400" : parseFloat(c.balance || 0) < 0 ? "text-green-400" : "text-gray-400"}>
                                                                    RWF {Math.abs(parseFloat(c.balance || 0)).toLocaleString()}
                                                                </span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center"><Badge>{c.status}</Badge></td>
                                                                </tr>
                                                            ))
                                                        )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Pagination */}
                                                {displayed.length > modalItemsPerPage && (
                                                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                                                        <Button disabled={modalPage === 1} onClick={() => setModalPage(p => p - 1)} variant="outline" size="sm">
                                                            <ChevronLeft className="w-4 h-4" />
                                                        </Button>
                                                        {Array.from({ length: pages }, (_, i) => (
                                                            <Button
                                                                key={i + 1}
                                                                variant={modalPage === i + 1 ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => setModalPage(i + 1)}
                                                            >
                                                                {i + 1}
                                                            </Button>
                                                        ))}
                                                        <Button disabled={modalPage === pages} onClick={() => setModalPage(p => p + 1)} variant="outline" size="sm">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
