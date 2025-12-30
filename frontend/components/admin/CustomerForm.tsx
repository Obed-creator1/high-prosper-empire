import { useState } from "react";

interface Customer {
    id?: number;
    name: string;
    email: string | null;
    phone: string | null;
    village: string | null;
    status: string;
}

export default function CustomerForm({
                                         customer,
                                         onSave,
                                         onCancel
                                     }: {
    customer?: Customer | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || "",
        village: customer?.village || "",
        status: customer?.status || "Active",
        password: "",
    });

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Full Name <span className="text-red-500">*</span>
                </label>
                <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Jean Claude"
                    className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 focus:border-transparent transition shadow-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="jean@example.com"
                        className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 transition shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="0781234567"
                        className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 transition shadow-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Village / Sector
                </label>
                <input
                    value={form.village}
                    onChange={e => setForm({ ...form, village: e.target.value })}
                    placeholder="e.g. Kacyiru, Gasabo"
                    className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 transition shadow-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 transition shadow-sm"
                >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                </select>
            </div>

            {!customer && (
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="password"
                        required={!customer}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="Set login password"
                        className="w-full px-5 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 focus:ring-4 focus:ring-green-500 transition shadow-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">Customer will use this to log in and pay</p>
                </div>
            )}

            {customer && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> Leave password blank to keep current password.
                    </p>
                </div>
            )}

            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-2xl font-bold text-lg transition transform hover:scale-105"
                >
                    {customer ? "Update Customer" : "Create Customer"}
                </button>
            </div>
        </form>
    );
}