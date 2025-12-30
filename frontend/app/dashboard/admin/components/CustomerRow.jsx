import { useState } from "react";
import Modal from "./Modal";
import { api, authHeaders } from "../lib/api";

export default function CustomerRow({ c, onUpdated, onDeleted }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState({ ...c });

  const save = async () => {
    try {
      const res = await api.patch(`api/customers/${c.id}/`, editing, { headers: authHeaders() });
      onUpdated(res.data);
      setShow(false);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  const del = async () => {
    if (!confirm("Delete customer?")) return;
    try {
      await api.delete(`api/customers/${c.id}/`, { headers: authHeaders() });
      onDeleted(c.id);
      setShow(false);
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <>
      <tr>
        <td className="p-2">{c.id}</td>
        <td className="p-2">{c.type}</td>
        <td className="p-2">{c.names}</td>
        <td className="p-2">{c.contact_no}</td>
        <td className="p-2">{c.account_number}</td>
        <td className="p-2">{c.monthly_fee}</td>
        <td className="p-2">{c.outstanding}</td>
        <td className="p-2">{c.status}</td>
        <td className="p-2">{c.sector}</td>
        <td className="p-2">{c.cell}</td>
        <td className="p-2">{c.village}</td>
        <td className="p-2">
          <button className="text-indigo-600 mr-2" onClick={() => setShow(true)}>View</button>
        </td>
      </tr>

      <Modal open={show} onClose={() => setShow(false)} title={`Customer ${c.id} — ${c.names}`}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={editing.names} onChange={(e)=>setEditing({...editing, names:e.target.value})} className="flex-1 border p-2" />
            <input value={editing.contact_no} onChange={(e)=>setEditing({...editing, contact_no:e.target.value})} className="flex-1 border p-2" />
          </div>
          <div className="flex gap-2">
            <input value={editing.account_number} onChange={(e)=>setEditing({...editing, account_number:e.target.value})} className="flex-1 border p-2" />
            <input type="number" value={editing.monthly_fee} onChange={(e)=>setEditing({...editing, monthly_fee: e.target.value})} className="flex-1 border p-2" />
            <input type="number" value={editing.outstanding} onChange={(e)=>setEditing({...editing, outstanding: e.target.value})} className="flex-1 border p-2" />
          </div>
          <div className="flex gap-2">
            <select value={editing.status} onChange={(e)=>setEditing({...editing, status: e.target.value})} className="border p-2">
              <option value="active">active</option>
              <option value="passive">passive</option>
            </select>
            <select value={editing.sector} onChange={(e)=>setEditing({...editing, sector: e.target.value})} className="border p-2">
              <option value={editing.sector}>{editing.sector || "sector"}</option>
            </select>
            <input value={editing.cell} onChange={(e)=>setEditing({...editing, cell: e.target.value})} className="border p-2" />
            <input value={editing.village} onChange={(e)=>setEditing({...editing, village: e.target.value})} className="border p-2" />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={del} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
            <button onClick={save} className="bg-indigo-600 text-white px-3 py-1 rounded">Save</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
