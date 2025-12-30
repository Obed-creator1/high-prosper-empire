"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";
import { motion } from "framer-motion";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/admin/users/");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (data) => {
    try {
      await api.post("/users/admin/users/", data);
      fetchUsers();
      setAddOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add user");
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/admin/users/${id}/`);
      fetchUsers();
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Users Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <DataTable columns={columns} data={users} />
      )}

      <ActionModal
        title="Add New User"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddUser}
        fields={[
          { name: "username", label: "Username", type: "text", placeholder: "Enter username" },
          { name: "email", label: "Email", type: "email", placeholder: "Enter email" },
          { name: "role", label: "Role", type: "text", placeholder: "Enter role" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteUser(deleteId)}
      />
    </motion.div>
  );
}
