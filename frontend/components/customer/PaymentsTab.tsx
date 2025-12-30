"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";
import QRScanner from "@/components/payment/QRScanner";

interface Payment {
    id: number;
    amount: string;
    status: string;
    method: string;
    created_at: string;
}

interface Props {
    role: string | null;
}

export default function PaymentsTab({ role }: Props) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

// Filtered data before rendering
    const filteredItems = items.filter((item) => {
        const matchesSearch =
            item.id.toString().includes(searchTerm) ||
            (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
        const matchesStatus = statusFilter ? item.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    });


    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res =
                role && ["admin", "manager"].includes(role)
                    ? await api.get("/payments/all/") // all payments for admin
                    : await api.get("/payments/my-payments/"); // customer payments
            setPayments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInitiate = async (id: number) => {
        try {
            await api.post("/payments/initiate/", { payment_id: id });
            fetchPayments();
        } catch (err) {
            console.error(err);
            alert("Failed to initiate payment");
        }
    };

    const handleConfirm = async (id: number) => {
        try {
            await api.post("/payments/confirm/", { payment_id: id });
            fetchPayments();
        } catch (err) {
            console.error(err);
            alert("Failed to confirm payment");
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    if (loading) return <Loader />;

    if (!payments.length)
        return <p className="text-gray-500 dark:text-gray-300">No payments found.</p>;

    return (

    <div className="space-y-4">
            <AnimatePresence>
                {payments.map((p) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="hover:shadow-lg transition">
                            <CardContent className="flex justify-between items-center flex-wrap gap-2">
                                <QRScanner onScan={(account) => initiatePayment({ payment_account: account })} />

                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="border rounded px-3 py-1 w-full md:w-1/3"
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="border rounded px-3 py-1 w-full md:w-1/4"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="font-medium">Payment #{p.id}</p>
                                    <p>Amount: {p.amount} RWF</p>
                                    <p>Method: {p.method}</p>
                                    <p>
                                        Status:{" "}
                                        <span
                                            className={`ml-1 font-semibold ${
                                                p.status === "Paid"
                                                    ? "text-green-600"
                                                    : p.status === "Initiated"
                                                        ? "text-blue-600"
                                                        : p.status === "Pending"
                                                            ? "text-yellow-600"
                                                            : "text-red-600"
                                            }`}
                                        >
                      {p.status}
                    </span>
                                    </p>
                                    <p>Date: {new Date(p.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {p.status === "Pending" && (
                                        <Button size="sm" onClick={() => handleInitiate(p.id)}>
                                            Initiate Payment
                                        </Button>
                                    )}
                                    {role && !["customer"].includes(role) && p.status === "Initiated" && (
                                        <Button size="sm" variant="secondary" onClick={() => handleConfirm(p.id)}>
                                            Confirm Payment
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
