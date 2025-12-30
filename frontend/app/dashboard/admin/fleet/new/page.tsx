// app/dashboard/admin/fleet/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AddVehiclePage() {
    const router = useRouter();

    const [registration, setRegistration] = useState("");
    const [model, setModel] = useState("");
    const [fuelType, setFuelType] = useState("Diesel");
    const [status, setStatus] = useState("active");
    const [photo, setPhoto] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append("registration_number", registration);
            formData.append("model", model);
            formData.append("fuel_type", fuelType);
            formData.append("status", status);
            if (photo) formData.append("photo", photo);

            const res = await api.post("/fleet/vehicles/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.status === 201 || res.status === 200) {
                setSuccess("Vehicle added successfully!");
                setTimeout(() => router.push("/(fleet)"), 1500);
            }
        } catch (err: any) {
            console.error("Failed to add vehicle:", err);
            setError("Failed to add vehicle. Please check your data.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6">
                🚘 Add New Vehicle
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Registration Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registration Number
                    </label>
                    <input
                        type="text"
                        value={registration}
                        onChange={(e) => setRegistration(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        placeholder="e.g. RAD123X"
                        required
                    />
                </div>

                {/* Vehicle Model */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Model
                    </label>
                    <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                        placeholder="e.g. Toyota Hino"
                        required
                    />
                </div>

                {/* Fuel Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuel Type
                    </label>
                    <select
                        value={fuelType}
                        onChange={(e) => setFuelType(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    >
                        <option value="Diesel">Diesel</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Electric">Electric</option>
                        <option value="Hybrid">Hybrid</option>
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
                    >
                        <option value="active">Active</option>
                        <option value="on_road">On Road</option>
                        <option value="maintenance">In Maintenance</option>
                        <option value="passive">Passive</option>
                    </select>
                </div>

                {/* Upload Photo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vehicle Photo
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                        className="w-full border px-3 py-2 rounded-md bg-white focus:outline-none focus:ring focus:ring-blue-200"
                    />
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-2 text-white rounded-md ${
                            submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {submitting ? "Submitting..." : "Add Vehicle"}
                    </button>
                </div>
            </form>

            {/* Alerts */}
            {error && <p className="mt-4 text-red-600">{error}</p>}
            {success && <p className="mt-4 text-green-600">{success}</p>}
        </div>
    );
}
