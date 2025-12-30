"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AddFuelRecordPage({
                                              params,
                                          }: {
    params: { vehicleId: string };
}) {
    const router = useRouter();
    const { vehicleId } = params;

    const [date, setDate] = useState("");
    const [liters, setLiters] = useState("");
    const [cost, setCost] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                date,
                liters: parseFloat(liters),
                cost: parseFloat(cost),
                remarks,
            };

            const res = await api.post(`/fleet/vehicles/${vehicleId}/fuel/`, payload);

            if (res.status === 201 || res.status === 200) {
                setSuccess("Fuel record added successfully!");
                setTimeout(() => router.push(`/dashboard/admin/fleet/${vehicleId}`), 1500);
            }
        } catch (err: any) {
            console.error("Failed to add fuel record:", err);
            setError("Unable to save fuel record. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6">⛽ Add Fuel Record</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    />
                </div>

                {/* Liters */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuel Volume (Liters)
                    </label>
                    <input
                        type="number"
                        value={liters}
                        onChange={(e) => setLiters(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        placeholder="Enter liters filled"
                        required
                    />
                </div>

                {/* Cost */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Cost (RWF)
                    </label>
                    <input
                        type="number"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        placeholder="Enter total fuel cost"
                        required
                    />
                </div>

                {/* Remarks */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remarks (optional)
                    </label>
                    <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        placeholder="E.g. refueled at Total Nyabugogo station"
                        rows={3}
                    />
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-2 text-white rounded-md ${
                            submitting ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {submitting ? "Saving..." : "Save Fuel Record"}
                    </button>
                </div>
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
