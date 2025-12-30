"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import api from "../../../lib/axios";

type Invoice = { id: number; customer: string; amount: number; status: string };

export default function Invoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return router.push("/");

    fetchInvoices(token);
  }, []);

  const fetchInvoices = async (token: string) => {
    try {
      const res = await api.get("/invoices/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!Cookies.get("token")) return null;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Invoices</h1>
      {loading && <p>Loading invoices...</p>}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">Invoice ID</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className="p-2 border">{inv.id}</td>
                <td className="p-2 border">{inv.customer}</td>
                <td className="p-2 border">{inv.amount}</td>
                <td className="p-2 border">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
