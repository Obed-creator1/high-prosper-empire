"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const PAGE_SIZE = 50;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [cell, setCell] = useState("");
  const [village, setVillage] = useState("");
  const [status, setStatus] = useState("");
  const [minOutstanding, setMinOutstanding] = useState("");
  const [maxOutstanding, setMaxOutstanding] = useState("");

  // Options
  const [sectorOptions, setSectorOptions] = useState([]);
  const [cellOptions, setCellOptions] = useState([]);
  const [villageOptions, setVillageOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  // Dropdown form control
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Form data
  const [formCustomer, setFormCustomer] = useState({
    type: "",
    names: "",
    contact_no: "",
    account_number: "",
    monthly_fee: 0,
    sector: "",
    cell: "",
    village: "",
    status: "Active",
    outstanding: 0,
  });

  // ---------------- Fetch filter options ----------------
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const { data } = await axios.get("http://127.0.0.1:8000/api/customers/filter_options/");
        setSectorOptions(data.sectors || []);
        setCellOptions(data.cells || []);
        setVillageOptions(data.villages || []);
        setStatusOptions(data.statuses || []);
      } catch (err) {
        console.error("Failed to fetch filter options:", err);
      }
    };
    fetchFilterOptions();
  }, []);

  // ---------------- Fetch customers ----------------
  useEffect(() => {
    fetchCustomers();
  }, [page, search, sector, cell, village, status, minOutstanding, maxOutstanding]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE, search, sector, cell, village, status, min_outstanding: minOutstanding, max_outstanding: maxOutstanding };
      const { data } = await axios.get("http://127.0.0.1:8000/api/customers/", { params });
      setCustomers(data.results);
      setCount(data.count);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(count / PAGE_SIZE);

  // ---------------- Handle Add or Update Customer ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && selectedCustomer) {
        // Update
        await axios.patch(`http://127.0.0.1:8000/api/customers/${selectedCustomer.id}/`, formCustomer);
        alert("Customer updated!");
      } else {
        // Add
        const { data } = await axios.post("http://127.0.0.1:8000/api/customers/", formCustomer);
        setCustomers((prev) => [data, ...prev]);
        alert("Customer added!");
      }
      setShowForm(false);
      setIsEditMode(false);
      setSelectedCustomer(null);
      setFormCustomer({
        type: "",
        names: "",
        contact_no: "",
        account_number: "",
        monthly_fee: 0,
        sector: "",
        cell: "",
        village: "",
        status: "Active",
        outstanding: 0,
      });
      fetchCustomers();
    } catch (err) {
      console.error("Failed to submit customer:", err.response?.data || err);
      alert("Error saving customer");
    }
  };

  // ---------------- Delete Customer ----------------
  const deleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/customers/${id}/`);
      alert("Customer deleted!");
      fetchCustomers();
    } catch (err) {
      console.error("Failed to delete customer:", err);
      alert("Error deleting customer");
    }
  };

  // ---------------- Actions ----------------
  const viewEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setFormCustomer({ ...customer });
    setIsEditMode(true);
    setShowForm(true);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Customers</h1>

      {/* Filters */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input placeholder="Search name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">All Sectors</option>
          {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cell} onChange={(e) => setCell(e.target.value)}>
          <option value="">All Cells</option>
          {cellOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={village} onChange={(e) => setVillage(e.target.value)}>
          <option value="">All Villages</option>
          {villageOptions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="number" placeholder="Min Outstanding" value={minOutstanding} onChange={(e) => setMinOutstanding(e.target.value)} />
        <input type="number" placeholder="Max Outstanding" value={maxOutstanding} onChange={(e) => setMaxOutstanding(e.target.value)} />
      </div>

      {/* Button to open Add Customer Form */}
      <button onClick={() => { setShowForm(!showForm); setIsEditMode(false); setSelectedCustomer(null); }}>
        {showForm ? "Close Form" : "Add Customer"}
      </button>

      {/* Dropdown Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ margin: "1rem 0", display: "flex", flexWrap: "wrap", gap: "0.5rem", border: "1px solid #ccc", padding: "1rem" }}>
          {Object.keys(formCustomer).map((key) => (
            <input
              key={key}
              placeholder={key.replace("_", " ")}
              value={formCustomer[key]}
              onChange={(e) => setFormCustomer({ ...formCustomer, [key]: e.target.value })}
              required
            />
          ))}
          <button type="submit">{isEditMode ? "Update Customer" : "Add Customer"}</button>
        </form>
      )}

      {/* Customers Table */}
      {loading ? <p>Loading customers...</p> : (
        <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Account</th>
              <th>Monthly Fee</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Sector</th>
              <th>Cell</th>
              <th>Village</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.type}</td>
                <td>{c.names}</td>
                <td>{c.contact_no}</td>
                <td>{c.account_number}</td>
                <td>{c.monthly_fee}</td>
                <td>{c.outstanding}</td>
                <td>{c.status}</td>
                <td>{c.sector}</td>
                <td>{c.cell}</td>
                <td>{c.village}</td>
                <td>
                  <button onClick={() => viewEditCustomer(c)}>View/Edit</button>
                  <button onClick={() => deleteCustomer(c.id)} style={{ marginLeft: "0.5rem" }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>Prev</button>
        <span style={{ margin: "0 1rem" }}>Page {page} of {totalPages || 1}</span>
        <button onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))} disabled={page >= totalPages}>Next</button>
      </div>
    </div>
  );
}
