import React, { useEffect, useState, useCallback } from "react";
import { PlusCircle, Trash2, Pencil, XCircle, Save, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";
import apiFetch from "../../../services/apiFetch"; // 🚀 1. Import apiFetch

export default function SampleTypesTab() {
  const [samples, setSamples] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  // 🚀 2. REMOVED manual token management

  const loadSamples = useCallback(async () => { // 🚀 3. Added useCallback
    try {
      // 🚀 4. Use apiFetch
      const data = await apiFetch("/api/sample-types");
      setSamples(data || []);
    } catch {
      toast.error("❌ Failed to load sample types");
    }
  }, []); // Stable dependency

  useEffect(() => { 
    loadSamples(); 
  }, [loadSamples]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // 🚀 5. Use apiFetch for save/update
      const url = editing
        ? `/api/sample-types/${editing.id}`
        : "/api/sample-types";
      const method = editing ? "PUT" : "POST";
      
      await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      });

      toast.success(editing ? "✅ Updated" : "✅ Added");
      setShowModal(false);
      loadSamples();
    } catch {
      toast.error("❌ Failed to save sample type");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sample type?")) return;
    try {
      // 🚀 6. Use apiFetch for delete
      await apiFetch(`/api/sample-types/${id}`, {
        method: "DELETE",
      });
      toast.success("🗑️ Deleted");
      loadSamples();
    } catch {
      toast.error("❌ Delete failed");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4 text-blue-700 flex items-center gap-2">
        <FlaskConical className="text-blue-600" /> Sample Types
      </h3>

      <div className="flex justify-end mb-3">
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700"
        >
          <PlusCircle size={16} /> Add Sample
        </button>
      </div>

      <table className="w-full text-sm border rounded-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Description</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{s.name}</td>
              <td className="p-2">{s.description}</td>
              <td className="p-2 text-right space-x-2">
                <button
                  onClick={() => openEdit(s)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-4 h-4 inline" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
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
              {editing ? "Edit Sample Type" : "Add Sample Type"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                placeholder="Sample Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
                required
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