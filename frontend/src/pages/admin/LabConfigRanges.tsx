// src/pages/admin/LabConfigRanges.tsx
import React, { useEffect, useState } from "react";
import { Ruler, Pencil, Trash2, Save, PlusCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import LabConfigNav from "../../components/lab/LabConfigNav";

const LabConfigRanges: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [ranges, setRanges] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    range_type: "numeric",
    min_value: "",
    max_value: "",
    qualitative_value: "",
    gender: "Any",
    min_age: "",
    max_age: "",
  });
  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

  const loadTests = async () => {
    try {
      const data = await labConfigService.getAllTests(token);
      setTests(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load tests");
    }
  };

  const loadRanges = async (id: number) => {
    setSelected(id);
    try {
      const data = await labConfigService.getNormalRanges(id, token);
      setRanges(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load ranges");
    }
  };

  const handleUpdate = async (rangeId: number) => {
    try {
      await labConfigService.updateNormalRange(rangeId, editing, token);
      toast.success("✅ Range updated successfully");
      setEditing(null);
      loadRanges(selected!);
    } catch (err: any) {
      toast.error(err.message || "Failed to update range");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      await labConfigService.deleteNormalRange(id, token);
      toast.success("🗑️ Range deleted");
      loadRanges(selected!);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleAddRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error("Please select a test first");

    try {
      const data = { ...formData };
      if (data.range_type === "qualitative" && !data.qualitative_value.trim()) {
        return toast.error("Please enter qualitative value");
      }

      await labConfigService.createNormalRange(selected, data, token);
      toast.success("✅ Range added successfully");
      setShowAddModal(false);
      setFormData({
        range_type: "numeric",
        min_value: "",
        max_value: "",
        qualitative_value: "",
        gender: "Any",
        min_age: "",
        max_age: "",
      });
      loadRanges(selected);
    } catch (err: any) {
      toast.error(err.message || "Failed to create range");
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  return (
    <div className="p-6">
      <LabConfigNav />
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800 mb-4">
          <Ruler className="text-purple-500" /> Normal Ranges
        </h2>

        <div className="grid grid-cols-3 gap-4">
          {/* 🔹 Left: Test List */}
          <div className="col-span-1 border-r">
            <h3 className="font-medium mb-2">Tests</h3>
            <ul className="space-y-1">
              {tests.map((t) => (
                <li
                  key={t.id}
                  onClick={() => loadRanges(t.id)}
                  className={`cursor-pointer px-2 py-1 rounded ${
                    selected === t.id
                      ? "bg-purple-100 text-purple-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {t.test_name}
                </li>
              ))}
            </ul>
          </div>

          {/* 🔹 Right: Range Table */}
          <div className="col-span-2">
            {selected ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Ranges for Selected Test</h3>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 bg-purple-600 text-white text-sm px-3 py-1 rounded-md hover:bg-purple-700"
                  >
                    <PlusCircle size={16} /> Add Range
                  </button>
                </div>

                {ranges.length ? (
                  <table className="w-full text-sm border-t">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="p-2">Type</th>
                        <th className="p-2">Min</th>
                        <th className="p-2">Max</th>
                        <th className="p-2">Gender</th>
                        <th className="p-2">Age</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranges.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{r.range_type}</td>
                          <td className="p-2">
                            {editing?.id === r.id ? (
                              <input
                                type="number"
                                value={editing.min_value || ""}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    min_value: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1 w-20 text-sm"
                              />
                            ) : (
                              r.min_value ?? "—"
                            )}
                          </td>
                          <td className="p-2">
                            {editing?.id === r.id ? (
                              <input
                                type="number"
                                value={editing.max_value || ""}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    max_value: e.target.value,
                                  })
                                }
                                className="border rounded px-2 py-1 w-20 text-sm"
                              />
                            ) : (
                              r.max_value ?? "—"
                            )}
                          </td>
                          <td className="p-2">{r.gender}</td>
                          <td className="p-2">
                            {r.min_age ?? 0}–{r.max_age ?? "∞"}
                          </td>
                          <td className="p-2 text-right flex justify-end gap-2">
                            {editing?.id === r.id ? (
                              <button
                                onClick={() => handleUpdate(r.id)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Save size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditing(r)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 text-sm">No ranges found</p>
                )}
              </>
            ) : (
              <p className="text-gray-400">Select a test to view ranges</p>
            )}
          </div>
        </div>
      </div>

      {/* ➕ Add Range Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[420px] relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowAddModal(false)}
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-lg font-semibold mb-3">Add New Range</h3>
            <form onSubmit={handleAddRange} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Range Type
                </label>
                <select
                  value={formData.range_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      range_type: e.target.value,
                    })
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="numeric">Numeric</option>
                  <option value="qualitative">Qualitative</option>
                </select>
              </div>

              {formData.range_type === "numeric" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm mb-1">Min</label>
                      <input
                        type="number"
                        value={formData.min_value}
                        onChange={(e) =>
                          setFormData({ ...formData, min_value: e.target.value })
                        }
                        className="w-full border rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Max</label>
                      <input
                        type="number"
                        value={formData.max_value}
                        onChange={(e) =>
                          setFormData({ ...formData, max_value: e.target.value })
                        }
                        className="w-full border rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm mb-1">
                    Qualitative Value
                  </label>
                  <input
                    type="text"
                    value={formData.qualitative_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        qualitative_value: e.target.value,
                      })
                    }
                    placeholder="e.g., Positive or Negative"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="Any">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Age Range</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      value={formData.min_age}
                      onChange={(e) =>
                        setFormData({ ...formData, min_age: e.target.value })
                      }
                      className="w-1/2 border rounded-md px-2 py-2 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={formData.max_age}
                      onChange={(e) =>
                        setFormData({ ...formData, max_age: e.target.value })
                      }
                      className="w-1/2 border rounded-md px-2 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 bg-purple-600 text-white text-sm px-3 py-1 rounded-md hover:bg-purple-700"
                >
                  <Save size={16} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabConfigRanges;
