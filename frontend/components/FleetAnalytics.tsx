// components/FleetAnalytics.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

interface FuelData {
    vehicle__registration_number: string;
    total_fuel: number;
}

interface RouteEfficiency {
    vehicle: string;
    efficiency: number;
}

interface OversizedWaste {
    vehicle__registration_number: string;
    total_oversized: number;
}

interface MaintenanceAlert {
    vehicle: string;
    next_service_due: string;
}

export default function FleetAnalytics() {
    const [fuelData, setFuelData] = useState<FuelData[]>([]);
    const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
    const [oversizedWaste, setOversizedWaste] = useState<OversizedWaste[]>([]);
    const [routeEfficiency, setRouteEfficiency] = useState<RouteEfficiency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await api.get("/fleet/analytics/");
                setFuelData(res.data.fuel_report || []);
                setMaintenanceAlerts(res.data.maintenance_alerts || []);
                setOversizedWaste(res.data.oversized_waste || []);
                setRouteEfficiency(res.data.route_efficiency || []);
            } catch (err: any) {
                console.error("Failed to fetch analytics:", err);
                setError("Failed to load analytics data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <p>Loading fleet analytics...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Fuel Usage Bar Chart */}
            <BarChart width={500} height={300} data={fuelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle__registration_number" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_fuel" fill="#8884d8" />
            </BarChart>

            {/* Route Efficiency Line Chart */}
            <LineChart width={500} height={300} data={routeEfficiency}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="efficiency" stroke="#82ca9d" />
            </LineChart>

            {/* Oversized Waste Bar Chart */}
            <BarChart width={500} height={300} data={oversizedWaste}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicle__registration_number" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_oversized" fill="#ff7300" />
            </BarChart>

            {/* Maintenance Alerts */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Maintenance Alerts</h3>
                <ul className="list-disc pl-4">
                    {maintenanceAlerts.map((a, i) => (
                        <li key={i}>
                            {a.vehicle} - Next service due: {a.next_service_due}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
