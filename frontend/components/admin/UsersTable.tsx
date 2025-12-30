"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type User = {
  id: number;
  username: string;
  email?: string;
  role: string;
  is_active?: boolean;
};

type Props = {
  users: User[];
  onDelete: (id: number) => void;
  onEdit: (user: User) => void;
};

export default function UsersTable({ users, onDelete, onEdit }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg">
        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase text-xs font-semibold">
          <tr>
            <th className="p-3 text-left border-b">ID</th>
            <th className="p-3 text-left border-b">Username</th>
            <th className="p-3 text-left border-b">Email</th>
            <th className="p-3 text-left border-b">Role</th>
            <th className="p-3 text-left border-b">Status</th>
            <th className="p-3 text-left border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <motion.tr
              key={user.id}
              className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                hovered === user.id ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
              onMouseEnter={() => setHovered(user.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <td className="p-3 border-b">{user.id}</td>
              <td className="p-3 border-b font-medium">{user.username}</td>
              <td className="p-3 border-b">{user.email || "-"}</td>
              <td className="p-3 border-b">{user.role}</td>
              <td className="p-3 border-b">
                {user.is_active ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                ) : (
                  <span className="text-red-500 dark:text-red-400 font-medium">Inactive</span>
                )}
              </td>
              <td className="p-3 border-b flex gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(user.id)}
                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm"
                >
                  Delete
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
