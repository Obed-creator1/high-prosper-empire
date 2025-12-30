// components/customer/CustomerProfile.tsx — FULLY WORKING & PROFESSIONAL
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
    User, Phone, Mail, MapPin, Calendar, DollarSign,
    FileText, Tag, AlertCircle, Shield, Download, X,
    Trash2, Edit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import toast from "react-hot-toast";
import CustomerRegister from "@/components/auth/CustomerRegister";

interface CustomerProfileProps {
    customerId: number;
    onClose: () => void;
    onCustomerUpdated?: () => void; // Optional callback to refresh list
}

export default function CustomerProfile({
                                            customerId,
                                            onClose,
                                            onCustomerUpdated
                                        }: CustomerProfileProps) {
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [villages, setVillages] = useState<any[]>([]);
    const [profileMode, setProfileMode] = useState<"view" | "edit">("view");
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    // Fetch customer detail
    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                // Fetch full customer with payments
                const res = await api.get(`/customers/customers/${customerId}/`);
                // If payments not included, fetch separately
                const paymentsRes = await api.get(`payments/my-payments/?customer=${customerId}`);
                setCustomer({
                    ...res.data,
                    payments: paymentsRes.data.results || paymentsRes.data || []
                });
            } catch (err) {
                toast.error("Failed to load customer details");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomer();
    }, [customerId]);

    // Fetch villages for edit form
    useEffect(() => {
        const fetchVillages = async () => {
            try {
                const res = await api.get("/customers/villages-list/");
                setVillages(res.data);
            } catch (err) {
                console.error("Failed to load villages");
            }
        };

        fetchVillages();
    }, []);

    const refreshCustomer = async () => {
        try {
            const res = await api.get(`/customers/customers/${customerId}/`);
            setCustomer(res.data);
        } catch (err) {
            toast.error("Failed to refresh customer data");
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/customers/customers/${customerId}/`);
            toast.success("Customer deleted successfully");
            onCustomerUpdated?.();
            onClose();
        } catch (err) {
            toast.error("Failed to delete customer");
        }
    };

    if (loading) return <Loader fullScreen />;

    if (!customer) {
        return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
                <Card className="bg-red-900/50 border-red-700 p-12 text-center">
                    <AlertCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-white">Customer Not Found</h2>
                    <Button onClick={onClose} className="mt-8">Close</Button>
                </Card>
            </div>
        );
    }

    const balance = parseFloat(customer.balance || 0);
    const balanceColor = balance > 0 ? "text-red-400" : balance < 0 ? "text-green-400" : "text-gray-400";

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto"
                >
                    {/* Header */}
                    <Card className="bg-gradient-to-br from-purple-900 to-slate-900 border-purple-700 mb-6">
                        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 bg-purple-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    <User className="w-12 h-12 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-black text-white">{customer.name}</h1>
                                    <div className="flex flex-wrap items-center gap-4 mt-4">
                                        <Badge variant="secondary" className="text-lg px-4 py-2">
                                            {customer.status}
                                        </Badge>
                                        <Badge
                                            variant={customer.risk_level === "Critical" ? "destructive" :
                                                customer.risk_level === "High" ? "secondary" : "outline"}
                                            className="text-lg px-4 py-2"
                                        >
                                            <Shield className="w-4 h-4 mr-2" />
                                            {customer.risk_level} Risk
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                                {profileMode === "view" ? (
                                    <>
                                        <Button
                                            onClick={() => setProfileMode("edit")}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Edit className="w-5 h-5 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            onClick={() => setDeleteConfirm(true)}
                                            variant="destructive"
                                        >
                                            <Trash2 className="w-5 h-5 mr-2" />
                                            Delete
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        onClick={() => setProfileMode("view")}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-8 h-8" />
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* View Mode - Profile Details */}
                    {profileMode === "view" && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Personal Info */}
                            <div className="space-y-6">
                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <User className="w-6 h-6" />
                                            Personal Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-white">
                                        <div><p className="text-purple-300 text-sm">Customer ID</p><p className="text-xl">{customer.id}</p></div>
                                        <div><p className="text-purple-300 text-sm">UID</p><p className="text-xl">{customer.uid}</p></div>
                                        <div><p className="text-purple-300 text-sm flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</p><p className="text-xl">{customer.phone}</p></div>
                                        <div><p className="text-purple-300 text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Email</p><p className="text-xl">{customer.email || "Not provided"}</p></div>
                                        <div><p className="text-purple-300 text-sm">National ID</p><p className="text-xl">{customer.nid || "Not provided"}</p></div>
                                        <div><p className="text-purple-300 text-sm">Gender</p><p className="text-xl">{customer.gender === "M" ? "Male" : customer.gender === "F" ? "Female" : customer.gender === "O" ? "Other" : "Not specified"}</p></div>
                                        <div><p className="text-purple-300 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Date of Birth</p><p className="text-xl">{customer.date_of_birth ? format(new Date(customer.date_of_birth), "dd MMM yyyy") : "Not provided"}</p></div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <MapPin className="w-6 h-6" />
                                            Location
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-white">
                                        <div><p className="text-purple-300 text-sm">Village</p><p className="text-xl">{customer.village_name || "N/A"}</p></div>
                                        <div className="mt-4">
                                            <p className="text-purple-300 text-sm">Collector</p>
                                            <p className="text-xl">{customer.collector_name || "Unassigned"}</p>
                                            {customer.collector_phone && <p className="text-lg text-purple-300">{customer.collector_phone}</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Financial & Contract */}
                            <div className="space-y-6">
                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <DollarSign className="w-6 h-6" />
                                            Financial Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-purple-300 text-sm">Current Balance</p>
                                                <p className={`text-4xl font-black ${balanceColor}`}>RWF {Math.abs(balance).toLocaleString()}</p>
                                                <Badge className="mt-2">{customer.balance_status}</Badge>
                                            </div>
                                            <div>
                                                <p className="text-purple-300 text-sm">Monthly Fee</p>
                                                <p className="text-4xl font-black text-white">RWF {parseFloat(customer.monthly_fee || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="bg-white/5 rounded-xl p-4">
                                                <p className="text-purple-300 text-sm">Total Paid</p>
                                                <p className="text-2xl font-bold text-green-400">RWF {parseFloat(customer.total_paid || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="bg-white/5 rounded-xl p-4">
                                                <p className="text-purple-300 text-sm">Days Delinquent</p>
                                                <p className="text-2xl font-bold text-orange-400">{customer.days_delinquent}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><p className="text-purple-300 text-sm">Unpaid Months</p><p className="text-2xl font-bold text-red-400">{customer.unpaid_months.toFixed(1)}</p></div>
                                            <div><p className="text-purple-300 text-sm">Overpaid Months</p><p className="text-2xl font-bold text-green-400">{customer.overpaid_months.toFixed(1)}</p></div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <FileText className="w-6 h-6" />
                                            Contract Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-white">
                                        <div><p className="text-purple-300 text-sm">Contract Number</p><p className="text-xl">{customer.contract_no}</p></div>
                                        <div><p className="text-purple-300 text-sm">Payment Account</p><p className="text-xl">{customer.payment_account}</p></div>
                                        <div><p className="text-purple-300 text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Connection Date</p><p className="text-xl">{format(new Date(customer.connection_date), "dd MMMM yyyy")}</p></div>
                                        {customer.contract_file && (
                                            <Button asChild variant="outline" className="w-full mt-4">
                                                <a href={customer.contract_file} target="_blank" rel="noopener noreferrer">
                                                    <Download className="w-5 h-5 mr-2" />
                                                    Download Contract
                                                </a>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Risk & Notes */}
                            <div className="space-y-6">
                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <AlertCircle className="w-6 h-6" />
                                            Risk Profile
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-center">
                                        <div className="text-6xl font-black text-white mb-4">{customer.risk_score.toFixed(0)}</div>
                                        <Badge
                                            variant={customer.risk_level === "Critical" ? "destructive" : customer.risk_level === "High" ? "secondary" : "outline"}
                                            className="text-2xl px-6 py-3"
                                        >
                                            {customer.risk_level} Risk
                                        </Badge>
                                    </CardContent>
                                </Card>

                                {customer.tags && customer.tags.length > 0 && (
                                    <Card className="bg-white/5 backdrop-blur border-purple-700">
                                        <CardHeader>
                                            <CardTitle className="text-2xl text-white flex items-center gap-3">
                                                <Tag className="w-6 h-6" />
                                                Tags
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {customer.tags.map((tag: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-lg px-4 py-2">{tag}</Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {customer.notes && (
                                    <Card className="bg-white/5 backdrop-blur border-purple-700">
                                        <CardHeader>
                                            <CardTitle className="text-2xl text-white">Notes</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{customer.notes}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardContent className="pt-6 space-y-3 text-sm text-purple-300">
                                        <div className="flex justify-between">
                                            <span>Created</span>
                                            <span className="font-medium text-white">{format(new Date(customer.created_at), "dd MMM yyyy, HH:mm")}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Updated</span>
                                            <span className="font-medium text-white">{format(new Date(customer.updated_at), "dd MMM yyyy, HH:mm")}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Payment History - NEW SECTION */}
                            <div className="space-y-6">
                                <Card className="bg-white/5 backdrop-blur border-purple-700">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                                            <DollarSign className="w-6 h-6" />
                                            Payment History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {customer.payments && customer.payments.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-white">
                                                    <thead className="bg-purple-900/50">
                                                    <tr>
                                                        <th className="text-left py-3 px-4 text-sm">Date</th>
                                                        <th className="text-right py-3 px-4 text-sm">Amount</th>
                                                        <th className="text-left py-3 px-4 text-sm">Method</th>
                                                        <th className="text-center py-3 px-4 text-sm">Status</th>
                                                        <th className="text-left py-3 px-4 text-sm">Reference</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {customer.payments
                                                        .sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())
                                                        .map((payment: any, i: number) => {
                                                            const statusColor = payment.status === "Paid" ? "text-green-400" :
                                                                payment.status === "Pending" ? "text-yellow-400" :
                                                                    "text-red-400";
                                                            return (
                                                                <tr
                                                                    key={i}
                                                                    className="border-b border-purple-800 hover:bg-purple-900/50 cursor-pointer transition-all"
                                                                    onClick={() => setSelectedPayment(payment)}
                                                                >
                                                                    <td className="py-3 px-4 text-sm">
                                                                        {payment.completed_at ? format(new Date(payment.completed_at), "dd MMM yyyy") : "-"}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-right font-medium">
                                                                        RWF {parseFloat(payment.amount || 0).toLocaleString()}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-sm">{payment.method_name || payment.method || "N/A"}</td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <Badge variant={payment.status === "Paid" ? "default" : payment.status === "Pending" ? "secondary" : "destructive"}>
                                                                            <span className={statusColor}>{payment.status}</span>
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-sm">{payment.reference || "-"}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center text-purple-300 py-8">No payment history available</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Edit Mode */}
                    {profileMode === "edit" && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8"
                        >
                            <Card className="bg-gradient-to-br from-white/5 to-purple-900/20 backdrop-blur-lg border-purple-600 shadow-2xl">
                                <CardHeader className="border-b border-purple-700">
                                    <CardTitle className="text-3xl font-black text-white flex items-center gap-4">
                                        <Edit className="w-8 h-8 text-purple-300" />
                                        Edit Customer Profile
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-8">
                                    <CustomerRegister
                                        initialData={customer}
                                        isEditMode={true}
                                        villages={villages}
                                        onSuccess={async () => {
                                            await refreshCustomer();
                                            setProfileMode("view");
                                            toast.success("Customer updated successfully!");
                                            onCustomerUpdated?.();
                                        }}
                                        onClose={() => setProfileMode("view")}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Delete Confirmation */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60">
                            <Card className="bg-red-900/90 border-red-700 p-8 text-center max-w-md">
                                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-white mb-4">Delete Customer?</h3>
                                <p className="text-red-200 mb-8">
                                    This action cannot be undone. All data for <strong>{customer.name}</strong> will be permanently deleted.
                                </p>
                                <div className="flex gap-4 justify-center">
                                    <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={handleDelete}>
                                        Delete Permanently
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Payment Details Modal */}
                    {selectedPayment && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            >
                                <div className="p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-4xl font-black text-white flex items-center gap-4">
                                            <DollarSign className="w-10 h-10 text-green-400" />
                                            Payment Details
                                        </h2>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedPayment(null)}
                                            className="text-white hover:bg-white/20"
                                        >
                                            <X className="w-8 h-8" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-purple-300 text-sm">Amount</p>
                                                <p className="text-4xl font-black text-green-400">
                                                    RWF {parseFloat(selectedPayment.amount || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-purple-300 text-sm">Status</p>
                                                <Badge
                                                    variant={selectedPayment.status === "Paid" ? "default" :
                                                        selectedPayment.status === "Pending" ? "secondary" : "destructive"}
                                                    className="text-2xl px-6 py-3"
                                                >
                                                    {selectedPayment.status}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-purple-300 text-sm">Payment Method</p>
                                                <p className="text-2xl text-white">{selectedPayment.method_name || selectedPayment.method || "N/A"}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <p className="text-purple-300 text-sm">Reference / Transaction ID</p>
                                                <p className="text-xl text-white break-all">{selectedPayment.reference || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-purple-300 text-sm">Completed At</p>
                                                <p className="text-xl text-white">
                                                    {selectedPayment.completed_at
                                                        ? format(new Date(selectedPayment.completed_at), "dd MMMM yyyy, HH:mm")
                                                        : "Pending"}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-purple-300 text-sm">UID</p>
                                                <p className="text-lg text-white">{selectedPayment.uid || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-purple-700 text-center">
                                        <p className="text-purple-300 text-sm">
                                            Payment recorded for customer: <span className="text-white font-semibold">{customer.name}</span>
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}