import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api/customers/";
const PAGE_SIZE = 50;

export default function CustomersDashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [sectorOptions, setSectorOptions] = useState([]);
  const [cellOptions, setCellOptions] = useState([]);
  const [villageOptions, setVillageOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  const [filters, setFilters] = useState({
    search: "",
    sector: "",
    cell: "",
    village: "",
    status: "",
  });

  const [formData, setFormData] = useState({
    id: null,
    type: "individual",
    names: "",
    contact_no: "",
    account_number: "",
    monthly_fee: "",
    outstanding: "",
    status: "active",
    sector: "",
    cell: "",
    village: "",
  });

  // Fetch filter options
  useEffect(() => {
    axios
      .get(`${API_BASE}filter_options/`)
      .then((res) => {
        setSectorOptions(res.data.sectors || []);
        setCellOptions(res.data.cells || []);
        setVillageOptions(res.data.villages || []);
        setStatusOptions(res.data.statuses || ["active", "passive"]);
      })
      .catch(() => console.warn("Could not load filter options"));
  }, []);

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [page, filters]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE, ...filters };
      const { data } = await axios.get(API_BASE, { params });
      setCustomers(data.results || data);
      setCount(data.count || data.length || 0);
    } catch (err) {
      console.error("Error fetching customers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit && formData.id) {
        await axios.patch(`${API_BASE}${formData.id}/`, formData);
      } else {
        await axios.post(API_BASE, formData);
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Error saving customer");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_BASE}${id}/`);
      fetchCustomers();
    } catch {
      alert("Delete failed");
    }
  };

  const totalPages = Math.ceil(count / PAGE_SIZE);

  const openForm = (customer = null) => {
    setIsEdit(!!customer);
    setFormData(
      customer || {
        id: null,
        type: "individual",
        names: "",
        contact_no: "",
        account_number: "",
        monthly_fee: "",
        outstanding: "",
        status: "active",
        sector: "",
        cell: "",
        village: "",
      }
    );
    setShowForm(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">Customers</h2>
          <button
            onClick={() => openForm()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            + Add Customer
          </button>
        </div>

        {/* FILTERS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
          <input
            type="text"
            placeholder="Search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded-lg p-2"
          />
          <select
            value={filters.sector}
            onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
            className="border rounded-lg p-2"
          >
            <option value="">Sector</option>
            {sectorOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.cell}
            onChange={(e) => setFilters({ ...filters, cell: e.target.value })}
            className="border rounded-lg p-2"
          >
            <option value="">Cell</option>
            {cellOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filters.village}
            onChange={(e) =>
              setFilters({ ...filters, village: e.target.value })
            }
            className="border rounded-lg p-2"
          >
            <option value="">Village</option>
            {villageOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            className="border rounded-lg p-2"
          >
            <option value="">Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchCustomers()}
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4"
          >
            Apply
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto border rounded-lg">
          {loading ? (
            <div className="text-center p-6 text-gray-500">Loading...</div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="p-3 border">#</th>
                  <th className="p-3 border">Name</th>
                  <th className="p-3 border">Contact</th>
                  <th className="p-3 border">Account</th>
                  <th className="p-3 border">Monthly Fee</th>
                  <th className="p-3 border">Outstanding</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Sector</th>
                  <th className="p-3 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 border">{i + 1 + (page - 1) * PAGE_SIZE}</td>
                    <td className="p-3 border">{c.names}</td>
                    <td className="p-3 border">{c.contact_no}</td>
                    <td className="p-3 border">{c.account_number}</td>
                    <td className="p-3 border">{c.monthly_fee}</td>
                    <td className="p-3 border">{c.outstanding}</td>
                    <td className="p-3 border">{c.status}</td>
                    <td className="p-3 border">{c.sector}</td>
                    <td className="p-3 border flex gap-2">
                      <button
                        onClick={() => openForm(c)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages || 1}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* MODAL FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <h3 className="text-xl font-semibold mb-4">
                {isEdit ? "Edit Customer" : "Add Customer"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  placeholder="Full Name"
                  value={formData.names}
                  onChange={(e) =>
                    setFormData({ ...formData, names: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  placeholder="Contact"
                  value={formData.contact_no}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_no: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
                <input
                  placeholder="Account Number"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Monthly Fee"
                    value={formData.monthly_fee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthly_fee: e.target.value,
                      })
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Outstanding"
                    value={formData.outstanding}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        outstanding: e.target.value,
                      })
                    }
                    className="border p-2 rounded"
                  />
                </div>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={formData.sector}
                    onChange={(e) =>
                      setFormData({ ...formData, sector: e.target.value })
                    }
                    className="border p-2 rounded"
                  >
                    <option value="">Sector</option>
                    {sectorOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.cell}
                    onChange={(e) =>
                      setFormData({ ...formData, cell: e.target.value })
                    }
                    className="border p-2 rounded"
                  >
                    <option value="">Cell</option>
                    {cellOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={formData.village}
                    onChange={(e) =>
                      setFormData({ ...formData, village: e.target.value })
                    }
                    className="border p-2 rounded"
                  >
                    <option value="">Village</option>
                    {villageOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    {isEdit ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
