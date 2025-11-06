import React, { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  Building2,
} from "lucide-react";
import labConfigService from "../../services/labConfigService"; // <-- 1. FIXED IMPORT
import toast from "react-hot-toast";

// 2. FIX: Define the Department type locally
interface Department {
  id: number;
  name: string;
}

const DepartmentsManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<Partial<Department>>({ name: "" });

  const userInfoRaw = localStorage.getItem("userInfo");
  const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : {};
  const token: string | undefined = userInfo?.token;

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await labConfigService.getDepartments(token as string);
      setDepartments(data);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to fetch departments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = formData.name?.trim();
    if (!name) {
      toast.error("Department name is required.");
      return;
    }

    try {
      if (editingDept) {
        await labConfigService.updateDepartment(
          editingDept.id,
          { name },
          token as string
        );
        toast.success("Department updated successfully");
      } else {
        await labConfigService.createDepartment({ name }, token as string);
        toast.success("Department added successfully");
      }
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error saving department");
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;

    try {
      await labConfigService.deleteDepartment(id, token as string);
      toast.success("Department deleted");
      // Optimistic update to keep UI snappy
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      // Or call fetchDepartments(); if you prefer re-fetch.
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.message ||
          "Failed to delete department. (If it is referenced by tests, reassign or remove references first.)"
      );
    }
  };

  const resetForm = () => {
    setEditingDept(null);
    setFormData({ name: "" });
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-4 space-x-2">
        <Building2 className="text-blue-600" />
        <h2 className="text-xl font-semibold">Department Configuration</h2>
      </div>

      {/* Add / Update Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          className="border p-2 rounded w-full"
          placeholder="Department Name"
          value={formData.name || ""}
          onChange={(e) => setFormData({ name: e.target.value })}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
        >
          {editingDept ? <Save size={18} /> : <PlusCircle size={18} />}
          <span className="ml-1">{editingDept ? "Update" : "Add"}</span>
        </button>
        {editingDept && (
          <button
            type="button"
            className="bg-gray-400 text-white px-4 py-2 rounded flex items-center"
            onClick={resetForm}
          >
            <XCircle size={18} />
            <span className="ml-1">Cancel</span>
          </button>
        )}
      </form>

      {/* Table */}
      {loading ? (
        <p>Loading departments...</p>
      ) : (
        <motion.table
          className="min-w-full border border-gray-300 rounded text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left border-b">#</th>
              <th className="p-2 text-left border-b">Department Name</th>
              <th className="p-2 text-center border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept, i) => (
              <tr key={dept.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{dept.name}</td>
                <td className="p-2 text-center space-x-2">
                  <button
                    className="text-blue-600"
                    onClick={() => handleEdit(dept)}
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="text-red-600"
                    onClick={() => handleDelete(dept.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-4 text-gray-500">
                  No departments configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </motion.table>
      )}
    </div>
  );
};

export default DepartmentsManager;