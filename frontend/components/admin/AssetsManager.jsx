"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function AssetsManager() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/assets/");
      setAssets(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (data) => {
    await api.post("/assets/", data);
    fetchAssets();
    setAddOpen(false);
  };

  const handleDeleteAsset = async (id) => {
    await api.delete(`/assets/${id}/`);
    fetchAssets();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Asset Name" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Assets Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Add Asset
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={assets} />}

      <ActionModal
        title="Add Asset"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddAsset}
        fields={[
          { name: "name", label: "Asset Name", type: "text" },
          { name: "category", label: "Category", type: "text" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteAsset(deleteId)}
      />
    </div>
  );
}
