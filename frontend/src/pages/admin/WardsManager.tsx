import React, { useEffect, useState, FormEvent } from "react";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import labConfigService from "../../services/labConfigService";
import toast from "react-hot-toast";

// Define the Ward type locally
interface Ward {
  id: number;
  name: string;
  created_at: string;
}

const WardsManager: React.FC = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [formData, setFormData] = useState<Partial<Ward>>({ name: "" });
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");

  useEffect(() => {
    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWards = async () => {
    if (!userInfo.token) {
       toast.error("Not authenticated.");
       setLoading(false);
       return;
    }
    try {
      setLoading(true);
      const data = await labConfigService.getWards(userInfo.token);
      setWards(data || []); // Ensure array even if data is null/undefined
    } catch {
      toast.error("Failed to fetch wards");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return toast.error("Ward name is required.");
    if (!userInfo.token) return toast.error("Not authenticated.");

    try {
      if (editingWard) {
        await labConfigService.updateWard(
          editingWard.id,
          formData,
          userInfo.token
        );
        toast.success("Ward updated successfully");
      } else {
        await labConfigService.createWard(formData, userInfo.token);
        toast.success("Ward added successfully");
      }
      resetForm();
      fetchWards();
    } catch (error: any) {
      toast.error(error.message || "Error saving ward");
    }
  };

  const handleEdit = (ward: Ward) => {
    setEditingWard(ward);
    setFormData({ name: ward.name });
  };

  const handleDelete = async (id: number) => {
    if (!userInfo.token) return toast.error("Not authenticated.");
    if (!window.confirm("Are you sure you want to delete this ward?")) return;
    try {
      await labConfigService.deleteWard(id, userInfo.token);
      toast.success("Ward deleted");
      fetchWards();
    } catch {
      toast.error("Failed to delete ward");
    }
  };

  const resetForm = () => {
    setEditingWard(null);
    setFormData({ name: "" });
  };

  return (
    <div className="bg-white rounded-xl shadow-md border p-6 max-w-3xl">
      <div className="flex items-center mb-4 space-x-2">
        <Building2 className="text-blue-600" />
        <h2 className="text-xl font-semibold">Ward Configuration</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-2 mb-6">
        <input
          type="text"
          className="border p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Ward Name"
          value={formData.name || ""}
          onChange={(e) => setFormData({ name: e.target.value })}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
        >
          {editingWard ? <Save size={18} /> : <PlusCircle size={18} />}
          <span className="ml-1">{editingWard ? "Update" : "Add"}</span>
        </button>
        {editingWard && (
          <button
            type="button"
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center"
            onClick={resetForm}
          >
            <XCircle size={18} />
            <span className="ml-1">Cancel</span>
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading wards...</p>
      ) : (
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left border-b text-sm font-medium text-gray-600">#</th>
              <th className="p-3 text-left border-b text-sm font-medium text-gray-600">Ward Name</th>
              <th className="p-3 text-left border-b text-sm font-medium text-gray-600">Created</th>
              <th className="p-3 text-center border-b text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* --- ✅ THIS IS THE FIX --- */}
            {wards.map((ward, i) => (
              <tr key={ward.id} className="hover:bg-gray-50">
                <td className="p-3 text-sm">{i + 1}</td>
                <td className="p-3 text-sm">{ward.name}</td>
                <td className="p-3 text-sm">
                  {new Date(ward.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-center space-x-3">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                    onClick={() => handleEdit(ward)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                    onClick={() => handleDelete(ward.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {wards.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-4 text-gray-500">
                  No wards configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WardsManager;