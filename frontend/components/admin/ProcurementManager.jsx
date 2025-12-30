"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function ProcurementManager() {
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchProcurements();
  }, []);

  const fetchProcurements = async () => {
    try {
      setLoading(true);
      const res = await api.get("/procurements/");
      setProcurements(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcurement = async (data) => {
    await api.post("/procurements/", data);
    fetchProcurements();
    setAddOpen(false);
  };

  const handleDeleteProcurement = async (id) => {
    await api.delete(`/procurements/${id}/`);
    fetchProcurements();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "item", label: "Item" },
    { key: "supplier", label: "Supplier" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Procurement Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Add Procurement
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={procurements} />}

      <ActionModal
        title="Add Procurement"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddProcurement}
        fields={[
          { name: "item", label: "Item", type: "text" },
          { name: "supplier", label: "Supplier", type: "text" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteProcurement(deleteId)}
      />
    </div>
  );
}
