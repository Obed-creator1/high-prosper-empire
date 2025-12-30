import { FiEdit, FiTrash2 } from "react-icons/fi";

interface User { id: number; username: string; email: string | null; role: string; }

export default function UserTable({
                                      users,
                                      onEdit,
                                      onDelete
                                  }: {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (id: number) => void;
}) {
    if (users.length === 0) {
        return <p className="text-center py-16 text-gray-500 text-lg">No users found</p>;
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-lg">
            <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <tr>
                    <th className="p-5 text-left font-bold">ID</th>
                    <th className="p-5 text-left font-bold">Username</th>
                    <th className="p-5 text-left font-bold">Email</th>
                    <th className="p-5 text-left font-bold">Role</th>
                    <th className="p-5 text-left font-bold">Actions</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-5 font-mono">#{u.id}</td>
                        <td className="p-5 font-semibold">{u.username}</td>
                        <td className="p-5">{u.email || "-"}</td>
                        <td className="p-5">
                <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                    u.role === "admin" ? "bg-red-100 text-red-800" :
                        u.role === "ceo" ? "bg-purple-100 text-purple-800" :
                            "bg-blue-100 text-blue-800"
                }`}>
                  {u.role.toUpperCase()}
                </span>
                        </td>
                        <td className="p-5 flex gap-3">
                            <button onClick={() => onEdit(u)} className="text-blue-600 hover:bg-blue-50 p-3 rounded-xl transition">
                                <FiEdit className="text-xl" />
                            </button>
                            <button onClick={() => onDelete(u.id)} className="text-red-600 hover:bg-red-50 p-3 rounded-xl transition">
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