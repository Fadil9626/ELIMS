import React, { useEffect, useState, useCallback } from "react";
import { PlusCircle, Trash2, Pencil, XCircle, Save, Ruler } from "lucide-react";
import toast from "react-hot-toast";
import apiFetch from "../../../services/apiFetch"; // 🚀 1. Import apiFetch

export default function UnitsTab() {
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ unit_name: "", symbol: "", description: "" });
  
  // 🚀 2. REMOVED manual token management

  const loadUnits = useCallback(async () => { // 🚀 3. Added useCallback
    try {
      // 🚀 4. Use apiFetch with the correct URL from the logs
      const data = await apiFetch("/api/lab-config/units");
      
      // ✅ --- FIX for "units.map is not a function" ---
      // Ensure we always set an array to prevent crashes
      if (Array.isArray(data)) {
        setUnits(data);
      } else if (data && Array.isArray(data.units)) {
        setUnits(data.units); // Handle cases like { units: [...] }
      } else if (data && Array.isArray(data.data)) {
        setUnits(data.data); // Handle cases like { data: [...] }
      } else {
        console.error("Expected an array of units, but received:", data);
        setUnits([]); // Default to empty array on weird response
      }
      // --- End of Fix ---

    } catch {
      toast.error("❌ Failed to load units");
      setUnits([]); // Also set to empty on error to prevent crash
    }
  }, []); // Stable dependency

  useEffect(() => { 
    loadUnits(); 
  }, [loadUnits]);

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
      description: u.description || "", // Handle null description
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // 🚀 5. Use apiFetch for save/update
      // (Assuming /api/lab-config/units based on your other files)
      const url = editing ? `/api/lab-config/units/${editing.id}` : "/api/lab-config/units";
      const method = editing ? "PUT" : "POST";
      
      await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      
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
      // 🚀 6. Use apiFetch for delete
      await apiFetch(`/api/lab-config/units/${id}`, {
        method: "DELETE",
      });
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
          {/* This .map call is now safe */}
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