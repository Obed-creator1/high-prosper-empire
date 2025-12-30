"use client";
import { useState, useEffect } from "react";

export default function UserModal({ open, onClose, onSaved, initial = null }) {
  const [form, setForm] = useState({ username: "", email: "", role: "collector", password: "", branch: "" });

  useEffect(() => {
    if (initial) setForm({ ...form, ...initial, password: "" });
    else setForm({ username: "", email: "", role: "collector", password: "", branch: "" });
    // eslint-disable-next-line
  }, [initial, open]);

  if (!open) return null;
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    onSaved(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={submit} className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">{initial ? "Edit User" : "Create User"}</h3>
        <input name="username" required value={form.username} onChange={handleChange} placeholder="Username" className="w-full mb-2 p-2 border rounded" />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full mb-2 p-2 border rounded" />
        <select name="role" value={form.role} onChange={handleChange} className="w-full mb-2 p-2 border rounded">
          <option value="admin">Admin</option>
          <option value="collector">Collector</option>
          <option value="hr">HR</option>
          <option value="manager">Manager</option>
          <option value="customer">Customer</option>
        </select>
        <input name="branch" value={form.branch} onChange={handleChange} placeholder="Branch" className="w-full mb-2 p-2 border rounded" />
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder={initial ? "Leave blank to keep current password" : "Password"} className="w-full mb-4 p-2 border rounded" />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">{initial ? "Save" : "Create"}</button>
        </div>
      </form>
    </div>
  );
}
