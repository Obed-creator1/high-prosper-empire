"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";
import { motion } from "framer-motion";

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers/");
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (data) => {
    try {
      await api.post("/customers/", data);
      fetchCustomers();
      setAddOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id) => {
    try {
      await api.delete(`/customers/${id}/`);
      fetchCustomers();
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Customers</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Customer
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={customers} />}

      <ActionModal
        title="Add Customer"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddCustomer}
        fields={[
          { name: "name", label: "Name", type: "text", placeholder: "Enter customer name" },
          { name: "email", label: "Email", type: "email", placeholder: "Enter email" },
          { name: "phone", label: "Phone", type: "text", placeholder: "Enter phone" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteCustomer(deleteId)}
      />
    </motion.div>
  );
}
