"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function InvoicesManager() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/invoices/");
      setInvoices(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvoice = async (data) => {
    await api.post("/invoices/", data);
    fetchInvoices();
    setAddOpen(false);
  };

  const handleDeleteInvoice = async (id) => {
    await api.delete(`/invoices/${id}/`);
    fetchInvoices();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "customer", label: "Customer" },
    { key: "total", label: "Total" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Invoices Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Invoice
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={invoices} />}

      <ActionModal
        title="Add Invoice"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddInvoice}
        fields={[
          { name: "customer", label: "Customer", type: "text" },
          { name: "total", label: "Total", type: "number" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteInvoice(deleteId)}
      />
    </div>
  );
}
