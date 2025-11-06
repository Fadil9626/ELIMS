import React, { useEffect, useState } from "react";
import labConfigService from "../../services/labConfigService";
import {
  HiPlusCircle,
  HiTrash,
  HiPencil,
  HiSearch,
  HiBeaker,
  HiOfficeBuilding,
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const DepartmentsConfigurationPage = () => {
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newDept, setNewDept] = useState("");
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token;

  // =========================================================
  // 🧩 Fetch Departments
  // =========================================================
  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await labConfigService.getDepartments(token);
      setDepartments(data);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // =========================================================
  // ➕ Add / ✏️ Edit / 🗑️ Delete
  // =========================================================
  const handleAdd = async () => {
    if (!newDept.trim()) return toast.error("Enter department name");
    try {
      await fetch(`/api/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newDept }),
      });
      toast.success("✅ Department added");
      setNewDept("");
      fetchDepartments();
    } catch (error) {
      toast.error("❌ Failed to add department");
    }
  };

  const handleUpdate = async (id, name) => {
    try {
      await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      toast.success("✅ Updated successfully");
      setEditing(null);
      fetchDepartments();
    } catch (error) {
      toast.error("❌ Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await fetch(`/api/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("🗑️ Department deleted");
      fetchDepartments();
    } catch (error) {
      toast.error("❌ Failed to delete");
    }
  };

  // =========================================================
  // 🔍 Filter Logic
  // =========================================================
  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  // =========================================================
  // 💅 UI Rendering
  // =========================================================
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-semibold text-gray-800 flex items-center gap-2">
          <HiOfficeBuilding className="text-blue-600" />
          Department Configuration
        </h1>
        <button
          onClick={fetchDepartments}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Add Department */}
      <motion.div
        className="bg-white rounded-xl shadow-md border p-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="font-semibold text-lg mb-3">
          Add a New Laboratory Department
        </h2>

        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="Enter department name..."
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            className="p-2.5 flex-1 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={handleAdd}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
          >
            <HiPlusCircle className="text-lg" /> Add
          </button>
        </div>
      </motion.div>

      {/* Search + Department List */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <HiSearch className="text-gray-500" />
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 italic">No departments found.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-md border">
            <AnimatePresence>
              {filtered.map((dept, index) => (
                <motion.li
                  key={dept.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex justify-between items-center px-4 py-3 ${
                    index % 2 === 0 ? "bg-gray-50" : "bg-white"
                  } hover:bg-blue-50 transition`}
                >
                  {editing === dept.id ? (
                    <input
                      type="text"
                      value={dept.name}
                      onChange={(e) => {
                        const updated = [...departments];
                        const target = updated.find((d) => d.id === dept.id);
                        if (target) target.name = e.target.value;
                        setDepartments(updated);
                      }}
                      onBlur={() => handleUpdate(dept.id, dept.name)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleUpdate(dept.id, dept.name)
                      }
                      className="border p-1 rounded-md w-full text-gray-800 focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <span className="text-gray-800 font-medium">
                      {dept.name}
                    </span>
                  )}

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(dept.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 rounded"
                      title="Edit Department"
                    >
                      <HiPencil />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded"
                      title="Delete Department"
                    >
                      <HiTrash />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};

export default DepartmentsConfigurationPage;
