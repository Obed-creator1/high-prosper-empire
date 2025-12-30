"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import DeleteConfirm from "./DeleteConfirm";

export default function ComplaintsManager() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get("/complaints/");
      setComplaints(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComplaint = async (id) => {
    await api.delete(`/complaints/${id}/`);
    fetchComplaints();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "user", label: "User" },
    { key: "subject", label: "Subject" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Date" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Complaints Management</h2>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={complaints} />}

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteComplaint(deleteId)}
      />
    </div>
  );
}
