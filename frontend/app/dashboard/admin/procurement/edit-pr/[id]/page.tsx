// frontend/app/dashboard/admin/procurement/edit-pr/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {PDFDownloadLink, PDFViewer} from "@react-pdf/renderer";
import PRDocument from "@/components/pdf/PRDocument";

interface Item {
    id: number;
    sku: string;
    name: string;
    selling_price: string;
    unit_of_measure: string;
}

interface LineItem {
    id?: number;
    item: Item | null;
    description: string;
    quantity: string;
    unit_price_estimated: string;
    total_estimated: number;
}

interface PRData {
    id: number;
    pr_number: string;
    title: string;
    department: string;
    required_by_date: string;
    notes: string;
    status: string;
    items: LineItem[];
}

function PDFExportButton({ pr }: { pr: any }) {
    return (
        <PDFDownloadLink
            document={<PRDocument pr={pr} companyName="High Prosper Ltd" logoUrl="/logo.png" />}
            fileName={`PR-${pr.pr_number}.pdf`}
        >
            {({ loading }) => (
                <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                    {loading ? "Preparing PDF..." : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </>
                    )}
                </button>
            )}
        </PDFDownloadLink>
    );
}

export default function EditPRPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [itemsCatalog, setItemsCatalog] = useState<Item[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showDropdown, setShowDropdown] = useState<number | null>(null);
    const [showPDF, setShowPDF] = useState(false);

    const [form, setForm] = useState({
        title: "",
        department: "",
        required_by_date: "",
        notes: "",
    });

    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Fetch PR + Items Catalog
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prRes, itemsRes] = await Promise.all([
                    api.get(`/pr/${id}/`),
                    api.get("/items/?limit=500"),
                ]);

                const pr: PRData = prRes.data;
                setForm({
                    title: pr.title,
                    department: pr.department || "",
                    required_by_date: pr.required_by_date,
                    notes: pr.notes || "",
                });

                setLineItems(
                    pr.items.map((item: any) => ({
                        id: item.id,
                        item: item.item
                            ? {
                                id: item.item.id,
                                sku: item.item.sku,
                                name: item.item.name,
                                selling_price: item.unit_price_estimated.toString(),
                                unit_of_measure: item.item.unit_of_measure,
                            }
                            : null,
                        description: item.description,
                        quantity: item.quantity.toString(),
                        unit_price_estimated: item.unit_price_estimated.toString(),
                        total_estimated: item.quantity * item.unit_price_estimated,
                    }))
                );

                setItemsCatalog(itemsRes.data.results || itemsRes.data);
            } catch (err: any) {
                toast.error("Failed to load PR");
                router.push("/dashboard/admin/procurement");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, router]);

    // Filter items
    const filteredItems = itemsCatalog.filter(
        (i) =>
            i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const updateLine = (index: number, field: keyof LineItem, value: any) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "item" && value) {
            updated[index].description = value.name;
            updated[index].unit_price_estimated = value.selling_price || "0";
        }

        const qty = parseFloat(updated[index].quantity) || 0;
        const price = parseFloat(updated[index].unit_price_estimated) || 0;
        updated[index].total_estimated = qty * price;

        setLineItems(updated);
    };

    const addLine = () => {
        setLineItems([
            ...lineItems,
            {
                item: null,
                description: "",
                quantity: "1",
                unit_price_estimated: "0",
                total_estimated: 0,
            },
        ]);
    };

    const removeLine = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const grandTotal = lineItems.reduce((sum, line) => sum + line.total_estimated, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lineItems.some(l => !l.item)) {
            toast.error("All items must be selected");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: form.title,
                department: form.department,
                required_by_date: form.required_by_date,
                notes: form.notes,
                items: lineItems.map(l => ({
                    id: l.id,
                    item: l.item?.id,
                    description: l.description,
                    quantity: parseFloat(l.quantity),
                    unit_price_estimated: parseFloat(l.unit_price_estimated),
                })),
            };

            await api.patch(`/pr/${id}/`, payload);
            toast.success("PR updated successfully!");
            router.push("/dashboard/admin/procurement");
        } catch (err: any) {
            toast.error("Failed to update PR");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Purchase Requisition</h1>
                        <p className="text-gray-600 mt-1">PR Number: <span className="font-mono text-blue-600">PR-20251211-0001</span></p>
                    </div>
                    <Link
                        href="/dashboard/admin/procurement"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Back to List
                    </Link>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">PR-{pr.pr_number}</h1>
                    <PDFExportButton pr={pr} />
                </div>
                {showPDF && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg w-full max-w-4xl h-5/6">
                            <div className="p-4 border-b flex justify-between">
                                <h3 className="text-lg font-semibold">PR-{pr.pr_number} Preview</h3>
                                <button onClick={() => setShowPDF(false)} className="text-gray-500 hover:text-gray-700">×</button>
                            </div>
                            <PDFViewer width="100%" height="100%">
                                <PRDocument pr={pr} />
                            </PDFViewer>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Header */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-6">Requisition Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                <input
                                    type="text"
                                    value={form.department}
                                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Required By</label>
                                <input
                                    type="date"
                                    value={form.required_by_date}
                                    onChange={(e) => setForm({ ...form, required_by_date: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    rows={3}
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50">
                            <h2 className="text-xl font-semibold">Line Items</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {lineItems.map((line, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 relative">
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onFocus={() => setShowDropdown(index)}
                                                placeholder="Search item..."
                                                className="w-full px-3 py-2 border rounded text-sm"
                                            />
                                            {showDropdown === index && filteredItems.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                                    {filteredItems.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={() => {
                                                                updateLine(index, "item", item);
                                                                setSearchTerm("");
                                                                setShowDropdown(null);
                                                            }}
                                                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                                                        >
                                                            <div className="font-medium">{item.sku} - {item.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                ${item.selling_price} / {item.unit_of_measure}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {line.item && (
                                                <div className="mt-1 text-xs text-gray-600">
                                                    Selected: {line.item.sku} - {line.item.name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="text"
                                                value={line.description}
                                                onChange={(e) => updateLine(index, "description", e.target.value)}
                                                className="w-full px-3 py-2 border rounded text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                step="0.001"
                                                value={line.quantity}
                                                onChange={(e) => updateLine(index, "quantity", e.target.value)}
                                                className="w-24 px-3 py-2 border rounded text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={line.unit_price_estimated}
                                                onChange={(e) => updateLine(index, "unit_price_estimated", e.target.value)}
                                                className="w-32 px-3 py-2 border rounded text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            ${line.total_estimated.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => removeLine(index)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 border-t flex justify-between items-center bg-gray-50">
                            <button
                                type="button"
                                onClick={addLine}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Add Item
                            </button>
                            <div className="text-xl font-bold text-blue-600">
                                Total: ${grandTotal.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4">
                        <Link
                            href="/dashboard/admin/procurement"
                            className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Update Requisition"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}