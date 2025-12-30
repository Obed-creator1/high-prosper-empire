"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function AccountingManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/accounting/records/");
      setRecords(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (data) => {
    await api.post("/accounting/records/", data);
    fetchRecords();
    setAddOpen(false);
  };

  const handleDeleteRecord = async (id) => {
    await api.delete(`/accounting/records/${id}/`);
    fetchRecords();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount" },
    { key: "type", label: "Type" },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Accounting Records</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Record
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={records} />}

      <ActionModal
        title="Add Accounting Record"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddRecord}
        fields={[
          { name: "description", label: "Description", type: "text" },
          { name: "amount", label: "Amount", type: "number" },
          { name: "type", label: "Type", type: "text" },
          { name: "date", label: "Date", type: "date" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteRecord(deleteId)}
      />
    </div>
  );
}
