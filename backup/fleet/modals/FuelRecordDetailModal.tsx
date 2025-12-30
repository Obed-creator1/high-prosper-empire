// components/fleet/modals/FuelRecordDetailModal.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Fuel, Gauge, Save, Edit } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const fuelSchema = z.object({
    liters: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Must be a positive number"
    }),
    cost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Must be a valid amount"
    }),
    remarks: z.string().max(300, "Remarks too long").optional(),
});

type FuelFormData = z.infer<typeof fuelSchema>;

export default function FuelRecordDetailModal({ record: initialRecord, isOpen, onClose, onUpdate }: any) {
    const [record, setRecord] = useState(initialRecord);
    const [isEditing, setIsEditing] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FuelFormData>({
        resolver: zodResolver(fuelSchema),
        defaultValues: {
            liters: initialRecord?.liters?.toString() || "",
            cost: initialRecord?.cost?.toString() || "",
            remarks: initialRecord?.remarks || ""
        }
    });

    const onSubmit = async (data: FuelFormData) => {
        try {
            const res = await api.patch(`/fleet/fuel-efficiency/${record.id}/`, {
                liters: Number(data.liters),
                cost: Number(data.cost),
                remarks: data.remarks
            });
            setRecord(res.data);
            setIsEditing(false);
            toast.success("Fuel record updated!");
            onUpdate?.(res.data);
            reset();
        } catch {
            toast.error("Update failed");
        }
    };

    if (!isOpen || !record) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/20 rounded-2xl"><X className="w-6 h-6" /></button>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-4xl font-black flex items-center gap-4">
                                <Fuel className="w-12 h-12" />
                                {record.registration_number}
                            </h2>
                            <p className="text-xl opacity-90">{record.brand_model}</p>
                        </div>
                        <button onClick={() => setIsEditing(!isEditing)} className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold flex items-center gap-3">
                            {isEditing ? "Cancel" : <Edit className="w-5 h-5" />} {isEditing ? "Cancel" : "Edit"}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-100 rounded-2xl p-6">
                            <label className="text-sm text-gray-600 mb-2 block">Liters Filled <span className="text-red-500">*</span></label>
                            {isEditing ? (
                                <div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register("liters")}
                                        className={`w-full px-4 py-3 text-3xl font-black rounded-xl border ${errors.liters ? "border-red-500" : "border-blue-300"} focus:ring-4 focus:ring-blue-500/30 outline-none`}
                                    />
                                    {errors.liters && <p className="text-red-600 text-sm mt-2">{errors.liters.message}</p>}
                                </div>
                            ) : (
                                <p className="text-4xl font-black">{record.liters} L</p>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl p-6">
                            <label className="text-sm text-gray-600 mb-2 block">Total Cost (RWF) <span className="text-red-500">*</span></label>
                            {isEditing ? (
                                <div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        {...register("cost")}
                                        className={`w-full px-4 py-3 text-3xl font-black rounded-xl border ${errors.cost ? "border-red-500" : "border-orange-300"} focus:ring-4 focus:ring-orange-500/30 outline-none`}
                                    />
                                    {errors.cost && <p className="text-red-600 text-sm mt-2">{errors.cost.message}</p>}
                                </div>
                            ) : (
                                <p className="text-4xl font-black">RWF {record.cost.toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6">
                        <label className="font-bold mb-3 block">Remarks</label>
                        {isEditing ? (
                            <div>
                <textarea
                    {...register("remarks")}
                    rows={3}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.remarks ? "border-red-500" : "border-gray-300"} focus:ring-4 focus:ring-blue-500/30 outline-none`}
                />
                                {errors.remarks && <p className="text-red-600 text-sm mt-2">{errors.remarks.message}</p>}
                            </div>
                        ) : (
                            <p className="text-gray-700">{record.remarks || "No remarks"}</p>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); reset(); }}
                                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-2xl hover:bg-gray-300 transition font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-2xl hover:shadow-2xl transition font-bold flex items-center gap-3 text-lg disabled:opacity-70"
                            >
                                <Save className="w-6 h-6" /> {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </motion.div>
    );
}