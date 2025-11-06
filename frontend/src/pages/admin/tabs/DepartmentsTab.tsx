// src/pages/admin/tabs/DepartmentsTab.jsx
import React, { useState, useEffect } from "react";
import { PlusCircle, Trash2, Pencil, XCircle, Save, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../../services/labConfigService";

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  const loadDepartments = async () => {
    try {
      const data = await labConfigService.getDepartments(token);
      setDepartments(data || []);
    } catch {
      toast.error("❌ Failed to load departments");
    }
  };

  useEffect(() => { loadDepartments(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, description: d.description });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editing
        ? `/api/departments/${editing.id}`
        : "/api/departments";
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
      toast.success(editing ? "✅ Department updated" : "✅ Department added");
      setShowModal(false);
      setEditing(null);
      loadDepartments();
    } catch {
      toast.error("❌ Failed to save department");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("🗑️ Department deleted");
      loadDepartments();
    } catch {
      toast.error("❌ Delete failed");
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4 text-blue-700 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-blue-600" /> Departments
      </h3>

      <div className="flex justify-end mb-3">
        <button
          onClick={openAdd}
          className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700"
        >
          <PlusCircle size={16} /> Add Department
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
          {departments.map((d) => (
            <tr key={d.id} className="border-t hover:bg-gray-50">
              <td className="p-2">{d.name}</td>
              <td className="p-2">{d.description}</td>
              <td className="p-2 text-right space-x-2">
                <button
                  onClick={() => openEdit(d)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil className="w-4 h-4 inline" />
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
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
              {editing ? "Edit Department" : "Add Department"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <input
                placeholder="Department Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm"
                required
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
