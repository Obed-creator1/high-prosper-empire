// app/dashboard/admin/fleet/page.tsx – FLEET OS 2026 FINAL (December 2025)
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Car, Fuel, Wrench, AlertTriangle, MapPin, Download, Plus, Filter, Search,
    Gauge, Activity, Shield, Settings, Eye, Edit, Trash2, X, Zap, Brain, Radio,
    Grid3X3, Table, Moon, Sun, Command, ChevronDown, Sparkles, Kanban
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import api from "@/lib/api";

// Custom Hooks
import { useFleetWebSocket } from "@/hooks/useFleetWebSocket";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useCommandBar } from "@/hooks/useCommandBar";

// Components
import VehicleMap from "@/components/fleet/VehicleMap";
import FuelEfficiencyChart from "@/components/fleet/FuelEfficiencyChart";
import ComplianceAlerts from "@/components/fleet/ComplianceAlerts";
import VehicleDetailModal from "@/components/fleet/VehicleDetailModal";
import WorkshopEntryModal from "@/components/fleet/WorkshopEntryModal";
import AIPredictivePanel from "@/components/fleet/AIPredictivePanel";
import VehicleKanbanBoard from "@/components/fleet/VehicleKanbanBoard";
import CommandBar from "@/components/fleet/CommandBar";
import VehicleGrid from "@/components/fleet/VehicleGrid";
import VehicleTable from "@/components/fleet/VehicleTable";
import ComplianceTable from "@/components/fleet/tables/ComplianceTable";
import FuelEfficiencyTable from "@/components/fleet/tables/FuelEfficiencyTable";
import DriverLeaderboard from "@/components/fleet/tables/DriverLeaderboard";
import WorkshopTable from "@/components/fleet/tables/WorkshopTable";

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
    predicted_maintenance?: string;
}

type ViewMode = "table" | "cards" | "kanban";

export default function FleetManagementPage() {
    const router = useRouter();

    // === CUSTOM HOOKS ===
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [stats, setStats] = useState({
        total: 0, active: 0, onRoad: 0, workshop: 0, standby: 0,
        utilization: 0, avgFuelEfficiency: 0, alerts: 0, aiScore: 94
    });

    const { darkMode, toggleDarkMode } = useDarkMode();
    const { searchTerm, setSearchTerm } = useDebouncedSearch("");
    const { commandBarOpen, toggleCommandBar } = useCommandBar();

    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [loading, setLoading] = useState(true);

    // === REAL-TIME WEBSOCKET ===
    const handleWsUpdate = useCallback((update: any) => {
        if (update.type === "vehicle_location" && update.vehicle_id) {
            setVehicles(prev => prev.map(v =>
                v.id === update.vehicle_id
                    ? { ...v, lat: update.lat, lng: update.lng, last_seen: new Date().toISOString() }
                    : v
            ));
        }
        if (update.type === "status_change") {
            setVehicles(prev => prev.map(v =>
                v.id === update.vehicle_id ? { ...v, status: update.status } : v
            ));
            toast.success(`${update.registration} → ${update.status.replace("_", " ")}`, { icon: "Truck" });
        }
    }, []);

    const { connected } = useFleetWebSocket(handleWsUpdate);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehRes, statsRes] = await Promise.all([
                    api.get("/fleet/vehicles"),
                    api.get("/fleet/dashboard-summary")
                ]);

                // SAFE EXTRACTION — handles array or paginated {results: []}
                const vehData = Array.isArray(vehRes.data)
                    ? vehRes.data
                    : vehRes.data.results || vehRes.data.data || [];

                setVehicles(vehData);
                setStats(statsRes.data.summary || statsRes.data);
            } catch (err) {
                toast.error("Failed to load fleet data");
                setVehicles([]); // ← Ensure it's always an array
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

// SAFE FILTERING — always work with array
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

    const filteredVehicles = useMemo(() => {
        return safeVehicles.filter(v => {
            const matchesSearch = !searchTerm ||
                v.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.driver?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || v.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [safeVehicles, searchTerm, statusFilter]);

    // === EXPORT CSV ===
    const exportCSV = useCallback(() => {
        const csv = [
            ["Reg No", "Brand", "Model", "Status", "Odometer", "Driver", "Last Seen", "Fuel Eff.", "AI Risk"],
            ...filteredVehicles.map(v => [
                v.registration_number,
                v.brand,
                v.model,
                v.status,
                v.odometer_reading,
                v.driver || "-",
                v.last_seen ? format(new Date(v.last_seen), "HH:mm") : "-",
                v.fuel_efficiency || "-",
                v.predicted_maintenance || "Low"
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fleet-export-${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filteredVehicles]);

    // === HOTKEYS ===
    useHotkeys("cmd+k, ctrl+k", () => toggleCommandBar());
    useHotkeys("cmd+d, ctrl+d", () => toggleDarkMode());
    useHotkeys("cmd+n, ctrl+n", () => router.push("/dashboard/admin/fleet/new"));

    return (
        <>
            <div className={`min-h-screen transition-all duration-500 ${darkMode ? "bg-gray-950" : "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"}`}>
                {/* Floating Header */}
                <motion.header
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b ${darkMode ? "bg-gray-900/90 border-gray-800" : "bg-white/90 border-slate-200"} shadow-2xl`}
                >
                    <div className="max-w-full px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                FLEET OS 2026
                            </h1>
                            <div className="hidden lg:flex items-center gap-4">
                <span className={connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
  <Radio className={`w-4 h-4 ${connected ? "animate-pulse" : ""}`} />
                    {connected ? "LIVE" : "OFFLINE"}
</span>
                                <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full font-bold text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" /> AI ACTIVE
                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={toggleDarkMode} className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition">
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <button onClick={toggleCommandBar} className="p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition">
                                <Command className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => router.push("/dashboard/admin/fleet/new")}
                                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-2xl hover:shadow-2xl transition font-bold"
                            >
                                <Plus className="w-6 h-6" /> Add Vehicle
                            </button>
                        </div>
                    </div>
                </motion.header>

                {/* Main Content */}
                <main className="pt-24 pb-10 px-6">
                    <div className="max-w-full mx-auto space-y-8">

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                            {[
                                { label: "AI Health", value: `${stats.aiScore}%`, icon: Sparkles, color: "from-purple-500 to-pink-500" },
                                { label: "Total", value: stats.total, icon: Car, color: "from-blue-500 to-cyan-500" },
                                { label: "On Road", value: stats.onRoad, icon: Activity, color: "from-green-500 to-emerald-500" },
                                { label: "Workshop", value: stats.workshop, icon: Wrench, color: "from-orange-500 to-red-500" },
                                { label: "Alerts", value: stats.alerts, icon: AlertTriangle, color: "from-red-500 to-rose-500" },
                                { label: "Utilization", value: `${stats.utilization}%`, icon: Gauge, color: "from-indigo-500 to-purple-500" },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${stat.color} shadow-2xl`}
                                >
                                    <stat.icon className="w-8 h-8 mb-2 opacity-90" />
                                    <p className="text-3xl font-black">{stat.value}</p>
                                    <p className="text-sm opacity-90">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Search & View Controls */}
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search vehicles, drivers, routes..."
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-4 focus:ring-blue-500/30 outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition"
                                    >
                                        <Filter className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                                        {[
                                            { mode: "table", icon: Table },
                                            { mode: "cards", icon: Grid3X3 },
                                            { mode: "kanban", icon: Kanban },
                                        ].map(({ mode, icon: Icon }) => (
                                            <button
                                                key={mode}
                                                onClick={() => setViewMode(mode as ViewMode)}
                                                className={`p-3 rounded-lg transition ${viewMode === mode ? "bg-white dark:bg-gray-900 shadow-lg" : ""}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={exportCSV} className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-2xl hover:shadow-xl transition font-semibold">
                                        <Download className="w-5 h-5" /> Export
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tables Section */}
                        <div className="space-y-8">
                            <ComplianceTable />
                            <FuelEfficiencyTable />
                            <WorkshopTable />
                            <DriverLeaderboard />
                        </div>

                        {/* View Modes */}
                        <AnimatePresence mode="wait">
                            {viewMode === "table" && <VehicleTable vehicles={filteredVehicles} onSelect={setSelectedVehicle} />}
                            {viewMode === "cards" && <VehicleGrid vehicles={filteredVehicles} onSelect={setSelectedVehicle} />}
                            {viewMode === "kanban" && <VehicleKanbanBoard vehicles={filteredVehicles} />}
                        </AnimatePresence>

                        {/* AI + Map Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <FuelEfficiencyChart />
                            </div>
                            <AIPredictivePanel />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ComplianceAlerts />
                            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <MapPin className="w-8 h-8 text-red-600" /> Live GPS Tracking
                                </h2>
                                <div className="h-96 rounded-2xl overflow-hidden border-4 border-gray-200 dark:border-gray-700">
                                    <VehicleMap vehicles={safeVehicles.filter(v => v.lat && v.lng)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Modals */}
                <VehicleDetailModal vehicle={selectedVehicle} isOpen={!!selectedVehicle} onClose={() => setSelectedVehicle(null)} />
                <CommandBar isOpen={commandBarOpen} onClose={toggleCommandBar} />
            </div>
        </>
    );
}