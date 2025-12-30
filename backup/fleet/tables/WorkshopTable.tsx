// components/fleet/tables/WorkshopTable.tsx
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

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = () => {
        api.get("/fleet/workshop-records/").then(res => setRecords(res.data));
    };

    const inProgress = records.filter(r => r.status === "in_progress").length;
    const pending = records.filter(r => r.status === "pending").length;
    const completed = records.filter(r => r.status === "completed").length;

    const openModal = (record: WorkshopRecord) => {
        setSelectedRecord(record);
        setModalOpen(true);
    };

    const handleUpdate = (updated: WorkshopRecord) => {
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success("Workshop record updated!");
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed": return "bg-gradient-to-r from-green-500 to-emerald-600 text-white";
            case "in_progress": return "bg-gradient-to-r from-orange-500 to-red-600 text-white";
            default: return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white";
        }
    };

    return (
        <>
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-black flex items-center gap-4">
                            <Wrench className="w-12 h-12 text-orange-600" />
                            Workshop Control Center
                        </h2>
                        <p className="text-lg text-gray-600 mt-2">
                            Real-time repair tracking • {records.length} active jobs
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-5 text-center">
                            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                            <p className="text-3xl font-black text-amber-700">{pending}</p>
                            <p className="text-sm text-gray-700">Pending</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-5 text-center">
                            <Clock className="w-10 h-10 text-orange-600 mx-auto mb-2" />
                            <p className="text-3xl font-black text-orange-700">{inProgress}</p>
                            <p className="text-sm text-gray-700">In Progress</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-5 text-center">
                            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                            <p className="text-3xl font-black text-emerald-700">{completed}</p>
                            <p className="text-sm text-gray-700">Completed</p>
                        </div>
                    </div>
                </div>

                {/* Records */}
                <div className="space-y-5">
                    {records.map((record) => (
                        <div
                            key={record.id}
                            onClick={() => openModal(record)}
                            className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-6 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl border border-gray-200 dark:border-gray-700"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`p-4 rounded-2xl ${getStatusColor(record.status)}`}>
                                    <Wrench className="w-10 h-10" />
                                </div>

                                <div>
                                    <p className="text-2xl font-black text-gray-800 dark:text-white">
                                        {record.vehicle_reg}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                                        {record.issue_description}
                                    </p>
                                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                                        {record.mechanic_name && (
                                            <span className="flex items-center gap-2">
                        <User className="w-4 h-4" /> {record.mechanic_name}
                      </span>
                                        )}
                                        <span>Date In: {record.date_in}</span>
                                        {record.cost && (
                                            <span className="flex items-center gap-1 font-bold text-green-600">
                        <DollarSign className="w-4 h-4" /> {record.cost.toLocaleString()} RWF
                      </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                <span className={`px-6 py-3 rounded-2xl text-lg font-bold ${getStatusColor(record.status)}`}>
                  {record.status.replace("_", " ").toUpperCase()}
                </span>
                                {record.status === "completed" && (
                                    <div className="mt-3 flex justify-end">
                                        <CheckCircle className="w-12 h-12 text-emerald-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {records.length === 0 && (
                    <div className="text-center py-20">
                        <Wrench className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                        <p className="text-xl text-gray-500">No workshop records found</p>
                    </div>
                )}
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