"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Image from "next/image";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from "recharts";

interface VehicleDetail {
    id: number;
    registration_number: string;
    vehicle_type: string;
    status: string;
    mileage: number;
    last_service_date: string;
    next_service_due: string;
    driver?: { id: number; full_name: string };
}

interface Driver {
    id: number;
    full_name: string;
    rating: number; // driver performance
}

interface FuelRecord {
    id: number;
    date: string;
    liters: number;
    cost: number;
}

interface MaintenanceRecord {
    id: number;
    maintenance_type: string;
    date: string;
    next_due: string;
    cost: number;
}

interface VehiclePhoto {
    id: number;
    image: string;
}

export default function VehicleDetailClient({ vehicleId }: { vehicleId: string }) {
    const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignDriverId, setAssignDriverId] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vehicleRes, driversRes, fuelRes, maintenanceRes, photosRes] = await Promise.all([
                    api.get(`/fleet/vehicles/${vehicleId}/`),
                    api.get(`/fleet/drivers/`),
                    api.get(`/fleet/vehicles/${vehicleId}/fuel-records/`),
                    api.get(`/fleet/vehicles/${vehicleId}/maintenance-records/`),
                    api.get(`/fleet/vehicles/${vehicleId}/photos/`),
                ]);

                setVehicle(vehicleRes.data);
                setDrivers(driversRes.data);
                setFuelRecords(fuelRes.data);
                setMaintenanceRecords(maintenanceRes.data);
                setPhotos(photosRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [vehicleId]);

    const handleAssignDriver = async () => {
        if (!assignDriverId || !vehicle) return;
        try {
            await api.post(`/fleet/vehicles/${vehicle.id}/assign-driver/`, {
                driver_id: assignDriverId,
            });
            const res = await api.get(`/fleet/vehicles/${vehicleId}/`);
            setVehicle(res.data);
            setAssignDriverId(null);
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <p>Loading vehicle details...</p>;
    if (!vehicle) return <p>No vehicle found</p>;

    // Prepare chart data
    const fuelChartData = fuelRecords.map((f) => ({ date: f.date, liters: f.liters, cost: f.cost }));
    const maintenanceChartData = maintenanceRecords.map((m) => ({ date: m.date, cost: m.cost }));

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold">{vehicle.registration_number} Details</h1>

            {/* Assign Driver */}
            <section className="bg-gray-50 p-4 rounded shadow">
                <h2 className="text-xl font-semibold">Assign / Change Driver</h2>
                <div className="flex space-x-2 mt-2">
                    <select
                        className="border p-2 rounded"
                        value={assignDriverId || ""}
                        onChange={(e) => setAssignDriverId(parseInt(e.target.value))}
                    >
                        <option value="">Select Driver</option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} ({d.rating.toFixed(1)})
                            </option>
                        ))}
                    </select>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded"
                        onClick={handleAssignDriver}
                    >
                        Assign
                    </button>
                </div>
                <p className="mt-2">Current Driver: {vehicle.driver?.full_name || "Unassigned"}</p>
            </section>

            {/* Vehicle Info */}
            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Vehicle Info</h2>
                <ul className="list-disc pl-4">
                    <li>Type: {vehicle.vehicle_type}</li>
                    <li>Status: {vehicle.status}</li>
                    <li>Mileage: {vehicle.mileage} km</li>
                    <li>Last Service: {vehicle.last_service_date}</li>
                    <li>Next Service Due: {vehicle.next_service_due}</li>
                </ul>
            </section>

            {/* Fuel Consumption Chart */}
            <section className="bg-gray-50 p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Fuel Consumption Trend</h2>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={fuelChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="liters" stroke="#8884d8" name="Liters" />
                        <Line type="monotone" dataKey="cost" stroke="#82ca9d" name="Cost" />
                    </LineChart>
                </ResponsiveContainer>
            </section>

            {/* Maintenance Cost Chart */}
            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Maintenance Cost Trend</h2>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={maintenanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cost" fill="#ff7300" name="Cost" />
                    </BarChart>
                </ResponsiveContainer>
            </section>

            {/* Vehicle Photos */}
            <section className="bg-gray-50 p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Vehicle Photos</h2>
                <div className="flex space-x-4 overflow-x-auto">
                    {photos.map((p) => (
                        <div key={p.id} className="w-48 h-32 relative">
                            <Image src={p.image} alt="Vehicle Photo" fill className="object-cover rounded" />
                        </div>
                    ))}
                </div>
            </section>

            {/* Actions */}
            <section className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">Actions</h2>
                <div className="flex space-x-4">
                    <button className="bg-green-500 text-white px-4 py-2 rounded">Add Fuel</button>
                    <button className="bg-yellow-500 text-white px-4 py-2 rounded">Schedule Maintenance</button>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded">Add Driver</button>
                </div>
            </section>
        </div>
    );
}
