// components/fleet/tables/InteractiveComplianceTable.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertTriangle, Calendar, Download, Search, Filter, Edit, Trash2,
    Eye, CheckCircle, XCircle, MoreVertical, ChevronDown, Shield
} from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import toast from "react-hot-toast";
import ComplianceDetailModal from "../modals/ComplianceDetailModal";

interface Compliance {
    id: number;
    registration_number: string;
    compliance_type: string;
    expiry_date: string;
    days_left: number;
    status: "expired" | "critical" | "warning" | "valid";
    document_url?: string;
    notes?: string;
}

export default function InteractiveComplianceTable() {
    const [data, setData] = useState<Compliance[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedCompliance, setSelectedCompliance] = useState<Compliance | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        api.get("/fleet/compliance-alerts/").then(res => {
            const all = [
                ...res.data.expired,
                ...res.data.critical_5_days,
                ...res.data.warning_15_days,
                ...res.data.upcoming_30_days
            ];
            setData(all);
        });
    }, []);

    const filtered = useMemo(() => {
        return data.filter(item =>
            (item.registration_number.toLowerCase().includes(search.toLowerCase()) ||
                item.compliance_type.toLowerCase().includes(search.toLowerCase())) &&
            (filterStatus === "all" || item.status === filterStatus)
        );
    }, [data, search, filterStatus]);

    const toggleSelect = (id: number) => {
        const newSet = new Set(selected);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelected(newSet);
    };

    const selectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(d => d.id)));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this compliance record?")) return;
        try {
            await api.delete(`/fleet/compliances/${id}/`);
            setData(prev => prev.filter(d => d.id !== id));
            toast.success("Compliance deleted");
        } catch {
            toast.error("Failed to delete");
        }
    };

    const openModal = (item: Compliance) => {
        setSelectedCompliance(item);
        setModalOpen(true);
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return "border-gray-500 text-gray-400 bg-gray-900/50";

        switch (status.toLowerCase()) {
            case "valid":
            case "active":
                return "border-green-500 text-green-400 bg-green-900/30";
            case "expiring":
            case "warning":
                return "border-yellow-500 text-yellow-400 bg-yellow-900/30";
            case "expired":
            case "overdue":
                return "border-red-500 text-red-400 bg-red-900/30";
            default:
                return "border-gray-500 text-gray-400 bg-gray-900/50";
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <Shield className="w-8 h-8 text-red-600" />
                                Compliance Manager
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">{filtered.length} records • {selected.size} selected</p>
                        </div>
                        <div className="flex gap-3">
                            {selected.size > 0 && (
                                <button className="px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
                                    Delete Selected ({selected.size})
                                </button>
                            )}
                            <button className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:shadow-lg">
                                <Download className="w-5 h-5" /> Export
                            </button>
                        </div>
                    </div>

                    {/* Search + Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search reg no or type..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-red-500/30 outline-none"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-5 py-3.5 border border-gray-200 rounded-2xl bg-white/50"
                        >
                            <option value="all">All Status</option>
                            <option value="expired">Expired</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="valid">Valid</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="p-4 text-left">
                                <input
                                    type="checkbox"
                                    checked={selected.size === filtered.length && filtered.length > 0}
                                    onChange={selectAll}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                            </th>
                            <th className="p-4 text-left font-bold">Registration</th>
                            <th className="p-4 text-left font-bold">Type</th>
                            <th className="p-4 text-left font-bold">Expiry Date</th>
                            <th className="p-4 text-left font-bold">Days Left</th>
                            <th className="p-4 text-left font-bold">Status</th>
                            <th className="p-4 text-left font-bold">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        <AnimatePresence>
                            {filtered.map((item) => (
                                <motion.tr
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                    className="border-t border-gray-100 dark:border-gray-800 cursor-pointer transition"
                                    onClick={() => openModal(item)}
                                >
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td className="p-4 font-bold text-blue-700">{item.registration_number}</td>
                                    <td className="p-4">{item.compliance_type}</td>
                                    <td className="p-4">{format(new Date(item.expiry_date), "dd MMM yyyy")}</td>
                                    <td className="p-4">
                      <span className={item.days_left < 0 ? "text-red-600 font-bold" : item.days_left <= 5 ? "text-orange-600" : ""}>
                        {item.days_left < 0 ? `-${Math.abs(item.days_left)}d` : `${item.days_left}d`}
                      </span>
                                    </td>
                                    <td className="p-4">
  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
    {item.status ? item.status.replace("_", " ").toUpperCase() : "UNKNOWN"}
  </span>
                                    </td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openModal(item)} className="p-2 hover:bg-blue-100 rounded-lg transition">
                                                <Eye className="w-4 h-4 text-blue-700" />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-100 rounded-lg transition">
                                                <Trash2 className="w-4 h-4 text-red-700" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* MODAL */}
            <ComplianceDetailModal
                compliance={selectedCompliance}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onUpdate={(updated) => {
                    setData(prev => prev.map(d => d.id === updated.id ? updated : d));
                    toast.success("Compliance updated!");
                }}
            />
        </>
    );
}