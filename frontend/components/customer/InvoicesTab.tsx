"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import { Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Invoice {
    id: number;
    amount: string;
    status: string;
    due_date: string;
    description?: string;
}

interface Props {
    role: string | null;
}

export default function InvoicesTab({ role }: Props) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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


    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res =
                role && ["admin", "manager"].includes(role)
                    ? await api.get("/payments/invoices/") // admin sees all
                    : await api.get("/payments/my_invoices/"); // customer sees own
            setInvoices(res.data);
        } catch (err) {
            console.error("Error fetching invoices:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    if (loading) return <Loader />;

    if (!invoices.length)
        return <p className="text-gray-500 dark:text-gray-300">No invoices found.</p>;

    return (
        <div className="space-y-4">
            <AnimatePresence>
                {invoices.map((inv) => (
                    <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="hover:shadow-lg transition">
                            <CardContent className="flex justify-between items-center flex-wrap gap-2">
                                <div>
                                    <p className="font-medium">Invoice #{inv.id}</p>
                                    <p>Amount: {inv.amount} RWF</p>
                                    <p>Due: {inv.due_date}</p>
                                    <p>
                                        Status:{" "}
                                        <span
                                            className={`ml-1 font-semibold ${
                                                inv.status === "Paid"
                                                    ? "text-green-600"
                                                    : inv.status === "Pending"
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                            }`}
                                        >
                      {inv.status}
                    </span>
                                    </p>
                                </div>
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

                                <div className="flex gap-2 flex-wrap">
                                    <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(inv)}>
                                        <Eye size={16} /> Preview
                                    </Button>
                                    {role && !["customer"].includes(role) && inv.status === "Pending" && (
                                        <Button size="sm" variant="secondary" onClick={() => alert("Mark Paid")}>
                                            Mark Paid
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </AnimatePresence>

            {selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <motion.div
                        className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-3xl overflow-hidden relative"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                    >
                        <Button
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => setSelectedInvoice(null)}
                        >
                            X
                        </Button>
                        <iframe
                            src={`/api/invoices/${selectedInvoice.id}/pdf/`}
                            className="w-full h-[80vh]"
                        ></iframe>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
