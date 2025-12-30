"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function PaymentsManager() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payments/");
      setPayments(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (data) => {
    await api.post("/payments/", data);
    fetchPayments();
    setAddOpen(false);
  };

  const handleDeletePayment = async (id) => {
    await api.delete(`/payments/${id}/`);
    fetchPayments();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "customer", label: "Customer" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Payments Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Payment
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={payments} />}

      <ActionModal
        title="Add Payment"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddPayment}
        fields={[
          { name: "customer", label: "Customer", type: "text" },
          { name: "amount", label: "Amount", type: "number" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeletePayment(deleteId)}
      />
    </div>
  );
}
