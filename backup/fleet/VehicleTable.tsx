// components/fleet/VehicleTable.tsx
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Eye, Edit, Trash2, Fuel, Wrench, MoreVertical, ChevronDown,
    MapPin, Gauge, Calendar, AlertCircle, Search, X
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Vehicle {
    id: number;
    registration_number: string;
    brand: string;
    model: string;
    status: "active" | "on_road" | "workshop" | "standby" | "maintenance" | "retired";
    photo?: string;
    odometer_reading: number;
    bdm_kg: number;
    lat?: number;
    lng?: number;
    driver?: string;
    last_seen?: string;
    fuel_efficiency?: number;
    next_service_due?: string;
}

interface VehicleTableProps {
    vehicles: Vehicle[];
    onSelect: (vehicle: Vehicle) => void;
    onRefresh?: () => void;
}

export default function VehicleTable({ vehicles, onSelect, onRefresh }: VehicleTableProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"registration" | "odometer" | "status" | "last_seen">("registration");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);

    // Advanced filtering & search
    const filteredAndSortedVehicles = useMemo(() => {
        let filtered = vehicles.filter(v => {
            const matchesSearch =
                v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.driver?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === "all" || v.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        // Sorting
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortBy) {
                case "registration":
                    aVal = a.registration_number; bVal = b.registration_number; break;
                case "odometer":
                    aVal = a.odometer_reading; bVal = b.odometer_reading; break;
                case "status":
                    aVal = a.status; bVal = b.status; break;
                case "last_seen":
                    aVal = a.last_seen || ""; bVal = b.last_seen || ""; break;
                default:
                    aVal = a.registration_number; bVal = b.registration_number;
            }

            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [vehicles, searchTerm, statusFilter, sortBy, sortOrder]);

    const handleSort = (key: typeof sortBy) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(key);
            setSortOrder("asc");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return;

        try {
            await api.delete(`/fleet/vehicles/${id}/`);
            toast.success("Vehicle deleted");
            onRefresh?.();
        } catch (err) {
            toast.error("Failed to delete vehicle");
        }
    };

    const toggleRow = (id: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedRows(newSelected);
    };

    const toggleAll = () => {
        if (selectedRows.size === filteredAndSortedVehicles.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredAndSortedVehicles.map(v => v.id)));
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            on_road: "bg-blue-100 text-blue-700 border-blue-200",
            active: "bg-green-100 text-green-700 border-green-200",
            workshop: "bg-orange-100 text-orange-700 border-orange-200",
            standby: "bg-purple-100 text-purple-700 border-purple-200",
            maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
            retired: "bg-gray-100 text-gray-600 border-gray-300",
        };
        return `px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600"}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
        >
            {/* Advanced Search & Filters Bar */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by reg, brand, model, driver..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-4 focus:ring-blue-500/30 outline-none transition"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-5 py-3.5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white/50 dark:bg-gray-800/50 focus:ring-4 focus:ring-blue-500/30 outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="on_road">On Road</option>
                            <option value="workshop">Workshop</option>
                            <option value="standby">Standby</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="retired">Retired</option>
                        </select>

                        <span className="text-sm text-gray-500">
              {filteredAndSortedVehicles.length} of {vehicles.length} vehicles
            </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                        <th className="p-4 text-left">
                            <input
                                type="checkbox"
                                checked={selectedRows.size === filteredAndSortedVehicles.length && filteredAndSortedVehicles.length > 0}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded border-gray-300"
                            />
                        </th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" onClick={() => handleSort("registration")}>
                            Registration {sortBy === "registration" && <ChevronDown className={`inline w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />}
                        </th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Vehicle</th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" onClick={() => handleSort("status")}>
                            Status {sortBy === "status" && <ChevronDown className={`inline w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />}
                        </th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" onClick={() => handleSort("odometer")}>
                            Odometer {sortBy === "odometer" && <ChevronDown className={`inline w-4 h-4 ${sortOrder === "desc" ? "rotate-180" : ""}`} />}
                        </th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Location</th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Driver</th>
                        <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    <AnimatePresence>
                        {filteredAndSortedVehicles.map((vehicle, i) => (
                            <motion.tr
                                key={vehicle.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: i * 0.02 }}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                                onClick={(e) => {
                                    if (!(e.target as HTMLElement).closest("button")) {
                                        onSelect(vehicle);
                                    }
                                }}
                            >
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.has(vehicle.id)}
                                        onChange={() => toggleRow(vehicle.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-gray-300"
                                    />
                                </td>
                                <td className="p-4 font-bold text-blue-700 dark:text-blue-400">
                                    {vehicle.registration_number}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {vehicle.photo ? (
                                            <img src={vehicle.photo} alt="" className="w-12 h-10 object-cover rounded-lg shadow" />
                                        ) : (
                                            <div className="bg-gray-200 dark:bg-gray-700 border-2 border-dashed rounded-lg w-12 h-10" />
                                        )}
                                        <div>
                                            <p className="font-semibold">{vehicle.brand} {vehicle.model}</p>
                                            <p className="text-xs text-gray-500">{vehicle.bdm_kg} kg</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                    <span className={getStatusBadge(vehicle.status)}>
                      {vehicle.status.replace("_", " ").toUpperCase()}
                    </span>
                                </td>
                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                    {vehicle.odometer_reading.toLocaleString()} km
                                </td>
                                <td className="p-4">
                                    {vehicle.lat && vehicle.lng ? (
                                        <span className="flex items-center gap-2 text-green-600">
                        <MapPin className="w-4 h-4" /> Live
                      </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                    {vehicle.driver || "—"}
                                </td>
                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onSelect(vehicle)}
                                            className="p-2.5 bg-blue-100 dark:bg-blue-900/50 rounded-xl hover:scale-110 transition"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                                        </button>
                                        <button
                                            onClick={() => router.push(`/dashboard/admin/fleet/edit/${vehicle.id}`)}
                                            className="p-2.5 bg-green-100 dark:bg-green-900/50 rounded-xl hover:scale-110 transition"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4 text-green-700 dark:text-green-300" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(vehicle.id)}
                                            className="p-2.5 bg-red-100 dark:bg-red-900/50 rounded-xl hover:scale-110 transition"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-700 dark:text-red-300" />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                    </tbody>
                </table>

                {filteredAndSortedVehicles.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">No vehicles found matching your filters.</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}