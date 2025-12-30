// frontend/app/dashboard/admin/procurement/create-pr/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Item {
    id: number;
    sku: string;
    name: string;
    item_type: "product" | "service";
    selling_price: string;
    unit_of_measure: string;
}

interface LineItem {
    item: Item | null;
    description: string;
    quantity: string;
    unit_price: string;
    total: number;
}

export default function CreatePRPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

    const [form, setForm] = useState({
        title: "",
        department: "",
        required_by_date: "",
        notes: "",
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { item: null, description: "", quantity: "1", unit_price: "0", total: 0 },
    ]);

    // Fetch Items
    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await api.get("procurement/items/?limit=500");
                const data = res.data.results || res.data;
                setItems(data);
                setFilteredItems(data);
            } catch (err) {
                toast.error("Failed to load item catalog");
                console.error(err);
            }
        };
        fetchItems();
    }, []);

    // Filter items on search
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredItems(items);
        } else {
            setFilteredItems(
                items.filter(
                    (item) =>
                        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [searchTerm, items]);

    // Add line
    const addLine = () => {
        setLineItems([
            ...lineItems,
            { item: null, description: "", quantity: "1", unit_price: "0", total: 0 },
        ]);
    };

    // Update line
    const updateLine = (index: number, field: keyof LineItem, value: any) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "item" && value) {
            updated[index].description = value.name;
            updated[index].unit_price = value.selling_price || "0";
        }

        const qty = parseFloat(updated[index].quantity) || 0;
        const price = parseFloat(updated[index].unit_price) || 0;
        updated[index].total = qty * price;

        setLineItems(updated);
    };

    // Remove line
    const removeLine = (index: number) => {
        if (lineItems.length === 1) {
            toast.error("At least one item required");
            return;
        }
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    // Grand total
    const grandTotal = lineItems.reduce((sum, line) => sum + line.total, 0);

    // Voice Input
    const startVoiceInput = () => {
        if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            toast.error("Voice recognition not supported in your browser");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;

        toast.loading("Listening... Speak your request", { id: "voice" });

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            toast.dismiss("voice");
            toast.success("Voice captured! Sending to ProsperBot AI...");

            try {
                const res = await api.post("/procurement/ai-suggest/", {
                    input: transcript,
                    department: form.department || "General",
                });

                const suggestion = res.data;

                // Auto-fill form
                setForm(prev => ({
                    ...prev,
                    title: suggestion.title || prev.title,
                    notes: suggestion.notes || prev.notes,
                }));

                // Auto-fill line items
                if (suggestion.items && suggestion.items.length > 0) {
                    setLineItems(
                        suggestion.items.map((it: any) => ({
                            item: null,
                            description: it.name,
                            quantity: it.quantity.toString(),
                            unit_price: it.unit_price?.toString() || "0",
                            total: (it.quantity || 0) * (it.unit_price || 0),
                        }))
                    );
                }

                toast.success("AI has filled the form for you! Review and submit.");
            } catch {
                toast.error("AI suggestion failed");
            }
        };

        recognition.onerror = () => {
            toast.dismiss("voice");
            toast.error("Voice recognition error");
        };

        recognition.start();
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title || !form.required_by_date) {
            toast.error("Title and required date are required");
            return;
        }

        if (lineItems.some(l => !l.description || parseFloat(l.quantity) <= 0)) {
            toast.error("All lines must have description and quantity");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: form.title,
                department: form.department,
                required_by_date: form.required_by_date,
                notes: form.notes,
                items: lineItems.map(l => ({
                    description: l.description,
                    quantity: parseFloat(l.quantity),
                    unit_price_estimated: parseFloat(l.unit_price),
                })),
            };

            await api.post("procurement/pr/", payload);
            toast.success("Purchase Requisition created successfully!");
            router.push("/dashboard/admin/procurement");
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Failed to create PR");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Create Purchase Requisition</h1>
                    <p className="text-gray-600 mt-2">Use voice or text — ProsperBot AI will help fill the form</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Requisition Details */}
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold mb-8">Requisition Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                                    placeholder="e.g., Office IT Equipment Upgrade Q1 2026"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                <input
                                    type="text"
                                    value={form.department}
                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                                    placeholder="e.g., IT, Operations, Marketing"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Required By Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={form.required_by_date}
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setForm({ ...form, required_by_date: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    rows={4}
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                                    placeholder="Any special requirements, urgency, or justification..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold">Items Required</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Search & Select Item
                                    </th>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Unit Price (Est.)
                                    </th>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Line Total
                                    </th>
                                    <th className="px-8 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {lineItems.map((line, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-8 py-4 relative">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onFocus={() => setActiveLineIndex(index)}
                                                placeholder="Type to search SKU or name..."
                                                className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500"
                                            />
                                            {activeLineIndex === index && searchTerm && filteredItems.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                                                    {filteredItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => {
                                                                updateLine(index, "item", item);
                                                                setSearchTerm("");
                                                                setActiveLineIndex(null);
                                                            }}
                                                            className="px-6 py-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b last:border-0"
                                                        >
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{item.sku}</p>
                                                                <p className="text-sm text-gray-600">{item.name}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold">${parseFloat(item.selling_price).toFixed(2)}</p>
                                                                <p className="text-xs text-gray-500">{item.unit_of_measure}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-8 py-4">
                                            <input
                                                type="text"
                                                value={line.description}
                                                onChange={(e) => updateLine(index, "description", e.target.value)}
                                                className="w-full px-5 py-3 border border-gray-300 rounded-xl"
                                                placeholder="Auto-filled from item"
                                            />
                                        </td>

                                        <td className="px-8 py-4">
                                            <input
                                                type="number"
                                                min="0.001"
                                                step="0.001"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, "quantity", e.target.value)}
                                                className="w-32 px-5 py-3 border border-gray-300 rounded-xl"
                                            />
                                        </td>

                                        <td className="px-8 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={line.unit_price}
                                                onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                                                className="w-40 px-5 py-3 border border-gray-300 rounded-xl"
                                            />
                                        </td>

                                        <td className="px-8 py-4 font-bold text-lg">
                                            ${line.total.toFixed(2)}
                                        </td>

                                        <td className="px-8 py-4">
                                            <button
                                                type="button"
                                                onClick={() => removeLine(index)}
                                                className="text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-8 py-6 border-t bg-gray-50 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={addLine}
                                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
                            >
                                + Add Another Item
                            </button>

                            <div className="text-right">
                                <p className="text-xl font-bold">
                                    Total Estimated Amount:
                                    <span className="text-3xl text-blue-600 ml-4">
                    ${grandTotal.toFixed(2)}
                  </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Voice Button */}
                    <div className="fixed bottom-8 right-8">
                        <button
                            type="button"
                            onClick={startVoiceInput}
                            className="w-20 h-20 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition flex items-center justify-center text-4xl"
                        >
                            🎤
                        </button>
                        <p className="text-center text-sm text-gray-600 mt-2">Voice Input</p>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-6 pt-8">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-10 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || grandTotal === 0}
                            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl transition flex items-center gap-3"
                        >
                            {loading ? "Creating..." : "Submit Requisition"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}