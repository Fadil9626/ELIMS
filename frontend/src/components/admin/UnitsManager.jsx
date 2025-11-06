import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Ruler,
  Save,
  XCircle,
} from "lucide-react";
import labConfigService from "../../services/labConfigService";
import { motion, AnimatePresence } from "framer-motion";

const UnitsManager = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    unit_name: "",
    symbol: "",
    description: "",
  });

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token;

  // -------------------------------------------------------------
  // 🧠 Load all units
  // -------------------------------------------------------------
  const fetchUnits = async () => {
    try {
      setLoading(true);
      const data = await labConfigService.getUnits(token);
      setUnits(data);
    } catch (err) {
      console.error("❌ Failed to load units:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // -------------------------------------------------------------
  // ✏️ Handle Form Input
  // -------------------------------------------------------------
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // -------------------------------------------------------------
  // 💾 Create or Update Unit
  // -------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await labConfigService.updateUnit(editingUnit.id, formData, token);
      } else {
        await labConfigService.createUnit(formData, token);
      }
      setShowModal(false);
      setEditingUnit(null);
      setFormData({ unit_name: "", symbol: "", description: "" });
      fetchUnits();
    } catch (err) {
      alert("❌ Failed to save unit");
    }
  };

  // -------------------------------------------------------------
  // 🗑️ Delete Unit
  // -------------------------------------------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this unit?")) return;
    try {
      await labConfigService.deleteUnit(id, token);
      fetchUnits();
    } catch (err) {
      alert("❌ Failed to delete unit");
    }
  };

  // -------------------------------------------------------------
  // 🧩 Render UI
  // -------------------------------------------------------------
  if (loading)
    return <div className="p-6 text-gray-600">Loading units...</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Ruler className="text-blue-600 w-5 h-5" /> Measurement Units
        </h2>
        <button
          onClick={() => {
            setEditingUnit(null);
            setFormData({ unit_name: "", symbol: "", description: "" });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          <PlusCircle className="w-5 h-5" /> Add Unit
        </button>
      </div>

      {/* Units Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left p-3 border">#</th>
              <th className="text-left p-3 border">Unit Name</th>
              <th className="text-left p-3 border">Symbol</th>
              <th className="text-left p-3 border">Description</th>
              <th className="text-center p-3 border w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit, i) => (
              <tr
                key={unit.id}
                className="hover:bg-gray-50 transition-colors border-b"
              >
                <td className="p-3 border">{i + 1}</td>
                <td className="p-3 border font-medium">{unit.unit_name}</td>
                <td className="p-3 border text-gray-600">{unit.symbol}</td>
                <td className="p-3 border text-gray-500">
                  {unit.description || "—"}
                </td>
                <td className="p-3 border text-center">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setEditingUnit(unit);
                        setFormData({
                          unit_name: unit.unit_name,
                          symbol: unit.symbol,
                          description: unit.description || "",
                        });
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Unit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete Unit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {units.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="p-4 text-center text-gray-500 italic"
                >
                  No units found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Ruler className="text-blue-600" />
                {editingUnit ? "Edit Unit" : "Add New Unit"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Unit Name</label>
                  <input
                    name="unit_name"
                    value={formData.unit_name}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-md p-2 mt-1"
                    placeholder="e.g. Milliliter"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Symbol</label>
                  <input
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-md p-2 mt-1"
                    placeholder="e.g. mL"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border rounded-md p-2 mt-1"
                    placeholder="Optional description..."
                  />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-2 rounded-md border flex items-center gap-1 text-gray-600 hover:bg-gray-100"
                  >
                    <XCircle className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1 hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnitsManager;
