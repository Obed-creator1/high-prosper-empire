// components/fleet/tables/InteractiveFuelEfficiencyTable.tsx
"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {Fuel, Download, Search, Eye, Trash2} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import FuelRecordDetailModal from "../modals/FuelRecordDetailModal";

interface FuelRecord {
    id: number;
    registration_number: string;
    brand_model: string;
    date: string;
    distance_km: number;
    liters: number;
    cost: number;
    km_per_liter: number;
    remarks?: string;
}

export default function InteractiveFuelEfficiencyTable() {
    const [records, setRecords] = useState<FuelRecord[]>([]);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState("");
    const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = () => {
        api.get("/fleet/fuel-efficiency/").then(res => setRecords(res.data));
    };

    const filtered = records.filter(r =>
        r.registration_number.toLowerCase().includes(search.toLowerCase()) ||
        r.brand_model.toLowerCase().includes(search.toLowerCase())
    );

    const toggleRow = (id: number) => {
        const newSet = new Set(selected);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setSelected(newSet);
    };

    const openModal = (record: FuelRecord) => {
        setSelectedRecord(record);
        setModalOpen(true);
    };

    const handleUpdate = (updated: FuelRecord) => {
        setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
        toast.success("Fuel record updated!");
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this fuel record?")) return;
        try {
            await api.delete(`/fleet/fuel-efficiency/${id}/`);
            setRecords(prev => prev.filter(r => r.id !== id));
            toast.success("Record deleted");
        } catch {
            toast.error("Failed to delete");
        }
    };

    return (
        <>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-black flex items-center gap-3">
                            <Fuel className="w-10 h-10 text-emerald-600" />
                            Fuel Efficiency Records
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {records.length} records • {selected.size} selected
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {selected.size > 0 && (
                            <button className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold">
                                Delete Selected ({selected.size})
                            </button>
                        )}
                        <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl hover:shadow-xl transition font-bold">
                            <Download className="w-5 h-5" /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search registration or model..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:ring-4 focus:ring-emerald-500/30 outline-none"
                    />
                </div>

                {/* Chart */}
                <div className="mb-8">
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={records.slice(0, 12)}>
                            <XAxis dataKey="date" stroke="#6b7280" />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                                contentStyle={{ backgroundColor: "rgba(255,255,255,0.95)", border: "1px solid #e5e7eb", borderRadius: "12px" }}
                                labelStyle={{ color: "#1f2937", fontWeight: "bold" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="km_per_liter"
                                stroke="#10b981"
                                strokeWidth={5}
                                dot={{ fill: "#10b981", r: 6 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
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
                                    onChange={() => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(r => r.id)))}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                            </th>
                            <th className="p-4 text-left font-bold">Reg No</th>
                            <th className="p-4 text-left font-bold">Brand & Model</th>
                            <th className="p-4 text-left font-bold">Distance</th>
                            <th className="p-4 text-left font-bold">Liters</th>
                            <th className="p-4 text-left font-bold">km/L</th>
                            <th className="p-4 text-left font-bold">Cost</th>
                            <th className="p-4 text-left font-bold">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((r) => (
                            <tr
                                key={r.id}
                                className="border-t border-gray-100 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition cursor-pointer"
                                onClick={() => openModal(r)}
                            >
                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r.id)}
                                        onChange={() => toggleRow(r.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                </td>
                                <td className="p-4 font-bold text-blue-700">{r.registration_number}</td>
                                <td className="p-4">{r.brand_model}</td>
                                <td className="p-4">{r.distance_km.toLocaleString()} km</td>
                                <td className="p-4">{r.liters} L</td>
                                <td className="p-4 font-bold text-emerald-600">{r.km_per_liter} km/L</td>
                                <td className="p-4">RWF {r.cost.toLocaleString()}</td>
                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openModal(r)}
                                            className="p-2.5 bg-blue-100 hover:bg-blue-200 rounded-xl transition"
                                        >
                                            <Eye className="w-4 h-4 text-blue-700" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            className="p-2.5 bg-red-100 hover:bg-red-200 rounded-xl transition"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-700" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            <FuelRecordDetailModal
                record={selectedRecord}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onUpdate={handleUpdate}
            />
        </>
    );
}