"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function HRManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr/employees/");
      setEmployees(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (data) => {
    await api.post("/hr/employees/", data);
    fetchEmployees();
    setAddOpen(false);
  };

  const handleDeleteEmployee = async (id) => {
    await api.delete(`/hr/employees/${id}/`);
    fetchEmployees();
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
        <h2 className="text-xl font-bold">HR Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Add Employee
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={employees} />}

      <ActionModal
        title="Add Employee"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddEmployee}
        fields={[
          { name: "name", label: "Name", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "role", label: "Role", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteEmployee(deleteId)}
      />
    </div>
  );
}
