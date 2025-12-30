"use client";

import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";

type Customer = {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    contract_no?: string;
    contract_file?: string;
    monthly_fee: string;
    outstanding: string;
    status: string;
    payment_account?: string;
    village_name?: string;
    collector_name?: string;
    user_username?: string;
};

type Invoice = { id: number; amount: string; due_date: string; status: string; file?: string };
type Payment = { id: number; amount: string; status: string; method: string; created_at: string };
type Order = { id: number; description: string; amount: string; status: string; created_at: string };
type Complaint = { id: number; title: string; description?: string; status: string; priority: string };
type ChatMessage = {
    id: number;
    sender: number;
    sender_name: string;
    receiver: number;
    receiver_name: string;
    message: string;
    timestamp: string;
};

export default function CustomerPage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("momo");

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const chatBoxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
        fetchChatMessages();
        const interval = setInterval(fetchChatMessages, 5000); // poll every 5 sec
        return () => clearInterval(interval);
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [custRes, invRes, payRes, orderRes, compRes] = await Promise.all([
                api.get("customers/me/"),
                api.get("customers/invoices/"),
                api.get("customers/payments/"),
                api.get("customers/orders/"),
                api.get("customers/complaints/"),
            ]);
            setCustomer(custRes.data);
            setInvoices(invRes.data);
            setPayments(payRes.data);
            setOrders(orderRes.data);
            setComplaints(compRes.data);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch customer data");
        } finally {
            setLoading(false);
        }
    }

    async function initiatePayment(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedInvoice && !amount) return alert("Select invoice or enter amount");
        try {
            const payload = { invoice_id: selectedInvoice, amount: amount || undefined, method };
            const res = await api.post("payments/initiate/", payload);
            alert("Payment initiation response: " + JSON.stringify(res.data));
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to initiate payment");
        }
    }

    // -------------------- CHAT --------------------
    async function fetchChatMessages() {
        try {
            // assume admin has id=1 for demo
            const res = await api.get("users/messages/", { params: { recipient: 1 } });
            setMessages(res.data);
            // scroll to bottom
            if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        } catch (err) {
            console.error(err);
        }
    }

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!chatInput.trim()) return;
        try {
            await api.post("users/messages/", { receiver_id: 1, message: chatInput });
            setChatInput("");
            fetchChatMessages();
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Customer Dashboard</h1>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <>
                    {/* PROFILE */}
                    {customer && (
                        <section className="mb-6 p-4 border rounded">
                            <h2 className="text-xl font-semibold mb-2">Profile</h2>
                            <p><strong>Name:</strong> {customer.name}</p>
                            <p><strong>Username:</strong> {customer.user_username}</p>
                            <p><strong>Phone:</strong> {customer.phone || "-"}</p>
                            <p><strong>Email:</strong> {customer.email || "-"}</p>
                            <p><strong>Payment Account:</strong> {customer.payment_account || "-"}</p>
                            <p><strong>Monthly Fee:</strong> {customer.monthly_fee} RWF</p>
                            <p><strong>Outstanding:</strong> {customer.outstanding} RWF</p>
                            <p><strong>Status:</strong> {customer.status}</p>
                            <p><strong>Village:</strong> {customer.village_name}</p>
                            <p><strong>Collector:</strong> {customer.collector_name || "-"}</p>
                            <p><strong>Contract No:</strong> {customer.contract_no || "-"}</p>
                            {customer.contract_file && (
                                <p>
                                    <a href={customer.contract_file} target="_blank" className="text-blue-600 underline">
                                        View Contract File
                                    </a>
                                </p>
                            )}
                        </section>
                    )}

                    {/* INVOICES */}
                    <section className="mb-6">
                        <h2 className="text-xl font-semibold mb-2">Invoices</h2>
                        {invoices.length === 0 && <p>No invoices found.</p>}
                        {invoices.map((inv) => (
                            <div key={inv.id} className="p-3 border rounded flex justify-between items-center mb-2">
                                <div>
                                    <p>Invoice #{inv.id}</p>
                                    <p>Amount: {inv.amount} RWF</p>
                                    <p>Status: {inv.status}</p>
                                    <p>Due: {inv.due_date}</p>
                                    {inv.file && (
                                        <a href={inv.file} target="_blank" className="text-blue-600 underline">
                                            View Invoice
                                        </a>
                                    )}
                                </div>
                                <button
                                    className="px-3 py-1 bg-green-600 text-white rounded"
                                    onClick={() => { setSelectedInvoice(inv.id); setAmount(inv.amount as unknown as string); }}
                                >
                                    Pay
                                </button>
                            </div>
                        ))}
                    </section>

                    {/* PAYMENT INITIATION */}
                    <section className="mb-6 p-4 border rounded">
                        <h2 className="text-xl font-semibold mb-2">Initiate Payment</h2>
                        <form onSubmit={initiatePayment}>
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

                            <label className="block mb-2">Amount</label>
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

                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Initiate Payment</button>
                        </form>
                    </section>

                    {/* CHAT */}
                    <section className="mb-6 p-4 border rounded">
                        <h2 className="text-xl font-semibold mb-2">Contact Admin / Support</h2>
                        <div
                            ref={chatBoxRef}
                            className="border p-3 mb-2 h-64 overflow-y-scroll bg-gray-50"
                        >
                            {messages.map((m) => (
                                <div key={m.id} className={`mb-2 ${m.sender_name === customer?.user_username ? "text-right" : "text-left"}`}>
                                    <span className="block font-semibold">{m.sender_name}</span>
                                    <span>{m.message}</span>
                                    <span className="block text-xs text-gray-400">{new Date(m.timestamp).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 p-2 border rounded"
                            />
                            <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Send</button>
                        </form>
                    </section>
                </>
            )}
        </div>
    );
}
