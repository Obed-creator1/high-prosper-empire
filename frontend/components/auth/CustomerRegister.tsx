// components/auth/CustomerRegister.tsx — FULLY ACCESSIBLE PROFESSIONAL FORM 2025
"use client";

import { useState, useEffect } from "react";
import { X, User, Phone, Mail, MapPin, DollarSign, Calendar, IdCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import api from "@/lib/api";

interface CustomerRegisterProps {
    onClose: () => void;
    onSuccess?: () => void;
    villages: any[];
    initialData?: any;
    isEditMode?: boolean;
}

export default function CustomerRegister({
                                             onClose,
                                             onSuccess,
                                             villages,
                                             initialData,
                                             isEditMode = false
                                         }: CustomerRegisterProps) {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        nid: "",
        gender: "",
        date_of_birth: "",
        village_id: "",
        monthly_fee: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData) {
            setForm({
                name: initialData.name || "",
                phone: initialData.phone || "",
                email: initialData.email || "",
                nid: initialData.nid || "",
                gender: initialData.gender || "",
                date_of_birth: initialData.date_of_birth || "",
                village_id: initialData.village_id?.toString() || "",
                monthly_fee: initialData.monthly_fee || "",
            });
        }
    }, [initialData]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) newErrors.name = "Full name is required";
        else if (form.name.trim().length < 3) newErrors.name = "Name must be at least 3 characters";
        else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) newErrors.name = "Name can only contain letters and spaces";

        if (!form.phone) newErrors.phone = "Phone number is required";
        else if (!/^07[8,2,3,9][0-9]{7}$/.test(form.phone)) newErrors.phone = "Invalid Rwanda phone number (e.g., 0781234567)";

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email address";

        if (form.nid && !/^\d{16}$/.test(form.nid)) newErrors.nid = "National ID must be 16 digits";

        if (form.date_of_birth) {
            const dob = new Date(form.date_of_birth);
            if (dob > new Date()) newErrors.date_of_birth = "Date of birth cannot be in the future";
        }

        if (!form.village_id) newErrors.village_id = "Please select a village";

        const fee = parseFloat(form.monthly_fee);
        if (!form.monthly_fee || isNaN(fee)) newErrors.monthly_fee = "Monthly fee is required";
        else if (fee < 1000) newErrors.monthly_fee = "Monthly fee must be at least 1,000 RWF";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Please fix the errors in the form");
            return;
        }
        setLoading(true);

        try {
            if (isEditMode && initialData?.id) {
                await api.patch(`/customers/customers/${initialData.id}/edit/`, form);
                toast.success("Customer updated successfully!");
            } else {
                await api.post("/customers/register/", form);
                toast.success("Customer registered successfully!");
            }
            onSuccess?.();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const modalTitle = isEditMode ? "Edit Customer" : "Register New Customer";
    const submitText = loading ? "Saving..." : isEditMode ? "Update Customer" : "Register Customer";

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
                role="document"
            >
                <div className="p-6 sm:p-8 md:p-10">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                        <h2
                            id="modal-title"
                            className="text-3xl sm:text-4xl md:text-5xl font-black text-white"
                        >
                            {modalTitle}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            aria-label="Close modal"
                            className="text-white hover:bg-white/20 focus:ring-4 focus:ring-purple-500"
                        >
                            <X className="w-7 h-7 sm:w-8 sm:h-8" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8" noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {/* Full Name */}
                            <div className="md:col-span-2">
                                <Label
                                    htmlFor="name"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <User className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Full Name <span className="text-red-400 ml-1">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    required
                                    aria-required="true"
                                    aria-invalid={!!errors.name}
                                    aria-describedby={errors.name ? "name-error" : undefined}
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className={`bg-white/10 border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                    placeholder="Enter full name"
                                />
                                {errors.name && (
                                    <p id="name-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Phone */}
                            <div>
                                <Label
                                    htmlFor="phone"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <Phone className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Phone Number <span className="text-red-400 ml-1">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    required
                                    aria-required="true"
                                    disabled={isEditMode}
                                    aria-invalid={!!errors.phone}
                                    aria-describedby={errors.phone ? "phone-error" : undefined}
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className={`bg-white/10 border ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                    placeholder="0781234567"
                                />
                                {errors.phone && (
                                    <p id="phone-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.phone}
                                    </p>
                                )}
                                {isEditMode && (
                                    <p className="text-purple-300 text-sm mt-2">Phone cannot be changed (used as username)</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <Label
                                    htmlFor="email"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <Mail className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Email (Optional)
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className={`bg-white/10 border ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                    placeholder="customer@example.com"
                                />
                                {errors.email && (
                                    <p id="email-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            {/* NID */}
                            <div>
                                <Label
                                    htmlFor="nid"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <IdCard className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    National ID (Optional)
                                </Label>
                                <Input
                                    id="nid"
                                    aria-invalid={!!errors.nid}
                                    aria-describedby={errors.nid ? "nid-error" : undefined}
                                    value={form.nid}
                                    onChange={e => setForm({ ...form, nid: e.target.value })}
                                    className={`bg-white/10 border ${errors.nid ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                    placeholder="1199980000000000"
                                />
                                {errors.nid && (
                                    <p id="nid-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.nid}
                                    </p>
                                )}
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <Label
                                    htmlFor="dob"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Date of Birth (Optional)
                                </Label>
                                <Input
                                    id="dob"
                                    type="date"
                                    aria-invalid={!!errors.date_of_birth}
                                    aria-describedby={errors.date_of_birth ? "dob-error" : undefined}
                                    value={form.date_of_birth}
                                    onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                                    className={`bg-white/10 border ${errors.date_of_birth ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                />
                                {errors.date_of_birth && (
                                    <p id="dob-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.date_of_birth}
                                    </p>
                                )}
                            </div>

                            {/* Gender */}
                            <div>
                                <Label
                                    htmlFor="gender"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    Gender (Optional)
                                </Label>
                                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                                    <SelectTrigger
                                        id="gender"
                                        className="bg-white/10 border-purple-500 text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500"
                                        aria-label="Select gender"
                                    >
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="M">Male</SelectItem>
                                        <SelectItem value="F">Female</SelectItem>
                                        <SelectItem value="O">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Village */}
                            <div>
                                <Label
                                    htmlFor="village"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Village <span className="text-red-400 ml-1">*</span>
                                </Label>
                                <Select value={form.village_id} onValueChange={v => setForm({ ...form, village_id: v })}>
                                    <SelectTrigger
                                        id="village"
                                        className={`bg-white/10 border ${errors.village_id ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                        aria-required="true"
                                        aria-invalid={!!errors.village_id}
                                        aria-describedby={errors.village_id ? "village-error" : undefined}
                                    >
                                        <SelectValue placeholder="Select village" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {villages.map(v => (
                                            <SelectItem key={v.id} value={v.id.toString()}>
                                                {v.name} ({v.cell_name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.village_id && (
                                    <p id="village-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.village_id}
                                    </p>
                                )}
                            </div>

                            {/* Monthly Fee */}
                            <div>
                                <Label
                                    htmlFor="fee"
                                    className="text-white flex items-center gap-3 mb-3 text-base sm:text-lg"
                                >
                                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                    Monthly Fee (RWF) <span className="text-red-400 ml-1">*</span>
                                </Label>
                                <Input
                                    id="fee"
                                    type="number"
                                    required
                                    min="1000"
                                    step="1000"
                                    aria-required="true"
                                    aria-invalid={!!errors.monthly_fee}
                                    aria-describedby={errors.monthly_fee ? "fee-error" : undefined}
                                    value={form.monthly_fee}
                                    onChange={e => setForm({ ...form, monthly_fee: e.target.value })}
                                    className={`bg-white/10 border ${errors.monthly_fee ? 'border-red-500 focus:border-red-500' : 'border-purple-500'} text-white py-5 sm:py-7 text-base sm:text-lg focus:ring-4 focus:ring-purple-500`}
                                    placeholder="45000"
                                />
                                {errors.monthly_fee && (
                                    <p id="fee-error" className="text-red-400 text-sm mt-2 flex items-center gap-2" role="alert">
                                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                        {errors.monthly_fee}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10 pt-6 border-t border-purple-700">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="w-full sm:w-auto px-8 py-5 text-base sm:text-lg focus:ring-4 focus:ring-purple-500"
                                aria-label="Cancel and close form"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-10 py-5 text-base sm:text-lg shadow-lg focus:ring-4 focus:ring-purple-500"
                                aria-label={submitText}
                            >
                                {submitText}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}