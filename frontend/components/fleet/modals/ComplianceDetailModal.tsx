// components/fleet/modals/ComplianceDetailModal.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Shield, FileText, AlertTriangle, Download, Edit, Save, XCircle } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const complianceSchema = z.object({
    expiry_date: z.string().min(1, "Expiry date is required"),
    notes: z.string().max(500, "Notes must be under 500 characters").optional(),
});

type ComplianceFormData = z.infer<typeof complianceSchema>;

interface Compliance {
    id: number;
    registration_number: string;
    compliance_type: string;
    issue_date: string;
    expiry_date: string;
    days_left: number;
    status: string;
    document_url?: string;
    notes?: string;
}

export default function ComplianceDetailModal({
                                                  compliance: initialCompliance,
                                                  isOpen,
                                                  onClose,
                                                  onUpdate
                                              }: {
    compliance: Compliance | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updated: Compliance) => void;
}) {
    const [compliance, setCompliance] = useState<Compliance | null>(initialCompliance);
    const [isEditing, setIsEditing] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ComplianceFormData>({
        resolver: zodResolver(complianceSchema),
        defaultValues: {
            expiry_date: initialCompliance?.expiry_date || "",
            notes: initialCompliance?.notes || ""
        }
    });

    const onSubmit = async (data: ComplianceFormData) => {
        try {
            const res = await api.patch(`/fleet/compliances/${compliance!.id}/`, data);
            setCompliance(res.data);
            setIsEditing(false);
            toast.success("Compliance updated successfully!");
            onUpdate?.(res.data);
            reset(data);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to update");
        }
    };

    if (!isOpen || !compliance) return null;

    const getStatusColor = (status: string) => {
        const colors: any = {
            expired: "from-red-500 to-rose-600",
            critical: "from-orange-500 to-red-500",
            warning: "from-yellow-500 to-orange-500",
            valid: "from-green-500 to-emerald-600",
        };
        return colors[status] || "from-gray-500 to-gray-600";
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`bg-gradient-to-r ${getStatusColor(compliance.status)} p-8 text-white relative`}>
                    <button onClick={onClose} className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-2xl">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-4xl font-black flex items-center gap-4">
                                <Shield className="w-12 h-12" />
                                {compliance.registration_number}
                            </h2>
                            <p className="text-xl mt-2 opacity-90">{compliance.compliance_type}</p>
                        </div>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl flex items-center gap-3 font-bold"
                        >
                            {isEditing ? <XCircle className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                            {isEditing ? "Cancel" : "Edit"}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
                    {/* Expiry Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 rounded-2xl p-6">
                            <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Expiry Date <span className="text-red-500">*</span></label>
                            {isEditing ? (
                                <div>
                                    <input
                                        type="date"
                                        {...register("expiry_date")}
                                        className={`w-full px-4 py-3 rounded-xl border ${errors.expiry_date ? "border-red-500" : "border-blue-300"} focus:ring-4 focus:ring-blue-500/30 outline-none text-lg font-bold`}
                                    />
                                    {errors.expiry_date && (
                                        <p className="text-red-600 text-sm mt-2">{errors.expiry_date.message}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-2xl font-bold">{format(new Date(compliance.expiry_date), "dd MMM yyyy")}</p>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/50 rounded-2xl p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Days Remaining</p>
                            <p className={`text-4xl font-black ${compliance.days_left < 0 ? "text-red-600" : compliance.days_left <= 5 ? "text-orange-600" : "text-green-600"}`}>
                                {Math.abs(compliance.days_left)} {compliance.days_left < 0 ? "days overdue" : "days"}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
                        <label className="font-bold mb-3 flex items-center gap-2 block">
                            <FileText className="w-5 h-5" /> Notes (Optional)
                        </label>
                        {isEditing ? (
                            <div>
                <textarea
                    {...register("notes")}
                    rows={4}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.notes ? "border-red-500" : "border-gray-300"} focus:ring-4 focus:ring-blue-500/30 outline-none`}
                    placeholder="Add internal notes..."
                />
                                {errors.notes && (
                                    <p className="text-red-600 text-sm mt-2">{errors.notes.message}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-700">{compliance.notes || "No notes added"}</p>
                        )}
                    </div>

                    {/* Document */}
                    {compliance.document_url && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <FileText className="w-10 h-10 text-blue-600" />
                                    <div>
                                        <p className="font-bold">Compliance Document</p>
                                        <p className="text-sm text-gray-600">Uploaded on {format(new Date(), "dd MMM yyyy")}</p>
                                    </div>
                                </div>
                                <a href={compliance.document_url} target="_blank" className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
                                    <Download className="w-5 h-5" /> View
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    {isEditing && (
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                                <Save className="w-6 h-6" />
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}
                </form>
            </motion.div>
        </motion.div>
    );
}