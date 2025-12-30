"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get("/staff/");
      setStaff(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (data) => {
    await api.post("/staff/", data);
    fetchStaff();
    setAddOpen(false);
  };

  const handleDeleteStaff = async (id) => {
    await api.delete(`/staff/${id}/`);
    fetchStaff();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Staff Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Add Staff
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={staff} />}

      <ActionModal
        title="Add Staff"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddStaff}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "role", label: "Role", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteStaff(deleteId)}
      />
    </div>
  );
}
