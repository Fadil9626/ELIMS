// src/pages/admin/tabs/UnitsTab.jsx
import React, { useEffect, useState } from "react";
import { PlusCircle, Trash2, Pencil, XCircle, Save, Ruler } from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../../services/labConfigService";

export default function UnitsTab() {
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ unit_name: "", symbol: "", description: "" });
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  const loadUnits = async () => {
    try {
      const data = await labConfigService.getUnits(token);
      setUnits(data || []);
    } catch {
      toast.error("❌ Failed to load units");
    }
  };

  useEffect(() => { loadUnits(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ unit_name: "", symbol: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      unit_name: u.unit_name,
      symbol: u.symbol,
      description: u.description,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editing ? `/api/units/${editing.id}` : "/api/units";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(editing ? "✅ Unit updated" : "✅ Unit added");
      setShowModal(false);
      loadUnits();
    } catch {
      toast.error("❌ Failed to save unit");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this unit?")) return;
    try {
      const res = await fetch(`/api/units/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("🗑️ Unit deleted");
      loadUnits();
    } catch {
      toast.error("❌ Delete failed");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4 text-blue-700 flex items-center gap-2">
        <Ruler className="text-blue-600" /> Measurement Units
      </h3>

      <div className="flex justify-end mb-3">
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700"
        >
          <PlusCircle size={16} /> Add Unit
        </button>
      </div>

      <table className="w-full text-sm border rounded-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Unit</th>
            <th className="p-2 text-left">Symbol</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{u.unit_name}</td>
              <td className="p-2">{u.symbol}</td>
              <td className="p-2">{u.description}</td>
              <td className="p-2 text-right space-x-2">
                <button
                  onClick={() => openEdit(u)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-4 h-4 inline" />
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-3">
              {editing ? "Edit Unit" : "Add Unit"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                placeholder="Unit Name"
                value={form.unit_name}
                onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
                required
              />
              <input
                placeholder="Symbol"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border rounded-md px-3 py-2 text-sm"
              ></textarea>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700"
                >
                  <Save size={16} /> {editing ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
