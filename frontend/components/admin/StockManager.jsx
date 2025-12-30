"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function StockManager() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await api.get("/stock/");
      setStock(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (data) => {
    await api.post("/stock/", data);
    fetchStock();
    setAddOpen(false);
  };

  const handleDeleteStock = async (id) => {
    await api.delete(`/stock/${id}/`);
    fetchStock();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "item", label: "Item Name" },
    { key: "quantity", label: "Quantity" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Stock Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Add Stock
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={stock} />}

      <ActionModal
        title="Add Stock Item"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddStock}
        fields={[
          { name: "item", label: "Item Name", type: "text" },
          { name: "quantity", label: "Quantity", type: "number" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteStock(deleteId)}
      />
    </div>
  );
}
