"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
} from "@heroicons/react/24/solid";
import toast from "react-hot-toast";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
    const [modalUser, setModalUser] = useState<Partial<User & { password?: string }> | null>(null);

    const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const token = Cookies.get("token");

  // ---------------- FETCH USERS ----------------
  const fetchUsers = async () => {
    if (!token) {
      setError("No authentication token found. Please log in again.");
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("users/admin/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (err: any) {
      console.error("❌ Error fetching users:", err);
      setError("Failed to load users. Check API or server connection.");
      toast.error("Failed to fetch users!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ---------------- SEARCH & FILTER ----------------
  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterRole) filtered = filtered.filter((u) => u.role === filterRole);
    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, filterRole, users]);

  // ---------------- PAGINATION ----------------
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // ---------------- DELETE USER ----------------
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`users/admin/users/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setUsers(users.filter((u) => u.id !== id));
      toast.success("User deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user!");
    }
  };

  // ---------------- OPEN MODAL ----------------
  const openModal = (user?: User) => {
    if (user) {
      setModalUser({ ...user });
      setShowPassword(false);
    } else {
      setModalUser({ username: "", email: "", role: "collector", password: "" });
      setShowPassword(true);
    }
    setModalOpen(true);
  };

  // ---------------- AUTO-GENERATE PASSWORD ----------------
  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setModalUser({ ...modalUser, password: pass });
    toast.success(`Generated password: ${pass}`);
  };

  // ---------------- SUBMIT MODAL ----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUser) return;

    try {
      if (modalUser.id) {
        // UPDATE
        await api.put(`users/admin/users/${modalUser.id}/`, modalUser, {
          headers: { Authorization: `Token ${token}` },
        });
        toast.success("User updated!");
      } else {
        // CREATE
        if (!modalUser.password) generatePassword();
        const res = await api.post("users/admin/users/", modalUser, {
          headers: { Authorization: `Token ${token}` },
        });
        setUsers([res.data, ...users]);
        toast.success(`User created! Password: ${modalUser.password}`);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save user!");
    }
  };

  // ---------------- EXPORT CSV ----------------
  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,Username,Email,Role"]
        .concat(users.map((u) => `${u.id},${u.username},${u.email},${u.role}`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "users.csv";
    link.click();
  };

  // ---------------- EXPORT PDF ----------------
  const handleExportPDF = async () => {
    try {
      const res = await api.get("users/admin/users/export_pdf/", {
        headers: { Authorization: `Token ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users.pdf");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF!");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <button
          onClick={() => router.push("/dashboard/admin")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            User Management
          </h1>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <PlusIcon className="w-5 h-5" /> Add User
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="w-5 h-5" /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <DocumentIcon className="w-5 h-5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by username or email..."
          className="flex-1 border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="ceo">CEO</option>
          <option value="hr">HR</option>
          <option value="account">Accounting</option>
          <option value="manager">Manager</option>
          <option value="supervisor">Supervisor</option>
          <option value="collector">Collector</option>
          <option value="driver">Driver</option>
          <option value="manpower">Manpower</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-900 border rounded-lg shadow-sm">
        <table className="w-full text-sm text-gray-800 dark:text-gray-200">
          <thead className="bg-gray-100 dark:bg-gray-800 uppercase text-xs font-semibold">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Username</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              currentUsers.map((u, i) => (
                <tr
                  key={u.id}
                  className={`${
                    i % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-gray-50 dark:bg-gray-800"
                  } hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                >
                  <td className="p-3">{u.id}</td>
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role}</td>
                  <td className="p-3 flex justify-center gap-3">
                    <button
                      onClick={() => openModal(u)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* ---------------- MODAL ---------------- */}
      {modalOpen && modalUser && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setModalOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              {modalUser.id ? "Edit User" : "Add New User"}
            </h2>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Username"
                required
                value={modalUser.username}
                onChange={(e) =>
                  setModalUser({ ...modalUser, username: e.target.value })
                }
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={modalUser.email}
                onChange={(e) =>
                  setModalUser({ ...modalUser, email: e.target.value })
                }
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              />
              <select
                value={modalUser.role}
                onChange={(e) =>
                  setModalUser({ ...modalUser, role: e.target.value })
                }
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="admin">Admin</option>
                <option value="ceo">CEO</option>
                <option value="hr">HR</option>
                <option value="account">Accounting</option>
                <option value="manager">Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="collector">Collector</option>
                <option value="driver">Driver</option>
                <option value="manpower">Manpower</option>
              </select>

              {showPassword && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Password"
                    required={!modalUser.id}
                    value={modalUser.password || ""}
                    readOnly
                    className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-gray-100 pr-10"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-800"
                  >
                    <KeyIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                {modalUser.id ? "Update User" : "Create User"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
