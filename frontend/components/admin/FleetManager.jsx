"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";
import { motion } from "framer-motion";

export default function FleetManager() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchFleet();
  }, []);

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fleet/");
      setFleet(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFleet = async (data) => {
    await api.post("/fleet/", data);
    fetchFleet();
    setAddOpen(false);
  };

  const handleDeleteFleet = async (id) => {
    await api.delete(`/fleet/${id}/`);
    fetchFleet();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "vehicle_name", label: "Vehicle" },
    { key: "plate_number", label: "Plate Number" },
    { key: "status", label: "Status" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fleet Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Vehicle
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={fleet} />}

      <ActionModal
        title="Add Vehicle"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddFleet}
        fields={[
          { name: "vehicle_name", label: "Vehicle Name", type: "text" },
          { name: "plate_number", label: "Plate Number", type: "text" },
          { name: "status", label: "Status", type: "text" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteFleet(deleteId)}
      />
    </motion.div>
  );
}
