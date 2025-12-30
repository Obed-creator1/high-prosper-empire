"use client";

import { useState, useEffect } from "react";
import api from "../../lib/api";
import DataTable from "./DataTable";
import ActionModal from "./ActionModal";
import DeleteConfirm from "./DeleteConfirm";

export default function TasksManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tasks/");
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (data) => {
    await api.post("/tasks/", data);
    fetchTasks();
    setAddOpen(false);
  };

  const handleDeleteTask = async (id) => {
    await api.delete(`/tasks/${id}/`);
    fetchTasks();
    setDeleteOpen(false);
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "assigned_to", label: "Assigned To" },
    { key: "status", label: "Status" },
    { key: "due_date", label: "Due Date" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Task Management</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Task
        </button>
      </div>

      {loading ? <p>Loading...</p> : <DataTable columns={columns} data={tasks} />}

      <ActionModal
        title="Add Task"
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddTask}
        fields={[
          { name: "title", label: "Title", type: "text" },
          { name: "assigned_to", label: "Assigned To", type: "text" },
          { name: "status", label: "Status", type: "text" },
          { name: "due_date", label: "Due Date", type: "date" },
        ]}
      />

      <DeleteConfirm
        isOpen={isDeleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => handleDeleteTask(deleteId)}
      />
    </div>
  );
}
