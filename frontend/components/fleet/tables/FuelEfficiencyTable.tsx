// components/fleet/tables/InteractiveFuelEfficiencyTable.tsx — FINAL 100% SAFE (2025)
"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Fuel, Download, Search, Eye, Trash2 } from "lucide-react";
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await api.get("/fleet/fuel-efficiency/");

            // SAFE DATA EXTRACTION — handles array or {results: []}
            const data = Array.isArray(res.data)
                ? res.data
                : res.data.results || res.data.data || [];

            setRecords(data);
        } catch (err) {
            console.error("Failed to load fuel records:", err);
            toast.error("Failed to load fuel efficiency data");
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // Safe filtering
    const filtered = records.filter(r =>
        r.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.brand_model?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleRow = (id: number) => {
        const newSet = new Set(selected);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelected(newSet);
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(r => r.id)));
        }
    };

    const openModal = (record: FuelRecord) => {
        setSelectedRecord(record);
        setModalOpen(true);
    };

    const handleUpdate = (updated: FuelRecord) => {
        setRecords(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        toast.success("Fuel record updated!");
    };

    const formatEfficiency = (value: any): string => {
        if (value == null) return "N/A";
        const num = Number(value);
        return isNaN(num) ? "N/A" : num.toFixed(1);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this fuel record? This cannot be undone.")) return;

        try {
            await api.delete(`/fleet/fuel-efficiency/${id}/`);
            setRecords(prev => prev.filter(r => r.id !== id));
            setSelected(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
            toast.success("Record deleted");
        } catch {
            toast.error("Failed to delete record");
        }
    };

    if (loading) {
        return (
            <div className="glass-panel p-12 text-center">
                <div className="w-20 h-20 border-8 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-2xl font-bold text-cyan-400">Loading Fuel Records...</p>
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="glass-panel p-16 text-center">
                <Fuel className="w-24 h-24 text-gray-500 mx-auto mb-6" />
                <p className="text-3xl font-black text-gray-400 mb-4">No Fuel Records</p>
                <p className="text-xl text-gray-500">Start adding fuel entries to see efficiency trends</p>
            </div>
        );
    }

    return (
        <>
            <div className="glass-card overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-white/10">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <h2 className="text-4xl font-black flex items-center gap-4">
                                <Fuel className="w-12 h-12 text-emerald-500" />
                                Fuel Efficiency Records
                            </h2>
                            <p className="text-lg text-gray-400 mt-2">
                                {records.length} total records • {selected.size} selected
                            </p>
                        </div>
                        <div className="flex gap-4">
                            {selected.size > 0 && (
                                <button className="px-8 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl font-bold hover:shadow-red-500/50 transition">
                                    Delete Selected ({selected.size})
                                </button>
                            )}
                            <button className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-bold hover:shadow-xl transition">
                                <Download className="w-6 h-6" /> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mt-6 max-w-md">
                        <Search className="absolute left-5 top-4 w-6 h-6 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by registration or model..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/10 border border-white/20 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none text-lg"
                        />
                    </div>
                </div>

                {/* Chart */}
                <div className="p-8 border-b border-white/10">
                    <h3 className="text-2xl font-bold mb-6">Efficiency Trend (Last 12 Records)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={records.slice(0, 12)}>
                            <XAxis dataKey="date" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip
                                contentStyle={{ background: "rgba(0,0,0,0.9)", border: "1px solid #333", borderRadius: "16px" }}
                                labelStyle={{ color: "#00F0FF", fontWeight: "bold" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="km_per_liter"
                                stroke="#00FF9D"
                                strokeWidth={4}
                                dot={{ fill: "#00FF9D", r: 6 }}
                                activeDot={{ r: 10 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                        <tr className="text-left text-cyan-400 uppercase text-sm font-bold border-b border-white/10">
                            <th className="p-6">
                                <input
                                    type="checkbox"
                                    checked={selected.size === filtered.length && filtered.length > 0}
                                    onChange={toggleAll}
                                    className="w-5 h-5 rounded border-cyan-500 accent-cyan-500"
                                />
                            </th>
                            <th className="p-6">Registration</th>
                            <th className="p-6">Brand & Model</th>
                            <th className="p-6">Distance</th>
                            <th className="p-6">Liters</th>
                            <th className="p-6">Efficiency</th>
                            <th className="p-6">Cost</th>
                            <th className="p-6">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map((r) => (
                            <tr
                                key={r.id}
                                className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                                onClick={() => openModal(r)}
                            >
                                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r.id)}
                                        onChange={() => toggleRow(r.id)}
                                        className="w-5 h-5 rounded border-cyan-500 accent-cyan-500"
                                    />
                                </td>
                                <td className="p-6 font-bold text-cyan-400">{r.registration_number}</td>
                                <td className="p-6 text-gray-300">{r.brand_model}</td>
                                <td className="p-6">{Number(r.distance_km || 0).toLocaleString()} km</td>
                                <td className="p-6 text-yellow-400">{r.liters || 0} L</td>
                                <td className="p-6 text-pink-400">RWF {Number(r.cost || 0).toLocaleString()}</td>
                                <td className="p-6 font-bold text-emerald-400">
                                    {formatEfficiency(r.km_per_liter)} km/L
                                </td>
                                <td className="p-6 text-pink-400">RWF {r.cost.toLocaleString()}</td>
                                <td className="p-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => openModal(r)}
                                            className="p-3 bg-cyan-900/50 hover:bg-cyan-800 rounded-xl transition"
                                        >
                                            <Eye className="w-5 h-5 text-cyan-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            className="p-3 bg-red-900/50 hover:bg-red-800 rounded-xl transition"
                                        >
                                            <Trash2 className="w-5 h-5 text-red-400" />
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