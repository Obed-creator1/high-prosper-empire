"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/Loader";
import api from "@/lib/api";
import { motion } from "framer-motion";

type Order = {
    id: number;
    service: string;
    frequency: string;
    start_date: string;
    status: string;
};

interface Props {
    role: string | null;
}

export default function OrdersTab({ role }: Props) {
    const [orders, setOrders] = useState<Order[]>([]);
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


    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res =
                role && ["admin", "manager"].includes(role)
                    ? await api.get("/orders/") // all orders
                    : await api.get("/orders/my/"); // customer orders
            setOrders(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <Loader />;

    if (!orders.length)
        return <p className="text-gray-500 dark:text-gray-300">No orders found.</p>;

    return (

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            {orders.map((o) => (
                <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <CardContent className="space-y-2">
                            <p className="text-gray-400 dark:text-gray-300">{o.start_date}</p>
                            <p className="text-white font-semibold">{o.service}</p>
                            <p className="text-gray-400 dark:text-gray-300">{o.frequency}</p>
                            <p
                                className={`font-medium ${
                                    o.status === "Active" ? "text-green-500" : "text-red-500"
                                }`}
                            >
                                Status: {o.status}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
