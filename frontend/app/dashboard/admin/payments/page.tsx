"use client";

import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";

type Invoice = {
    id: number;
    amount: string;
    due_date: string;
    status: string;
    description?: string;
};

type Payment = {
    id: number;
    amount: string;
    status: string;
    method: string;
    created_at: string;
};

type CustomerInfo = {
    name: string;
    phone: string;
    payment_account: string;
    outstanding: string;
    monthly_fee: string;
};

export default function PaymentsPage() {
    const [customer, setCustomer] = useState<CustomerInfo | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("momo");

    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchData();
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [customerRes, invRes, payRes] = await Promise.all([
                api.get("customers/me/"),
                api.get("payments/invoices/"),
                api.get("payments/my-payments/"),
            ]);
            setCustomer(customerRes.data);
            setInvoices(invRes.data);
            setPayments(payRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function initiatePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedInvoice && !amount) return alert("Choose invoice or enter amount");

        try {
            const payload = {
                invoice_id: selectedInvoice,
                amount: amount || undefined,
                method,
            };
            const res = await api.post("payments/initiate/", payload);
            alert("Payment initiation response: " + JSON.stringify(res.data));

            // Start polling this payment if it’s pending
            if (res.data.payment_id) startPolling(res.data.payment_id);

            fetchData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to initiate payment");
        }
    }

    async function confirmPayment(paymentId: number) {
        try {
            const res = await api.post(`payments/confirm/`, { transaction_id: paymentId });
            alert("Confirm response: " + JSON.stringify(res.data));
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to confirm");
        }
    }

    function startPolling(paymentId: number) {
        if (pollingRef.current) clearInterval(pollingRef.current);

        pollingRef.current = setInterval(async () => {
            try {
                const res = await api.post(`payments/confirm/`, { transaction_id: paymentId });
                const updatedPayment: Payment = res.data;

                setPayments((prev) =>
                    prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
                );

                if (updatedPayment.status === "Paid" || updatedPayment.status === "Failed") {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                }
            } catch (err) {
                console.error("Polling error:", err);
                if (pollingRef.current) clearInterval(pollingRef.current);
            }
        }, 5000); // every 5 seconds
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Payments</h1>

            {customer && (
                <section className="mb-6 p-4 border rounded bg-gray-50">
                    <h2 className="text-xl font-semibold mb-2">Customer Info</h2>
                    <p><strong>Name:</strong> {customer.name}</p>
                    <p><strong>Phone:</strong> {customer.phone}</p>
                    <p><strong>Payment Account:</strong> {customer.payment_account}</p>
                    <p><strong>Outstanding:</strong> {customer.outstanding} RWF</p>
                    <p><strong>Monthly Fee:</strong> {customer.monthly_fee} RWF</p>
                </section>
            )}

            <section className="mb-6">
                <h2 className="text-xl">Outstanding Invoices</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="grid gap-2">
                        {invoices.length === 0 && <p>No invoices found.</p>}
                        {invoices.map((inv) => (
                            <div key={inv.id} className="p-3 border rounded flex justify-between items-center">
                                <div>
                                    <div className="font-semibold">Invoice #{inv.id}</div>
                                    <div className="text-sm">Amount: {inv.amount} RWF</div>
                                    <div className="text-sm">Due: {inv.due_date}</div>
                                    <div className="text-sm">Status: {inv.status}</div>
                                    {inv.description && <div className="text-sm">Desc: {inv.description}</div>}
                                </div>
                                <div>
                                    <button
                                        className="px-3 py-1 bg-blue-600 text-white rounded"
                                        onClick={() => {
                                            setSelectedInvoice(inv.id);
                                            setAmount(inv.amount as unknown as string);
                                        }}
                                    >
                                        Pay
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="mb-6">
                <h2 className="text-xl">Initiate Payment</h2>
                <form onSubmit={initiatePayment} className="max-w-md">
                    <label className="block mb-2">Selected Invoice</label>
                    <select
                        value={selectedInvoice ?? ""}
                        onChange={(e) => setSelectedInvoice(Number(e.target.value) || null)}
                        className="w-full mb-3 p-2 border rounded"
                    >
                        <option value="">-- choose invoice (or enter amount) --</option>
                        {invoices.map((i) => (
                            <option key={i.id} value={i.id}>
                                #{i.id} — {i.amount} RWF — {i.status}
                            </option>
                        ))}
                    </select>

                    <label className="block mb-2">Amount (leave empty to use invoice amount)</label>
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 1200.00"
                        className="w-full mb-3 p-2 border rounded"
                    />

                    <label className="block mb-2">Method</label>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full mb-3 p-2 border rounded">
                        <option value="momo">Mobile Money (MoMo)</option>
                        <option value="irembo">Irembo Pay</option>
                    </select>

                    <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Initiate Payment</button>
                        <button type="button" onClick={() => { setSelectedInvoice(null); setAmount(""); }} className="px-4 py-2 border rounded">Clear</button>
                    </div>
                </form>
            </section>

            <section>
                <h2 className="text-xl">Recent Payments</h2>
                <div className="grid gap-2">
                    {payments.length === 0 && <p>No payments yet.</p>}
                    {payments.map((p) => (
                        <div key={p.id} className="p-3 border rounded flex justify-between items-center">
                            <div>
                                <div className="font-semibold">Payment #{p.id}</div>
                                <div className="text-sm">Amount: {p.amount} RWF</div>
                                <div className="text-sm">Status: {p.status}</div>
                                <div className="text-sm">Method: {p.method}</div>
                            </div>
                            <div className="flex gap-2">
                                {p.status !== "Paid" && (
                                    <button onClick={() => confirmPayment(p.id)} className="px-3 py-1 bg-indigo-600 text-white rounded">Confirm</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
