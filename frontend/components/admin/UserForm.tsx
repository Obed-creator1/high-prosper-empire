import { useState } from "react";

interface User { id?: number; username: string; email: string | null; role: string; }

export default function UserForm({
                                     user,
                                     onSave,
                                     onCancel
                                 }: {
    user?: User | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        username: user?.username || "",
        email: user?.email || "",
        role: user?.role || "collector",
        password: "",
    });

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Username *</label>
                <input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                       className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-transparent transition" />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                       className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                        className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500">
                    {["admin", "ceo", "collector", "hr", "account", "manager", "supervisor", "customer"].map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Password {user ? "(leave blank to keep)" : "*"}
                </label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                       className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500" />
            </div>
            <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={onCancel} className="px-8 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition">
                    Cancel
                </button>
                <button type="submit" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-xl font-bold transition">
                    {user ? "Update User" : "Create User"}
                </button>
            </div>
        </form>
    );
}