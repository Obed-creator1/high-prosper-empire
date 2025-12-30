"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Driver {
    id: number;
    full_name: string;
    phone: string;
}

export default function AssignDriverPage({ params }: { params: { vehicleId: string } }) {
    const router = useRouter();
    const { vehicleId } = params;

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const res = await api.get("/users/drivers/"); // or your HR API endpoint
                setDrivers(res.data);
            } catch (err: any) {
                console.error(err);
                setError("Failed to load drivers.");
            } finally {
                setLoading(false);
            }
        };
        fetchDrivers();
    }, []);

    const handleAssign = async () => {
        if (!selectedDriver) return;
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = { driver_id: selectedDriver };
            const res = await api.post(`/fleet/vehicles/${vehicleId}/assign_driver/`, payload);
            if (res.status === 200) {
                setSuccess(`Driver assigned successfully!`);
                setTimeout(() => router.push(`/dashboard/admin/fleet/${vehicleId}`), 1500);
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to assign driver.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">👷 Assign Driver</h1>

            {loading ? (
                <p>Loading drivers...</p>
            ) : error ? (
                <p className="text-red-600">{error}</p>
            ) : (
                <div className="space-y-4">
                    <select
                        className="w-full border px-3 py-2 rounded-md"
                        value={selectedDriver ?? ""}
                        onChange={(e) => setSelectedDriver(parseInt(e.target.value))}
                    >
                        <option value="" disabled>
                            Select a driver
                        </option>
                        {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.full_name} ({d.phone})
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleAssign}
                        disabled={submitting || !selectedDriver}
                        className="w-full py-2 bg-blue-600 text-white rounded-md"
                    >
                        {submitting ? "Assigning..." : "Assign Driver"}
                    </button>

                    {success && <p className="text-green-600">{success}</p>}
                    {error && <p className="text-red-600">{error}</p>}
                </div>
            )}

            <button onClick={() => router.back()} className="mt-4 text-blue-600">
                ← Back
            </button>
        </div>
    );
}
