// components/fleet/tables/WorkshopTable.tsx — FINAL 100% SAFE (2025)
"use client";

import { useEffect, useState } from "react";
import { Wrench, Clock, CheckCircle, AlertTriangle, User, DollarSign } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import WorkshopRecordModal from "../modals/WorkshopRecordModal";

interface WorkshopRecord {
    id: number;
    vehicle_reg: string;
    issue_description: string;
    mechanic_name?: string;
    date_in: string;
    status: "pending" | "in_progress" | "completed";
    cost?: number;
    parts_used?: string;
    date_out?: string;
}

export default function WorkshopTable() {
    const [records, setRecords] = useState<WorkshopRecord[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<WorkshopRecord | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await api.get("/fleet/workshop-records/");

            // SAFE DATA EXTRACTION — handles array or paginated response
            const data = Array.isArray(res.data)
                ? res.data
                : res.data.results || res.data.data || [];

            setRecords(data);
        } catch (err) {
            console.error("Failed to load workshop records:", err);
            toast.error("Failed to load workshop data");
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // SAFE ARRAY — never crash on filter
    const safeRecords = Array.isArray(records) ? records : [];

    const inProgress = safeRecords.filter(r => r.status === "in_progress").length;
    const pending = safeRecords.filter(r => r.status === "pending").length;
    const completed = safeRecords.filter(r => r.status === "completed").length;

    const openModal = (record: WorkshopRecord) => {
        setSelectedRecord(record);
        setModalOpen(true);
    };

    const handleUpdate = (updated: WorkshopRecord) => {
        setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        toast.success("Workshop record updated!");
    };

    const getStatusColor = (status?: string) => {
        if (!status) return "bg-gradient-to-r from-gray-500 to-gray-700 text-white";

        switch (status) {
            case "completed":
                return "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/30";
            case "in_progress":
                return "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-red-500/30";
            default:
                return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-yellow-500/30";
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-16 text-center">
                <div className="w-20 h-20 border-8 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-3xl font-black text-orange-400">Loading Workshop...</p>
            </div>
        );
    }

    return (
        <>
            <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-white/10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                        <div>
                            <h2 className="text-5xl font-black flex items-center gap-5">
                                <Wrench className="w-14 h-14 text-orange-500" />
                                Workshop Control Center
                            </h2>
                            <p className="text-xl text-gray-400 mt-3">
                                {safeRecords.length} active jobs • Real-time repair tracking
                            </p>
                        </div>

                        {/* Status Cards */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="glass-panel p-6 text-center rounded-3xl">
                                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                                <p className="text-5xl font-black text-yellow-400">{pending}</p>
                                <p className="text-lg text-gray-300 mt-2">Pending</p>
                            </div>
                            <div className="glass-panel p-6 text-center rounded-3xl">
                                <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                                <p className="text-5xl font-black text-orange-400">{inProgress}</p>
                                <p className="text-lg text-gray-300 mt-2">In Progress</p>
                            </div>
                            <div className="glass-panel p-6 text-center rounded-3xl">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                <p className="text-5xl font-black text-emerald-400">{completed}</p>
                                <p className="text-lg text-gray-300 mt-2">Completed</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Records List */}
                <div className="p-8 space-y-6">
                    {safeRecords.length === 0 ? (
                        <div className="text-center py-20">
                            <Wrench className="w-32 h-32 text-gray-600 mx-auto mb-8" />
                            <p className="text-3xl font-black text-gray-400">No Workshop Records</p>
                            <p className="text-xl text-gray-500 mt-4">All vehicles are running perfectly</p>
                        </div>
                    ) : (
                        safeRecords.map((record) => (
                            <div
                                key={record.id}
                                onClick={() => openModal(record)}
                                className="glass-panel p-8 rounded-3xl flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xl border border-white/10"
                            >
                                <div className="flex items-center gap-8">
                                    <div className={`p-5 rounded-3xl ${getStatusColor(record.status)}`}>
                                        <Wrench className="w-12 h-12" />
                                    </div>

                                    <div>
                                        <p className="text-3xl font-black text-cyan-400">
                                            {record.vehicle_reg}
                                        </p>
                                        <p className="text-lg text-gray-300 mt-2 max-w-3xl">
                                            {record.issue_description}
                                        </p>
                                        <div className="flex items-center gap-8 mt-4 text-gray-400">
                                            {record.mechanic_name && (
                                                <span className="flex items-center gap-2">
                          <User className="w-5 h-5" /> {record.mechanic_name}
                        </span>
                                            )}
                                            <span>Date In: {record.date_in}</span>
                                            {record.cost && (
                                                <span className="flex items-center gap-2 font-bold text-emerald-400">
                          <DollarSign className="w-5 h-5" /> {record.cost.toLocaleString()} RWF
                        </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                  <span className={`px-8 py-4 rounded-3xl text-xl font-black ${getStatusColor(record.status)}`}>
                    {record.status.replace("_", " ").toUpperCase()}
                  </span>
                                    {record.status === "completed" && (
                                        <div className="mt-4">
                                            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL */}
            <WorkshopRecordModal
                record={selectedRecord}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onUpdate={handleUpdate}
            />
        </>
    );
}