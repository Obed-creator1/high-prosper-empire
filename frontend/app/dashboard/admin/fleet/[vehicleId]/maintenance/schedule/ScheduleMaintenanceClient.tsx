"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MaintenanceRecord {
    id: number;
    maintenance_type: string;
    description: string;
    date: string;
    next_due: string;
    cost: number;
    status: string;
}

interface FuelRecord {
    id: number;
    date: string;
    liters: number;
    cost: number;
}

interface OilRecord {
    id: number;
    date: string;
    liters: number;
    cost: number;
}

interface Vehicle {
    id: number;
    registration_number: string;
    lat?: number | null;
    lng?: number | null;
}

interface Props {
    vehicleId: string;
}

export default function VehiclePerformanceMaintenance({ vehicleId }: Props) {
    const router = useRouter();

    // --- Vehicle Performance ---
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
    const [oilRecords, setOilRecords] = useState<OilRecord[]>([]);
    const [loadingPerformance, setLoadingPerformance] = useState(true);
    const [performanceError, setPerformanceError] = useState<string | null>(null);
    const [showCharts, setShowCharts] = useState(false);

    // --- Vehicle Location ---
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [mapKey, setMapKey] = useState(0);

    // --- Maintenance Form ---
    const [maintenanceType, setMaintenanceType] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");
    const [nextDue, setNextDue] = useState("");
    const [cost, setCost] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    // --- Fetch Performance & Vehicle Info ---
    const fetchPerformance = async () => {
        setLoadingPerformance(true);
        setPerformanceError(null);
        try {
            const [maintenanceRes, fuelRes, oilRes, vehicleRes] = await Promise.allSettled([
                api.get(`/fleet/vehicles/${vehicleId}/reports/maintenance`),
                api.get(`/fleet/vehicles/${vehicleId}/reports/fuel`),
                api.get(`/fleet/vehicles/${vehicleId}/oil/`),
                api.get(`/fleet/vehicles/${vehicleId}/`),
            ]);

            if (maintenanceRes.status === "fulfilled") setMaintenanceRecords(maintenanceRes.value.data);
            if (fuelRes.status === "fulfilled") setFuelRecords(fuelRes.value.data);
            if (oilRes.status === "fulfilled") setOilRecords(oilRes.value.data);
            if (vehicleRes.status === "fulfilled") setVehicle(vehicleRes.value.data);

            // Force map remount if vehicle coordinates exist
            if (vehicleRes.status === "fulfilled" && vehicleRes.value.data.lat && vehicleRes.value.data.lng) {
                setMapKey((prev) => prev + 1);
            }

            [maintenanceRes, fuelRes, oilRes, vehicleRes].forEach((r) => {
                if (r.status === "rejected") console.warn("API fetch failed:", r.reason);
            });
        } catch (err: any) {
            console.error(err);
            setPerformanceError("Failed to fetch vehicle performance data.");
        } finally {
            setLoadingPerformance(false);
        }
    };

    useEffect(() => {
        fetchPerformance();
    }, [vehicleId]);

    // --- Maintenance Form Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            const payload = {
                maintenance_type: maintenanceType,
                description,
                date,
                next_due: nextDue,
                cost: parseFloat(cost),
            };

            const res = await api.post(`/fleet/vehicles/${vehicleId}/maintenance/`, payload);

            if (res.status === 201 || res.status === 200) {
                setFormSuccess("Maintenance record scheduled successfully!");
                setMaintenanceType("");
                setDescription("");
                setDate("");
                setNextDue("");
                setCost("");
                fetchPerformance(); // refresh charts
            }
        } catch (err: any) {
            console.error("Failed to schedule maintenance:", err);
            setFormError("Failed to schedule maintenance. Please check your input.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Chart Data ---
    const maintenanceChartData = maintenanceRecords.map((r) => ({ date: r.date, cost: r.cost }));
    const fuelChartData = fuelRecords.map((f) => ({ date: f.date, liters: f.liters, cost: f.cost }));
    const oilChartData = oilRecords.map((o) => ({ date: o.date, liters: o.liters, cost: o.cost }));

    // --- Map Center ---
    const defaultCenter: [number, number] = vehicle?.lat && vehicle?.lng ? [vehicle.lat, vehicle.lng] : [-1.944, 30.061];

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md space-y-6">
            <h1 className="text-3xl font-bold mb-6">🚛 Vehicle Dashboard & Maintenance</h1>

            {/* Performance Charts */}
            <button
                onClick={() => setShowCharts(!showCharts)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
                {showCharts ? "Hide Performance Charts" : "View Performance Charts"}
            </button>

            {showCharts && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-auto">
                    <div className="bg-white p-6 rounded-lg max-w-5xl w-full relative space-y-6">
                        <button
                            onClick={() => setShowCharts(false)}
                            className="absolute top-3 right-3 text-red-600 font-bold text-xl"
                        >
                            &times;
                        </button>

                        {loadingPerformance && <p className="text-center p-6">Loading performance...</p>}
                        {performanceError && <p className="text-center text-red-600">{performanceError}</p>}

                        {maintenanceChartData.length > 0 && (
                            <>
                                <h2 className="text-2xl font-semibold mb-4">Maintenance Cost Over Time</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={maintenanceChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Maintenance Cost" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </>
                        )}

                        {fuelChartData.length > 0 && (
                            <>
                                <h2 className="text-2xl font-semibold mb-4 mt-6">Fuel Consumption & Cost</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={fuelChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="liters" stroke="#82ca9d" name="Fuel Liters" />
                                        <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Fuel Cost" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </>
                        )}

                        {oilChartData.length > 0 && (
                            <>
                                <h2 className="text-2xl font-semibold mb-4 mt-6">Oil Consumption & Cost</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={oilChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="liters" stroke="#f08080" name="Oil Liters" />
                                        <Line type="monotone" dataKey="cost" stroke="#ff7300" name="Oil Cost" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Vehicle Map */}
            <div className="mt-6">
                <h2 className="text-2xl font-semibold mb-4">📍 Vehicle Location</h2>
                <div style={{ height: 400, width: "100%" }}>
                    {vehicle?.lat && vehicle?.lng ? (
                        <MapContainer
                            key={mapKey} // force fresh mount
                            center={defaultCenter}
                            zoom={12}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap contributors"
                            />
                            <Marker position={defaultCenter}>
                                <Popup>
                                    {vehicle.registration_number} <br /> Current Location
                                </Popup>
                            </Marker>
                        </MapContainer>
                    ) : (
                        <p className="text-gray-500">Vehicle location unavailable.</p>
                    )}
                </div>
            </div>

            {/* Schedule Maintenance Form */}
            <div className="p-6 bg-gray-50 rounded-md shadow-sm space-y-5">
                <h2 className="text-2xl font-semibold mb-4">🧰 Schedule Maintenance</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
                        <input
                            type="text"
                            value={maintenanceType}
                            onChange={(e) => setMaintenanceType(e.target.value)}
                            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                            placeholder="Engine Service, Oil Change..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                            placeholder="Brief details about maintenance work"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance Due</label>
                        <input
                            type="date"
                            value={nextDue}
                            onChange={(e) => setNextDue(e.target.value)}
                            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (RWF)</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-2 text-white rounded-md ${submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                        {submitting ? "Saving..." : "Save Maintenance Record"}
                    </button>

                    {formError && <p className="text-red-600">{formError}</p>}
                    {formSuccess && <p className="text-green-600">{formSuccess}</p>}
                </form>
            </div>

            <button
                onClick={() => router.back()}
                className="mt-6 text-blue-600 hover:underline"
            >
                ← Back
            </button>
        </div>
    );
}
