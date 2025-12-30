// components/admin/CustomerTable.tsx
import { FiEdit, FiTrash2 } from "react-icons/fi";

interface Customer {
    id: number;
    name: string;
    phone: string | null;
    village: string | null;
    status: string;
}

// Normalize data to always return an array
const normalizeCustomers = (data: any): Customer[] => {
    if (Array.isArray(data)) return data;
    if (data?.results && Array.isArray(data.results)) return data.results;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
};

export default function CustomerTable({
                                          customers: rawCustomers,
                                          onEdit,
                                          onDelete,
                                      }: {
    customers: any;
    onEdit: (c: Customer) => void;
    onDelete: (id: number) => void;
}) {
    const customers = normalizeCustomers(rawCustomers);

    if (!customers || customers.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-xl text-gray-500">No customers found</p>
                <p className="text-sm text-gray-400 mt-2">Start by adding your first customer</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
            <table className="w-full">
                <thead className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <tr>
                    <th className="p-5 text-left font-bold">ID</th>
                    <th className="p-5 text-left font-bold">Name</th>
                    <th className="p-5 text-left font-bold">Phone</th>
                    <th className="p-5 text-left font-bold">Village</th>
                    <th className="p-5 text-left font-bold">Status</th>
                    <th className="p-5 text-left font-bold">Actions</th>
                </tr>
                </thead>
                <tbody>
                {customers.map((c) => (
                    <tr
                        key={c.id}
                        className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <td className="p-5 font-mono">#{c.id}</td>
                        <td className="p-5 font-semibold">{c.name}</td>
                        <td className="p-5">{c.phone || "-"}</td>
                        <td className="p-5">{c.village || "-"}</td>
                        <td className="p-5">
                <span
                    className={`px-4 py-2 rounded-full text-xs font-bold ${
                        c.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                    }`}
                >
                  {c.status}
                </span>
                        </td>
                        <td className="p-5 flex gap-3">
                            <button
                                onClick={() => onEdit(c)}
                                className="text-green-600 hover:bg-green-50 p-3 rounded-xl transition"
                            >
                                <FiEdit className="text-xl" />
                            </button>
                            <button
                                onClick={() => onDelete(c.id)}
                                className="text-red-600 hover:bg-red-50 p-3 rounded-xl transition"
                            >
                                <FiTrash2 className="text-xl" />
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}