"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Driver {
    id: number;
    full_name: string;
    license_number?: string;
    phone?: string;
    assigned_vehicle?: number | null;
}

export default function AssignDriverPage({
                                             params,
                                         }: {
    params: { vehicleId: string };
}) {
    const router = useRouter();
    const { vehicleId } = params;

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
    const [vehicleName, setVehicleName] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Load vehicle and drivers
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vRes, dRes] = await Promise.all([
                    api.get(`/fleet/vehicles/${vehicleId}/`),
                    api.get(`/fleet/drivers/`), // or `/api/users/?role=driver`
                ]);
                setVehicleName(vRes.data.registration_number);
                setDrivers(dRes.data);
            } catch (err: any) {
                console.error("Failed to fetch data:", err);
                setError("Unable to load drivers or vehicle info.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [vehicleId]);

    // Handle assignment
    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriver) {
            setError("Please select a driver to assign.");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await api.post(`/fleet/vehicles/${vehicleId}/assign_driver/`, {
                driver_id: selectedDriver,
            });

            if (res.status === 200 || res.status === 201) {
                setSuccess("Driver successfully assigned!");
                setTimeout(() => router.push(`/dashboard/admin/fleet/${vehicleId}`), 1500);
            }
        } catch (err: any) {
            console.error("Driver assignment failed:", err);
            setError("Unable to assign driver. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6">
                🚛 Assign Driver to {vehicleName}
            </h1>

            <form onSubmit={handleAssign} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Driver
                    </label>
                    <select
                        value={selectedDriver ?? ""}
                        onChange={(e) => setSelectedDriver(Number(e.target.value))}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    >
                        <option value="">-- Choose Driver --</option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} — {d.phone || "No phone"}
                            </option>
                        ))}
                    </select>
                </div>

                {drivers.find((d) => d.id === selectedDriver)?.assigned_vehicle && (
                    <p className="text-yellow-600 text-sm">
                        ⚠ This driver is currently assigned to another vehicle.
                    </p>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-2 text-white rounded-md ${
                        submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {submitting ? "Assigning..." : "Assign Driver"}
                </button>
            </form>

            {error && <p className="mt-4 text-red-600">{error}</p>}
            {success && <p className="mt-4 text-green-600">{success}</p>}

            <button
                onClick={() => router.back()}
                className="mt-6 text-blue-600 hover:underline"
            >
                ← Back
            </button>
        </div>
    );
}
