// app/dashboard/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import SummaryCard from "@/components/admin/SummaryCard";
import UserTable from "@/components/admin/UserTable";
import UserModal from "@/components/admin/UserModal";
import CustomerTable from "@/components/admin/CustomerTable";
import CustomerModal from "@/components/admin/CustomerModal";

import api from "@/lib/api";

export default function AdminDashboardPage() {
    const router = useRouter();
    const token = Cookies.get("token");
    const role = Cookies.get("role") || "collector";
    const isSuperAdmin = ["admin", "ceo"].includes(role);

    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [wsNotifications, setWsNotifications] = useState<any[]>([]); // For Navbar

    // Modals
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);

    // Fetch data
    const fetchData = async () => {
        if (!token) return router.push("/login");
        try {
            const headers = { headers: { Authorization: `Token ${token}` } };
            const [uRes, cRes] = await Promise.all([
                api.get("/users/", headers),
                api.get("/customers/customers/", headers),
            ]);

            setUsers(uRes.data?.results || uRes.data || []);
            setCustomers(cRes.data?.results || cRes.data || []);
        } catch (err: any) {
            if (err.response?.status === 401) {
                Cookies.remove("token");
                router.push("/login");
            } else {
                toast.error("Failed to load data");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token, router]);

    // WebSocket for real-time notifications
    useEffect(() => {
        if (!token) return;

        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/`);
        ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "notification") {
                toast.success(data.message);
                setWsNotifications(prev => [
                    { id: Date.now(), title: "New Update", message: data.message, is_read: false },
                    ...prev.slice(0, 9),
                ]);
            }
        };
        return () => ws.close();
    }, [token]);

    const logout = () => {
        Cookies.remove("token");
        Cookies.remove("role");
        router.push("/login");
        toast.success("Logged out securely");
    };

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full mx-auto mb-6"
                    />
                    <p className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Loading High Prosper Empire...
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <>
            <Toaster position="top-right" />
            <div className="flex min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900">

                {/* Main Content */}
                <div className="flex-1 flex flex-col">

                    {/* Main Content Area */}
                    <main className="flex-1 p-8 space-y-12 overflow-y-auto">
                        {/* Summary Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                        >
                            <SummaryCard title="Total Users" value={users.length} icon="users" trend="up" />
                            <SummaryCard title="Total Customers" value={customers.length} icon="users" trend="up" />
                            <SummaryCard title="Revenue Today" value="2.4M RWF" icon="money" trend="up" />
                            <SummaryCard title="Growth Rate" value="+24%" icon="growth" trend="up" />
                        </motion.div>

                        {/* Users Section */}
                        {isSuperAdmin && (
                            <motion.section
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        System Users ({users.length})
                                    </h2>
                                    <button
                                        onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-2xl font-bold transition transform hover:scale-105"
                                    >
                                        + Add User
                                    </button>
                                </div>
                                <UserTable
                                    users={users}
                                    onEdit={(u) => { setEditingUser(u); setUserModalOpen(true); }}
                                    onDelete={(id) => {
                                        if (confirm("Delete user permanently?")) {
                                            api.delete(`/users/${id}/`).then(() => {
                                                toast.success("User deleted");
                                                fetchData();
                                            });
                                        }
                                    }}
                                />
                            </motion.section>
                        )}

                        {/* Customers Section */}
                        <motion.section
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-4xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Customers ({customers.length})
                                </h2>
                                <button
                                    onClick={() => { setEditingCustomer(null); setCustomerModalOpen(true); }}
                                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-2xl font-bold transition transform hover:scale-105"
                                >
                                    + Add Customer
                                </button>
                            </div>
                            <CustomerTable
                                customers={customers}
                                onEdit={(c) => { setEditingCustomer(c); setCustomerModalOpen(true); }}
                                onDelete={(id) => {
                                    if (confirm("Delete customer permanently?")) {
                                        api.delete(`/customers/${id}/`).then(() => {
                                            toast.success("Customer deleted");
                                            fetchData();
                                        });
                                    }
                                }}
                            />
                        </motion.section>
                    </main>
                </div>

                {/* Modals */}
                <UserModal
                    open={userModalOpen}
                    user={editingUser}
                    onClose={() => { setUserModalOpen(false); setEditingUser(null); }}
                    onSave={() => { fetchData(); setUserModalOpen(false); }}
                />
                <CustomerModal
                    open={customerModalOpen}
                    customer={editingCustomer}
                    onClose={() => { setCustomerModalOpen(false); setEditingCustomer(null); }}
                    onSave={() => { fetchData(); setCustomerModalOpen(false); }}
                />
            </div>
        </>
    );
}