// app/dashboard/customer/servicerequest/page.tsx — HIGH PROSPER SERVICE REQUESTS 2026
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import {
    Building2, Phone, Mail, MapPin, Calendar, DollarSign, Clock, UserCheck,
    AlertCircle, CheckCircle2, XCircle, Plus, Edit, Trash2, MoreVertical,
    Search, Filter, ChevronDown, User, FileText, MessageSquare, Check,
    Download, FileSpreadsheet, Send, CreditCard, History, Users, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const ALLOWED_ROLES = ['admin', 'ceo', 'manager', 'supervisor', 'collector'];

const STATUS_CONFIG = {
    pending: { color: "bg-gray-500", icon: Clock, label: "Pending" },
    quoted: { color: "bg-blue-500", icon: FileText, label: "Quoted" },
    accepted: { color: "bg-indigo-500", icon: CheckCircle2, label: "Accepted" },
    in_progress: { color: "bg-yellow-500", icon: AlertCircle, label: "In Progress" },
    completed: { color: "bg-green-500", icon: CheckCircle2, label: "Completed" },
    cancelled: { color: "bg-red-500", icon: XCircle, label: "Cancelled" },
    rejected: { color: "bg-pink-500", icon: XCircle, label: "Rejected" },
};

const PAYMENT_STATUS_CONFIG = {
    unpaid: { color: "bg-red-500", label: "Unpaid" },
    partially_paid: { color: "bg-yellow-500", label: "Partially Paid" },
    paid: { color: "bg-green-500", label: "Paid" },
    refunded: { color: "bg-purple-500", label: "Refunded" },
};

export default function ServiceRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [auditOpen, setAuditOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>("");

    // Forms
    const [requestForm, setRequestForm] = useState({
        title: "", description: "", requester_name: "", requester_phone: "",
        requester_email: "", village: "", address_details: "", requested_date: ""
    });

    const [assignForm, setAssignForm] = useState({ assigned_to: "", notes: "" });
    const [auditForm, setAuditForm] = useState({ final_amount: 0, notes: "", satisfaction_score: "" });

    useEffect(() => {
        const role = Cookies.get("role")?.toLowerCase();
        if (!ALLOWED_ROLES.includes(role)) {
            setAccessDenied(true);
            toast.error("Access denied");
            setTimeout(() => router.push("/dashboard"), 2000);
            return;
        }
        setUserRole(role);
        fetchRequests();
    }, [router]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get("/customers/service-requests/");
            const data = res.data.results || res.data || [];
            setRequests(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error("Failed to load requests");
            setRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch =
            r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.requester_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.requester_phone?.includes(searchTerm);
        const matchesStatus = statusFilter === "all" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleCreate = async () => {
        try {
            await api.post("/customers/service-requests/", requestForm);
            toast.success("Request created");
            setCreateOpen(false);
            setRequestForm({
                title: "", description: "", requester_name: "", requester_phone: "",
                requester_email: "", village: "", address_details: "", requested_date: ""
            });
            fetchRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed");
        }
    };

    const handleAssign = async () => {
        try {
            await api.post(`/customers/service-requests/${selectedRequest.id}/assign/`, assignForm);
            toast.success("Assigned successfully");
            setAssignOpen(false);
            fetchRequests();
        } catch (err) {
            toast.error("Assignment failed");
        }
    };

    const handleAudit = async () => {
        try {
            await api.post(`/customers/service-requests/${selectedRequest.id}/complete/`, auditForm);
            toast.success("Service completed & audited");
            setAuditOpen(false);
            fetchRequests();
        } catch (err) {
            toast.error("Audit failed");
        }
    };

    const handleInitiatePayment = async (id: number) => {
        try {
            await api.post(`/customers/service-requests/${id}/initiate-payment/`);
            toast.success("Payment link sent! Customer can dial *182*7*1# to pay");
        } catch (err) {
            toast.error("Failed to initiate payment");
        }
    };

    const handleDelete = async (id: number) => {
        if (!isFullControl) {
            toast.error("You don't have permission to delete requests");
            return;
        }

        const confirmed = window.confirm(
            "⚠️ PERMANENT DELETE\n\n" +
            "Delete this service request?\n\n" +
            "• All data will be lost\n" +
            "• Cannot be recovered\n" +
            "• Payments will remain in ledger\n\n" +
            "Type 'DELETE' to confirm:"
        );

        if (confirmed && prompt("Type 'DELETE' to confirm")?.toUpperCase() !== "DELETE") {
            toast.info("Delete cancelled");
            return;
        }

        try {
            // Show loading feedback
            toast.loading("Deleting request...", { id: "delete-toast" });

            await api.delete(`/customers/service-requests/${id}/`);

            // Success feedback
            toast.success("Service request deleted successfully", { id: "delete-toast" });

            // Update UI - remove from list
            setRequests(prev => prev.filter(req => req.id !== id));

            // Close profile if open and matches
            if (selectedRequest?.id === id) {
                setProfileOpen(false);
                setSelectedRequest(null);
            }
        } catch (err: any) {
            console.error("Delete error:", err);

            const errorMsg = err.response?.data?.detail ||
                err.response?.data?.error ||
                "Failed to delete request. It may have payments or be protected.";

            toast.error(errorMsg, { id: "delete-toast", duration: 8000 });
        }
    };


    const exportToPDF = (request: any) => {
        const element = document.createElement("div");
        element.innerHTML = `
      <h1>Service Request #${request.id}</h1>
      <p><strong>Title:</strong> ${request.title}</p>
      <p><strong>Requester:</strong> ${request.requester_name} (${request.requester_phone})</p>
      <p><strong>Status:</strong> ${request.status}</p>
      <p><strong>Quoted:</strong> RWF ${request.quoted_amount}</p>
      <p><strong>Balance:</strong> RWF ${request.balance_due}</p>
    `;
        document.body.appendChild(element);
        html2canvas(element).then(canvas => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF();
            pdf.addImage(imgData, "PNG", 10, 10);
            pdf.save(`ServiceRequest_${request.id}.pdf`);
            document.body.removeChild(element);
        });
    };

    const exportAllToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(requests.map(r => ({
            ID: r.id,
            Title: r.title,
            Requester: r.requester_name,
            Phone: r.requester_phone,
            Village: r.village_name,
            Status: r.status,
            Payment: r.payment_status,
            Quoted: r.quoted_amount,
            Balance: r.balance_due,
            Date: new Date(r.created_at).toLocaleDateString()
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Requests");
        XLSX.writeFile(wb, "ServiceRequests_All.xlsx");
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

    const isFullControl = ['admin', 'ceo'].includes(userRole);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-slate-100 dark:from-gray-950 dark:via-purple-950 dark:to-slate-950 p-4 md:p-6 lg:p-8">
            <div className="max-w-screen-2xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white">
                            Service Requests Intelligence
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                            One-off gigs & special services — full lifecycle management
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={exportAllToExcel} variant="outline">
                            <FileSpreadsheet className="w-5 h-5 mr-2" /> Export Excel
                        </Button>
                        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600">
                            <Plus className="w-5 h-5 mr-2" /> New Request
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input placeholder="Search requests..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-64">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRequests.map((req) => {
                        const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                        const paymentCfg = PAYMENT_STATUS_CONFIG[req.payment_status] || PAYMENT_STATUS_CONFIG.unpaid;
                        const StatusIcon = statusCfg.icon;

                        return (
                            <Card
                                key={req.id}
                                className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-purple-500 dark:hover:border-purple-400"
                                onClick={() => {
                                    setSelectedRequest(req);
                                    setProfileOpen(true);
                                }}
                            >
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold line-clamp-2">{req.title}</h3>
                                            <div className="flex gap-2 mt-3">
                                                <Badge className={`${statusCfg.color} text-white`}>{statusCfg.label}</Badge>
                                                <Badge className={`${paymentCfg.color} text-white`}>{paymentCfg.label}</Badge>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-5 h-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setAssignOpen(true); }}>
                                                    <UserCheck className="w-4 h-4 mr-2" /> Assign
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleInitiatePayment(req.id); }}>
                                                    <CreditCard className="w-4 h-4 mr-2" /> Initiate Payment
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportToPDF(req); }}>
                                                    <Download className="w-4 h-4 mr-2" /> Export PDF
                                                </DropdownMenuItem>
                                                {isFullControl && (
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(selectedRequest.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Request
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium">{req.requester_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-500" />
                                            <span>{req.requester_phone}</span>
                                        </div>
                                        {req.village_name && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-gray-500" />
                                                <span>{req.village_name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Quoted</p>
                                            <p className="font-bold text-lg">RWF {Number(req.quoted_amount || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Due</p>
                                            <p className={`font-bold text-lg ${req.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                RWF {Number(req.balance_due || 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Full Service Request Profile Modal */}
                <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                    <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 bg-white dark:bg-gray-900">
                        {/* Header */}
                        <DialogHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white p-8 pb-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <DialogTitle className="text-4xl font-black leading-tight">
                                        Request #{selectedRequest?.id}
                                    </DialogTitle>
                                    <p className="text-2xl font-semibold mt-2 text-white/90">
                                        {selectedRequest?.title}
                                    </p>
                                    <div className="flex items-center gap-4 mt-4">
                                        <Badge className={`${STATUS_CONFIG[selectedRequest?.status]?.color || 'bg-gray-500'} text-white px-4 py-2 text-lg`}>
                                            {STATUS_CONFIG[selectedRequest?.status]?.label || selectedRequest?.status}
                                        </Badge>
                                        <Badge className={`${PAYMENT_STATUS_CONFIG[selectedRequest?.payment_status]?.color || 'bg-gray-500'} text-white px-4 py-2 text-lg`}>
                                            {PAYMENT_STATUS_CONFIG[selectedRequest?.payment_status]?.label || selectedRequest?.payment_status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm opacity-80">Requested</p>
                                    <p className="text-xl font-bold">
                                        {selectedRequest?.created_at ? new Date(selectedRequest.created_at).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Tabs */}
                        <Tabs defaultValue="details" className="w-full h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-4 rounded-none bg-gray-100 dark:bg-gray-800 border-b">
                                <TabsTrigger value="details" className="text-base py-4">Details</TabsTrigger>
                                <TabsTrigger value="assignment" className="text-base py-4">Assignment</TabsTrigger>
                                <TabsTrigger value="audit" className="text-base py-4">Audit & Approval</TabsTrigger>
                                <TabsTrigger value="payments" className="text-base py-4">Payments</TabsTrigger>
                            </TabsList>

                            <div className="flex-1 overflow-hidden">
                                <ScrollArea className="h-full px-8 py-6">
                                    {/* === DETAILS TAB === */}
                                    <TabsContent value="details" className="mt-0 space-y-8">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Requester */}
                                            <Card className="border-purple-200 dark:border-purple-800">
                                                <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                    <CardTitle className="flex items-center gap-3 text-xl">
                                                        <User className="w-6 h-6" /> Requester Information
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <User className="w-5 h-5 text-gray-500" />
                                                        <div>
                                                            <p className="font-semibold text-lg">{selectedRequest?.requester_name}</p>
                                                            {selectedRequest?.customer && (
                                                                <p className="text-sm text-purple-600">Existing Customer</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Phone className="w-5 h-5 text-gray-500" />
                                                        <p className="font-medium">{selectedRequest?.requester_phone}</p>
                                                    </div>
                                                    {selectedRequest?.requester_email && (
                                                        <div className="flex items-center gap-3">
                                                            <Mail className="w-5 h-5 text-gray-500" />
                                                            <p>{selectedRequest.requester_email}</p>
                                                        </div>
                                                    )}
                                                    {selectedRequest?.requester_nid && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">National ID</p>
                                                            <p className="font-medium">{selectedRequest.requester_nid}</p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Location */}
                                            <Card className="border-purple-200 dark:border-purple-800">
                                                <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                    <CardTitle className="flex items-center gap-3 text-xl">
                                                        <MapPin className="w-6 h-6" /> Location
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-4">
                                                    {selectedRequest?.village_name && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Village</p>
                                                            <p className="font-semibold text-lg">{selectedRequest.village_name}</p>
                                                        </div>
                                                    )}
                                                    {selectedRequest?.sector_name && (
                                                        <div>
                                                            <p className="text-sm text-gray-500">Sector</p>
                                                            <p className="font-medium">{selectedRequest.sector_name}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm text-gray-500">Full Address</p>
                                                        <p className="font-medium leading-relaxed">{selectedRequest?.address_details || "Not provided"}</p>
                                                    </div>
                                                    {selectedRequest?.requested_date && (
                                                        <div className="flex items-center gap-3">
                                                            <Calendar className="w-5 h-5 text-gray-500" />
                                                            <div>
                                                                <p className="text-sm text-gray-500">Preferred Date</p>
                                                                <p className="font-medium">
                                                                    {new Date(selectedRequest.requested_date).toLocaleDateString('en-GB', {
                                                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Description */}
                                        <Card className="border-purple-200 dark:border-purple-800">
                                            <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                <CardTitle className="flex items-center gap-3 text-xl">
                                                    <MessageSquare className="w-6 h-6" /> Service Description
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                                    {selectedRequest?.description || "No description provided."}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* === ASSIGNMENT TAB === */}
                                    <TabsContent value="assignment" className="mt-0">
                                        <Card className="border-purple-200 dark:border-purple-800">
                                            <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                <CardTitle className="flex items-center justify-between text-xl">
                                                    <div className="flex items-center gap-3">
                                                        <UserCheck className="w-6 h-6" /> Field Assignment
                                                    </div>
                                                    <Button onClick={() => setAssignOpen(true)} size="sm">
                                                        Reassign
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                {selectedRequest?.assigned_to_name ? (
                                                    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                                                        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                                            {selectedRequest.assigned_to_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-bold">{selectedRequest.assigned_to_name}</p>
                                                            <p className="text-gray-600 dark:text-gray-400">Field Staff</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-center text-gray-500 py-12">No staff assigned yet</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* === AUDIT & APPROVAL TAB === */}
                                    <TabsContent value="audit" className="mt-0">
                                        <Card className="border-purple-200 dark:border-purple-800">
                                            <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                <CardTitle className="flex items-center justify-between text-xl">
                                                    <div className="flex items-center gap-3">
                                                        <ClipboardList className="w-6 h-6" /> Audit & Final Approval
                                                    </div>
                                                    {selectedRequest?.status !== 'completed' && (
                                                        <Button onClick={() => setAuditOpen(true)} disabled={!isFullControl}>
                                                            Complete Service
                                                        </Button>
                                                    )}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-sm text-gray-500">Quoted Amount</p>
                                                        <p className="text-3xl font-black text-purple-600">
                                                            RWF {Number(selectedRequest?.quoted_amount || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-500">Final Amount</p>
                                                        <p className="text-3xl font-black text-green-600">
                                                            RWF {Number(selectedRequest?.final_amount || selectedRequest?.quoted_amount || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {selectedRequest?.completed_at && (
                                                    <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl">
                                                        <p className="text-green-800 dark:text-green-200 font-bold text-center text-xl">
                                                            Service Completed on {new Date(selectedRequest.completed_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedRequest?.satisfaction_score && (
                                                    <div>
                                                        <p className="text-sm text-gray-500 mb-2">Customer Satisfaction</p>
                                                        <div className="flex gap-1">
                                                            {[1,2,3,4,5].map(i => (
                                                                <span key={i} className={`text-3xl ${i <= selectedRequest.satisfaction_score ? 'text-yellow-500' : 'text-gray-300'}`}>
                          ★
                        </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedRequest?.notes && (
                                                    <div>
                                                        <p className="text-sm text-gray-500 mb-2">Completion Notes</p>
                                                        <p className="text-gray-700 dark:text-gray-300">{selectedRequest.notes}</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    {/* === PAYMENTS TAB === */}
                                    <TabsContent value="payments" className="mt-0">
                                        <Card className="border-purple-200 dark:border-purple-800">
                                            <CardHeader className="bg-purple-50 dark:bg-purple-900/30">
                                                <CardTitle className="flex items-center justify-between text-xl">
                                                    <div className="flex items-center gap-3">
                                                        <CreditCard className="w-6 h-6" /> Payment History
                                                    </div>
                                                    <Button onClick={() => handleInitiatePayment(selectedRequest.id)}>
                                                        <Send className="w-4 h-4 mr-2" /> Initiate Payment
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div className="text-center p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
                                                        <p className="text-sm opacity-90">Total Paid</p>
                                                        <p className="text-4xl font-black mt-2">
                                                            RWF {Number(selectedRequest?.total_payments || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-center p-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl text-white">
                                                        <p className="text-sm opacity-90">Final Amount</p>
                                                        <p className="text-4xl font-black mt-2">
                                                            RWF {Number(selectedRequest?.final_amount || selectedRequest?.quoted_amount || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className={`text-center p-6 rounded-xl text-white ${selectedRequest?.balance_due > 0 ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-green-500 to-teal-600'}`}>
                                                        <p className="text-sm opacity-90">Balance Due</p>
                                                        <p className="text-4xl font-black mt-2">
                                                            RWF {Number(selectedRequest?.balance_due || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Placeholder for payment history list */}
                                                <div className="text-center py-12 text-gray-500">
                                                    <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                                    <p>Payment history will appear here</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                </ScrollArea>
                            </div>

                            {/* Footer Actions */}
                            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => exportToPDF(selectedRequest)}>
                                    <Download className="w-4 h-4 mr-2" /> Export PDF
                                </Button>
                                {isFullControl && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="destructive">
                                                <MoreVertical className="w-4 h-4 mr-2" /> Actions
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => handleDelete(selectedRequest?.id)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete Request
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                <Button onClick={() => setProfileOpen(false)}>Close</Button>
                            </div>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}