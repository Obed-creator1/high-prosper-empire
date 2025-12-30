"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";

interface Complaint {
    id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
}

interface Props {
    userId: number;
    role: string | null;
}

export default function ComplaintsTab({ userId, role }: Props) {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
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


    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const res =
                role && ["admin", "manager"].includes(role)
                    ? await api.get("/customers/complaints/") // admin/manager sees all
                    : await api.get("/customers/complaints/my/");
            setComplaints(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const openModal = (complaint: Complaint) => {
        setSelectedComplaint(complaint);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedComplaint(null);
    };

    const handleResolve = async (id: number) => {
        try {
            await api.post(`/customers/complaints/${id}/resolve/`);
            fetchComplaints();
            closeModal();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <Loader />;

    if (complaints.length === 0)
        return (
            <p className="text-gray-500 dark:text-gray-300 text-center mt-4">
                No complaints found.
            </p>
        );

    return (
        <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {complaints.map((comp) => (
                    <motion.div
                        key={comp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        <Card className="hover:shadow-lg transition">
                            <CardContent className="space-y-2">
                                <h3 className="font-semibold">{comp.title}</h3>
                                <p>Status: {comp.status}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(comp.created_at).toLocaleDateString()}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={() => openModal(comp)}>
                                        View
                                    </Button>
                                    {role !== "customer" && comp.status !== "Resolved" && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleResolve(comp.id)}
                                        >
                                            Resolve
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
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


            <AnimatePresence>
                {modalOpen && selectedComplaint && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
                    >
                        <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-lg p-6 relative space-y-4">
                            <h3 className="text-xl font-bold">{selectedComplaint.title}</h3>
                            <p>{selectedComplaint.description}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Status: {selectedComplaint.status}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Created: {new Date(selectedComplaint.created_at).toLocaleString()}
                            </p>

                            <div className="flex justify-end gap-2 pt-2">
                                {role !== "customer" && selectedComplaint.status !== "Resolved" && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleResolve(selectedComplaint.id)}
                                    >
                                        Resolve Complaint
                                    </Button>
                                )}
                                <Button variant="outline" onClick={closeModal}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
