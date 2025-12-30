"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AddFuelPage({ params }: { params: { vehicleId: string } }) {
    const router = useRouter();
    const { vehicleId } = params;

    const [liters, setLiters] = useState("");
    const [cost, setCost] = useState("");
    const [date, setDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                liters: parseFloat(liters),
                cost: parseFloat(cost),
                date,
            };

            const res = await api.post(`/fleet/vehicles/${vehicleId}/fuel/`, payload);

            if (res.status === 201 || res.status === 200) {
                setSuccess("Fuel record added successfully!");
                setTimeout(() => router.push(`/dashboard/admin/fleet/${vehicleId}`), 1500);
            }
        } catch (err: any) {
            console.error(err);
            setError("Failed to add fuel record.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">⛽ Add Fuel</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="number"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    placeholder="Liters"
                    className="w-full border px-3 py-2 rounded-md"
                    required
                />
                <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="Cost (RWF)"
                    className="w-full border px-3 py-2 rounded-md"
                    required
                />
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border px-3 py-2 rounded-md"
                    required
                />
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 bg-green-600 text-white rounded-md"
                >
                    {submitting ? "Saving..." : "Add Fuel Record"}
                </button>
            </form>

            {error && <p className="text-red-600 mt-2">{error}</p>}
            {success && <p className="text-green-600 mt-2">{success}</p>}
            <button onClick={() => router.back()} className="mt-4 text-blue-600">
                ← Back
            </button>
        </div>
    );
}
