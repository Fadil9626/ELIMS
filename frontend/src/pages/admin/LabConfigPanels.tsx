import React, { useEffect, useState } from "react";
import { Layers, PlusCircle, Pencil, Trash2, XCircle, Save } from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import LabConfigNav from "../../components/lab/LabConfigNav";

const LabConfigPanels: React.FC = () => {
  const [panels, setPanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<any | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "" });
  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

  const loadPanels = async () => {
    try {
      setLoading(true);
      const data = await labConfigService.getPanels();
      setPanels(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load panels");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Panel name is required");
      try {
      if (editingPanel) {
        // Update
        await labConfigService.updatePanel(editingPanel.id, formData, token);
        toast.success("✅ Panel updated successfully");
      } else {
        // Create
        await labConfigService.createPanel(formData);
        toast.success("✅ Panel created successfully");
      }
      setFormData({ name: "", price: "" });
      setEditingPanel(null);
      setShowModal(false);
      loadPanels();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this panel?")) return;
    try {
      await labConfigService.deletePanel(id, token);
      toast.success("🗑️ Panel deleted");
      loadPanels();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const openEdit = (panel: any) => {
    setEditingPanel(panel);
    setFormData({ name: panel.name, price: panel.price || "" });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingPanel(null);
    setFormData({ name: "", price: "" });
    setShowModal(true);
  };

  useEffect(() => {
    loadPanels();
  }, []);

  return (
    <div className="p-6">
      <LabConfigNav />
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <Layers className="text-blue-500" /> Test Panels
          </h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700"
          >
            <PlusCircle size={16} /> Add Panel
          </button>
        </div>

        {loading ? (
          <p>Loading panels...</p>
        ) : (
          <table className="w-full text-sm border-t">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Panel Name</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {panels.map((p, i) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">${p.price}</td>
                  <td className="p-2">
                    {p.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-2 text-right flex justify-end gap-3">
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {panels.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 p-4">
                    No panels found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 🧩 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-3">
              {editingPanel ? "Edit Panel" : "Add Panel"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Panel Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  <Save size={16} /> {editingPanel ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabConfigPanels;
