import React, { useEffect, useState } from "react";
import { HiPlus, HiTrash, HiPencil } from "react-icons/hi";
import labConfigService from "../../services/labConfigService";

const DepartmentManager = () => {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [loading, setLoading] = useState(true);
  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  const fetchDepartments = async () => {
    try {
      const data = await labConfigService.getDepartments(token);
      setDepartments(data);
    } catch (err) {
      console.error("❌ Failed to load departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async () => {
    if (!newDept.trim()) return;
    try {
      await labConfigService.createDepartment({ name: newDept }, token);
      setNewDept("");
      fetchDepartments();
    } catch (err) {
      alert("Failed to add department");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await labConfigService.deleteDepartment(id, token);
      fetchDepartments();
    } catch (err) {
      alert("Failed to delete department");
    }
  };

  if (loading) return <div className="p-6">Loading departments...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Departments</h2>
        <div className="flex gap-2">
          <input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="New department name"
            className="border rounded-md px-3 py-2"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 flex items-center gap-1"
          >
            <HiPlus /> Add
          </button>
        </div>
      </div>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border p-2 text-left">#</th>
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d, i) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2">{d.name}</td>
              <td className="border p-2 text-center">
                <button
                  onClick={() => handleDelete(d.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <HiTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentManager;
