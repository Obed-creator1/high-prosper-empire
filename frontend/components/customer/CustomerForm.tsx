"use client";

import React, { useEffect, useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import Loader from "@/components/Loader";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

type VillageOption = {
    id: number;
    name: string;
    cell?: { id: number; name: string; sector?: { id: number; name: string } };
    collector?: { id: number; username: string };
};

type CustomerFormProps = {
    open: boolean; // ✅ controlled from parent
    customer?: any;
    onClose: () => void;
    onSaved: () => void;
};

export default function CustomerForm({
                                         open,
                                         customer,
                                         onClose,
                                         onSaved,
                                     }: CustomerFormProps) {
    const [villages, setVillages] = useState<VillageOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const [showType, setShowType] = useState(false);
    const [showStatus, setShowStatus] = useState(false);
    const [showVillage, setShowVillage] = useState(false);

    const typeRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const villageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [formData, setFormData] = useState<any>({
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        type: customer?.type || "",
        contract_no: customer?.contract_no || "",
        contract_file: null,
        monthly_fee: customer?.monthly_fee || "",
        outstanding: customer?.outstanding || "",
        status: customer?.status || "",
        payment_account: customer?.payment_account || "",
        village: customer?.village || null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // ✅ Refill form when editing a different customer
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || "",
                email: customer.email || "",
                phone: customer.phone || "",
                type: customer.type || "",
                contract_no: customer.contract_no || "",
                contract_file: null,
                monthly_fee: customer.monthly_fee || "",
                outstanding: customer.outstanding || "",
                status: customer.status || "",
                payment_account: customer.payment_account || "",
                village: customer.village || null,
            });
        }
    }, [customer]);

    useEffect(() => {
        const fetchVillages = async () => {
            setLoading(true);
            try {
                const res = await api.get("/customers/villages/");
                setVillages(res.data);
            } catch (err) {
                console.error("Failed to fetch villages:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchVillages();
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (typeRef.current && !typeRef.current.contains(e.target as Node))
                setShowType(false);
            if (statusRef.current && !statusRef.current.contains(e.target as Node))
                setShowStatus(false);
            if (villageRef.current && !villageRef.current.contains(e.target as Node))
                setShowVillage(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollToField = (name: string) => {
        const field = inputRefs.current[name];
        if (field && contentRef.current) {
            contentRef.current.scrollTo({
                top: field.offsetTop - 20,
                behavior: "smooth",
            });
        }
    };

    const handleFocus = (name: string) => scrollToField(name);

    const validateField = (name: string, value: any) => {
        let error = "";
        switch (name) {
            case "name":
                if (!value.trim()) error = "Name is required.";
                break;
            case "email":
                if (!value.trim()) error = "Email is required.";
                else if (!/^\S+@\S+\.\S+$/.test(value)) error = "Email is invalid.";
                break;
            case "phone":
                if (!value.trim()) error = "Phone is required.";
                else if (!/^\+?\d{9,15}$/.test(value)) error = "Phone is invalid.";
                break;
            case "village":
                if (!value) error = "Village is required.";
                break;
            case "monthly_fee":
            case "outstanding":
                if (value && isNaN(value)) error = "Must be a number.";
                break;
        }
        setErrors((prev) => ({ ...prev, [name]: error }));
        return error === "";
    };

    const validateForm = () => {
        const fields = [
            "name",
            "email",
            "phone",
            "village",
            "monthly_fee",
            "outstanding",
        ];
        let isValid = true;
        fields.forEach((field) => {
            if (!validateField(field, formData[field])) isValid = false;
        });
        return isValid;
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value, files } = e.target as any;
        const fieldValue = files ? files[0] : value;
        setFormData((prev) => ({ ...prev, [name]: fieldValue }));
        validateField(name, fieldValue);
    };

    const handleVillageChange = (villageId: string) => {
        const selected = villages.find((v) => v.id === parseInt(villageId));
        setFormData((prev) => ({ ...prev, village: selected || null }));
        validateField("village", selected);
        setShowVillage(false);
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setFeedback("❌ Please fix errors before submitting.");
            return;
        }
        setSaving(true);
        setFeedback(null);
        try {
            const payload = new FormData();
            for (const key in formData) {
                if (formData[key] !== null) {
                    if (key === "village")
                        payload.append("village", formData.village?.id?.toString() || "");
                    else payload.append(key, formData[key]);
                }
            }

            if (customer) {
                await api.patch(`/customers/${customer.id}/`, payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                await api.post("/customers/", payload, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            }

            setFeedback("✅ Customer saved successfully!");
            onSaved();
            setTimeout(() => {
                setFeedback(null);
                onClose();
            }, 1200);
        } catch (err) {
            console.error(err);
            setFeedback(
                "❌ Failed to save customer. Check required fields or connection."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.y > 150) onClose(); // swipe down closes
    };

    const dropdownVariants = {
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: "auto" },
    };

    return (
        <AnimatePresence>
            {open && (
                <Dialog open={open} onOpenChange={onClose}>
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <DialogContent
                            ref={contentRef}
                            className="w-full max-w-sm sm:max-w-md mx-auto dark:bg-gray-900 p-4 sm:p-6 rounded-t-xl sm:rounded-xl shadow-lg"
                            style={{ maxHeight: "70vh", overflowY: "auto" }}
                        >
                            <DialogHeader>
                                <DialogTitle className="text-lg font-semibold dark:text-white">
                                    {customer ? "Edit Customer" : "Add New Customer"}
                                </DialogTitle>
                            </DialogHeader>

                            {loading ? (
                                <Loader />
                            ) : (
                                <div className="space-y-3 mt-3">
                                    {/* Name */}
                                    <div ref={(el) => (inputRefs.current["name"] = el)}>
                                        <Label>Name *</Label>
                                        <Input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            onFocus={() => handleFocus("name")}
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div ref={(el) => (inputRefs.current["email"] = el)}>
                                        <Label>Email *</Label>
                                        <Input
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            onFocus={() => handleFocus("email")}
                                        />
                                        {errors.email && (
                                            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                                        )}
                                    </div>

                                    {/* Phone */}
                                    <div ref={(el) => (inputRefs.current["phone"] = el)}>
                                        <Label>Phone *</Label>
                                        <Input
                                            name="phone"
                                            type="tel"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            onFocus={() => handleFocus("phone")}
                                        />
                                        {errors.phone && (
                                            <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                                        )}
                                    </div>

                                    {/* Type Dropdown */}
                                    <div ref={typeRef}>
                                        <Label>Type *</Label>
                                        <div
                                            onClick={() => setShowType(!showType)}
                                            className="cursor-pointer p-2 border rounded-md bg-gray-50 dark:bg-gray-800"
                                        >
                                            {formData.type || "Select type"}
                                        </div>
                                        <AnimatePresence>
                                            {showType && (
                                                <motion.div
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="hidden"
                                                    variants={dropdownVariants}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden border rounded-md bg-white dark:bg-gray-900 shadow-sm mt-1"
                                                >
                                                    {["Individual", "Corporate"].map((t) => (
                                                        <div
                                                            key={t}
                                                            className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            onClick={() => {
                                                                setFormData({ ...formData, type: t });
                                                                setShowType(false);
                                                            }}
                                                        >
                                                            {t}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Status Dropdown */}
                                    <div ref={statusRef}>
                                        <Label>Status *</Label>
                                        <div
                                            onClick={() => setShowStatus(!showStatus)}
                                            className="cursor-pointer p-2 border rounded-md bg-gray-50 dark:bg-gray-800"
                                        >
                                            {formData.status || "Select status"}
                                        </div>
                                        <AnimatePresence>
                                            {showStatus && (
                                                <motion.div
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="hidden"
                                                    variants={dropdownVariants}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden border rounded-md bg-white dark:bg-gray-900 shadow-sm mt-1"
                                                >
                                                    {["Active", "Passive"].map((s) => (
                                                        <div
                                                            key={s}
                                                            className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            onClick={() => {
                                                                setFormData({ ...formData, status: s });
                                                                setShowStatus(false);
                                                            }}
                                                        >
                                                            {s}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Village Dropdown */}
                                    <div ref={villageRef}>
                                        <Label>Village *</Label>
                                        <div
                                            onClick={() => setShowVillage(!showVillage)}
                                            className="cursor-pointer p-2 border rounded-md bg-gray-50 dark:bg-gray-800"
                                        >
                                            {formData.village?.name || "Select village"}
                                        </div>
                                        <AnimatePresence>
                                            {showVillage && (
                                                <motion.div
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="hidden"
                                                    variants={dropdownVariants}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden max-h-40 overflow-y-auto border rounded-md bg-white dark:bg-gray-900 shadow-sm mt-1"
                                                >
                                                    {villages.map((v) => (
                                                        <div
                                                            key={v.id}
                                                            className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            onClick={() =>
                                                                handleVillageChange(v.id.toString())
                                                            }
                                                        >
                                                            {v.name}
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {formData.village && (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                Cell: {formData.village.cell?.name || "N/A"}, Sector:{" "}
                                                {formData.village.cell?.sector?.name || "N/A"},
                                                Collector: {formData.village.collector?.username || "N/A"}
                                            </p>
                                        )}
                                    </div>

                                    {/* Other Fields */}
                                    {[
                                        "payment_account",
                                        "contract_no",
                                        "contract_file",
                                        "monthly_fee",
                                        "outstanding",
                                    ].map((field) => (
                                        <div key={field} ref={(el) => (inputRefs.current[field] = el)}>
                                            <Label>
                                                {field
                                                    .replace("_", " ")
                                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                            </Label>
                                            <Input
                                                name={field}
                                                type={
                                                    field === "contract_file"
                                                        ? "file"
                                                        : field.includes("fee") || field.includes("outstanding")
                                                            ? "number"
                                                            : "text"
                                                }
                                                value={
                                                    field === "contract_file" ? undefined : formData[field]
                                                }
                                                onChange={handleChange}
                                                onFocus={() => handleFocus(field)}
                                            />
                                            {errors[field] && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {errors[field]}
                                                </p>
                                            )}
                                        </div>
                                    ))}

                                    {feedback && (
                                        <p
                                            className={`mt-2 text-sm ${
                                                feedback.startsWith("✅")
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                            }`}
                                        >
                                            {feedback}
                                        </p>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="w-full sm:w-auto"
                                >
                                    {saving ? "Saving..." : "Save Customer"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </motion.div>
                </Dialog>
            )}
        </AnimatePresence>
    );
}
