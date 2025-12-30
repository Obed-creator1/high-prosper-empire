// frontend/app/dashboard/admin/procurement/rfq/create-from-pr/[prId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";

export default function CreateRFQFromPR() {
    const { prId } = useParams();
    const router = useRouter();
    const [pr, setPr] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        api.get(`/pr/${prId}/`).then(res => {
            setPr(res.data);
            setLoading(false);
        }).catch(() => {
            toast.error("PR not found");
            router.push("/dashboard/admin/procurement");
        });
    }, [prId]);

    const handleCreateRFQ = async () => {
        setCreating(true);
        try {
            const res = await api.post(`/pr/${prId}/create_rfq/`);
            toast.success(`RFQ ${res.data.rfq_number} created! Sent to ${res.data.suppliers_selected.length} suppliers`);
            router.push("/dashboard/admin/procurement");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to create RFQ");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading PR...</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create RFQ from PR</h1>
                    <p className="text-gray-600 mb-8">
                        Convert <span className="font-mono text-blue-600">{pr.pr_number}</span> into a Request for Quotation
                    </p>

                    <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-6">
                            <h2 className="text-xl font-semibold">{pr.title}</h2>
                            <p className="text-gray-600 mt-2">Department: {pr.department || "N/A"} • Required by: {pr.required_by_date}</p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="font-semibold mb-4">Items to Quote ({pr.items.length})</h3>
                            <ul className="space-y-3">
                                {pr.items.map((item: any, i: number) => (
                                    <li key={i} className="flex justify-between">
                                        <span>{item.description || item.item?.name}</span>
                                        <span className="text-gray-600">Qty: {item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <h3 className="font-semibold text-green-800 mb-2">AI Supplier Selection</h3>
                            <p className="text-green-700">
                                ProsperBot will automatically select the top 5 high-performing suppliers based on:
                            </p>
                            <ul className="mt-3 space-y-1 text-green-700">
                                <li>• Performance Score (Delivery + Quality)</li>
                                <li>• Past experience with item categories</li>
                                <li>• Current approval status</li>
                            </ul>
                        </div>

                        <div className="flex justify-end space-x-4 pt-6 border-t">
                            <button
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRFQ}
                                disabled={creating || pr.status !== 'approved'}
                                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-3"
                            >
                                {creating ? "Creating RFQ..." : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Create RFQ & Send to Suppliers
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}