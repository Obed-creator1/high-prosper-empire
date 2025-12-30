// frontend/app/dashboard/admin/procurement/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";

import PRDocument from "@/components/pdf/PRDocument";
import POExportButton from "@/components/POExportButton";
import ContractDocument from "@/components/pdf/ContractDocument";

// Types
interface Item {
    id: number;
    sku: string;
    name: string;
    item_type: "product" | "service";
    unit_of_measure: string;
    selling_price: string;
    track_inventory: boolean;
}

interface PR {
    id: number;
    pr_number: string;
    title: string;
    status: string;
    total_estimated_amount: string;
    requester_name: string;
    created_at: string;
}

interface PO {
    id: number;
    po_number: string;
    supplier_name: string;
    supplier: { performance_score: number; performance_grade: string };
    status: string;
    grand_total: string;
    currency: string;
    order_date: string;
}

interface Supplier {
    id: number;
    name: string;
    performance_score: number;
    performance_grade: string;
    kyc_status: string;
}

interface Invoice {
    id: number;
    blockchain_verified: boolean;
}

export default function ProcurementAdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"pr" | "po" | "items">("pr");
    const [prs, setPrs] = useState<PR[]>([]);
    const [pos, setPos] = useState<PO[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);

    // PDF Preview State
    const [selectedPR, setSelectedPR] = useState<PR | null>(null);
    const [showPDF, setShowPDF] = useState(false);

    // AI Suggestion State (for create-pr page, but preview here)
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [prRes, poRes, itemRes, supplierRes] = await Promise.all([
                api.get("procurement/pr/"),
                api.get("procurement/po/"),
                api.get("procurement/items/?limit=200"),
                api.get("procurement/suppliers/?limit=100"),
            ]);

            setPrs(prRes.data.results || prRes.data);
            setPos(poRes.data.results || poRes.data);
            setItems(itemRes.data.results || itemRes.data);
            setSuppliers(supplierRes.data.results || supplierRes.data);
        } catch (err: any) {
            toast.error("Failed to load procurement data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // PR Actions
    const handlePRActions = async (id: number, action: "approve" | "reject") => {
        try {
            await api.post(`procurement/pr/${id}/${action}/`);
            toast.success(`PR ${action}d successfully`);
            fetchData();
        } catch {
            toast.error("Action failed");
        }
    };

    // AI Winner Selection (example — attach to RFQ later)
    const autoSelectWinner = async (rfqId: number) => {
        try {
            const res = await api.post(`procurement/rfq/${rfqId}/select_winner/`);
            toast.success(`Winner selected: ${res.data.winner.supplier.name} | PO ${res.data.po.po_number} created!`);
            fetchData();
        } catch {
            toast.error("No quotations or failed");
        }
    };

    // Voice PR
    const handleVoicePR = () => {
        if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            toast.error("Voice recognition not supported in your browser");
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            try {
                const result = await api.post("/procurement/ai-agent/", {
                    input: transcript,
                    source: "voice"
                });
                toast.success(result.data.message || "PR created by voice!");
                router.push("/dashboard/admin/procurement");
            } catch {
                toast.error("Voice PR creation failed");
            }
        };

        recognition.onerror = () => {
            toast.error("Voice recognition error");
        };

        recognition.start();
    };

    // Send PO
    const sendPOToSupplier = async (poId: number) => {
        if (!confirm("Send this PO to supplier via email and WhatsApp?")) return;
        try {
            await api.post(`procurement/po/${poId}/send_to_supplier/`);
            toast.success("PO sent successfully!");
            fetchData();
        } catch {
            toast.error("Failed to send PO");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Procurement Admin</h1>
                        <p className="text-gray-600 mt-2">Autonomous AI-powered procurement management</p>
                    </div>

                    {/* ProsperBot Panel */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-2xl max-w-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold">ProsperBot AI Agent</h3>
                                <p className="opacity-90 text-sm">Your Autonomous Procurement Director</p>
                                <p className="text-sm mt-2">
                                    Status: <span className="font-bold">ACTIVE</span> • {prs.length} PRs this month
                                </p>
                            </div>
                            <div className="text-6xl">🧠</div>
                        </div>
                        <div className="mt-4 text-xs opacity-80">
                            Listening on: Email • WhatsApp • Voice • Dashboard
                        </div>
                        <button
                            onClick={handleVoicePR}
                            className="mt-4 w-full bg-white text-purple-600 py-3 rounded-lg font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            Create PR with Voice
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-300 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        {[
                            { key: "pr", label: "Purchase Requisitions", count: prs.length },
                            { key: "po", label: "Purchase Orders", count: pos.length },
                            { key: "items", label: "Items & Services", count: items.length },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`py-3 px-1 border-b-2 font-medium text-lg flex items-center gap-3 ${
                                    activeTab === tab.key
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {tab.label}
                                <span className="bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-full font-medium">
                  {tab.count}
                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Create Button */}
                <div className="mb-10">
                    <button
                        onClick={() => router.push("/dashboard/admin/procurement/create-pr")}
                        className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 shadow-lg transition flex items-center gap-4"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Requisition
                    </button>
                </div>

                {/* PR Tab */}
                {activeTab === "pr" && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">PR Number</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Title</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Requester</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {prs.map((pr) => (
                                <tr key={pr.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-mono text-sm text-blue-600 font-semibold">{pr.pr_number}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">{pr.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{pr.requester_name}</td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        ${parseFloat(pr.total_estimated_amount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          pr.status === "approved" ? "bg-green-100 text-green-800" :
                              pr.status === "submitted" ? "bg-yellow-100 text-yellow-800" :
                                  pr.status === "rejected" ? "bg-red-100 text-red-800" :
                                      "bg-gray-100 text-gray-800"
                      }`}>
                        {pr.status.toUpperCase()}
                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {pr.status === "submitted" && (
                                                <>
                                                    <button onClick={() => handlePRActions(pr.id, "approve")} className="text-green-600 hover:text-green-800 font-medium">
                                                        Approve
                                                    </button>
                                                    <span className="text-gray-400">|</span>
                                                    <button onClick={() => handlePRActions(pr.id, "reject")} className="text-red-600 hover:text-red-800 font-medium">
                                                        Reject
                                                    </button>
                                                    <span className="text-gray-400">|</span>
                                                </>
                                            )}
                                            {pr.status === "approved" && (
                                                <button
                                                    onClick={() => router.push(`/dashboard/admin/procurement/rfq/create-from-pr/${pr.id}`)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Create RFQ →
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedPR(pr);
                                                    setShowPDF(true);
                                                }}
                                                className="text-gray-600 hover:text-gray-900 text-sm"
                                            >
                                                👁 Preview PDF
                                            </button>
                                            <PDFDownloadLink
                                                document={<PRDocument pr={pr} companyName="High Prosper Ltd" logoUrl="/logo.png" />}
                                                fileName={`PR-${pr.pr_number}.pdf`}
                                            >
                                                {({ loading }) => (
                                                    <button className="text-gray-600 hover:text-gray-900 text-sm">
                                                        {loading ? "Preparing..." : "📄 Download"}
                                                    </button>
                                                )}
                                            </PDFDownloadLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PO Tab */}
                {activeTab === "po" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pos.map((po) => {
                            const supplier = suppliers.find(s => s.name === po.supplier_name) || { performance_score: 0, performance_grade: "N/A", kyc_status: "pending" };
                            return (
                                <div key={po.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-blue-600">{po.po_number}</h3>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                            po.status.includes("received") ? "bg-green-100 text-green-800" :
                                                po.status === "sent" ? "bg-blue-100 text-blue-800" :
                                                    "bg-gray-100 text-gray-800"
                                        }`}>
                      {po.status.toUpperCase()}
                    </span>
                                    </div>
                                    <p className="text-lg font-medium text-gray-800">{po.supplier_name}</p>

                                    {/* Supplier Performance & KYC */}
                                    <div className="mt-3 flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-green-600">{supplier.performance_score}</span>
                                            <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
                                                supplier.performance_score >= 90 ? 'bg-green-600' :
                                                    supplier.performance_score >= 70 ? 'bg-yellow-500' :
                                                        'bg-red-600'
                                            }`}>
                        {supplier.performance_grade}
                      </span>
                                        </div>
                                        {supplier.kyc_status === 'verified' ? (
                                            <span className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        KYC Verified
                      </span>
                                        ) : (
                                            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs">KYC Pending</span>
                                        )}
                                    </div>

                                    <p className="text-3xl font-bold text-gray-900 mt-4">
                                        {po.currency} {parseFloat(po.grand_total).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Ordered: {format(new Date(po.order_date), "dd MMM yyyy")}
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        <POExportButton po={po} />
                                        <PDFDownloadLink
                                            document={<ContractDocument po={po} company={{ name: "High Prosper Ltd" }} />}
                                            fileName={`Contract-${po.po_number}.pdf`}
                                        >
                                            <button className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-medium">
                                                Generate Contract PDF
                                            </button>
                                        </PDFDownloadLink>
                                        {po.status === "draft" && (
                                            <button
                                                onClick={() => sendPOToSupplier(po.id)}
                                                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
                                            >
                                                Send to Supplier
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Items Tab */}
                {activeTab === "items" && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="px-6 py-5 border-b">
                            <h3 className="text-xl font-bold">Item & Service Catalog</h3>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">SKU</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">UoM</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Price</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Inventory</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-mono text-sm font-semibold">{item.sku}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                          item.item_type === "service" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.item_type.toUpperCase()}
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{item.unit_of_measure}</td>
                                    <td className="px-6 py-4 text-sm font-medium">${parseFloat(item.selling_price).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        {item.track_inventory ? "Tracked" : "—"}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* PDF Preview Modal */}
                {showPDF && selectedPR && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-5xl h-5/6 flex flex-col shadow-2xl">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h3 className="text-2xl font-bold">PR-{selectedPR.pr_number} Preview</h3>
                                <button
                                    onClick={() => {
                                        setShowPDF(false);
                                        setSelectedPR(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 text-3xl"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <PDFViewer width="100%" height="100%">
                                    <PRDocument pr={selectedPR} companyName="High Prosper Ltd" logoUrl="/logo.png" />
                                </PDFViewer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}