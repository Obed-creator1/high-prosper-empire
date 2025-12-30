// components/fleet/AddFuelModal.tsx
"use client";

import { useState } from "react";
import { X, Fuel } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function AddFuelModal({ vehicle, isOpen, onClose, onSuccess }: any) {
    const [form, setForm] = useState({
        start_odometer: "",
        end_odometer: "",
        liters: "",
        cost: "",
        remarks: ""
    });

    if (!isOpen || !vehicle) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/fleet/fuel-efficiency/", {
                vehicle: vehicle.id,
                ...form,
                start_odometer: Number(form.start_odometer),
                end_odometer: Number(form.end_odometer),
                liters: Number(form.liters),
                cost: Number(form.cost),
            });
            toast.success("Fuel record added successfully!");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error("Failed to save fuel record");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Fuel className="w-8 h-8 text-green-600" />
                        Add Fuel Record
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <p className="text-lg font-semibold text-center text-blue-700">{vehicle.registration_number}</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Odometer (km)</label>
                            <input
                                type="number"
                                required
                                value={form.start_odometer}
                                onChange={(e) => setForm({ ...form, start_odometer: e.target.value })}
                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Odometer (km)</label>
                            <input
                                type="number"
                                required
                                value={form.end_odometer}
                                onChange={(e) => setForm({ ...form, end_odometer: e.target.value })}
                                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Liters</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={form.liters}
                                onChange={(e) => setForm({ ...form, liters: e.target.value })}
                                className="w-full px-4 py-3 border rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cost (RM)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={form.cost}
                                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                                className="w-full px-4 py-3 border rounded-xl"
                            />
                        </div>
                    </div>

                    <textarea
                        placeholder="Remarks (optional)"
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                        className="w-full px-4 py-3 border rounded-xl resize-none"
                        rows={3}
                    />

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-300 rounded-xl hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl hover:shadow-lg font-bold"
                        >
                            Save Fuel Record
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}