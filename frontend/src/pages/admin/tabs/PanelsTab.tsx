import React, { useState, useEffect, useMemo, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  FlaskConical,
  Activity,
  PlusCircle,
  Trash2,
  Pencil,
  Save,
  XCircle,
  SlidersHorizontal,
  Search,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import labConfigService from "../../../services/labConfigService";

// ============================================================
// 🔐 Get Token
// ============================================================
const getToken = () => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return "";
    const parsed = raw.startsWith("{") ? JSON.parse(raw) : { token: raw };
    return parsed?.token || parsed?.me?.token || "";
  } catch {
    return "";
  }
};

// ============================================================
// 🧩 PanelsTab Component
// ============================================================
const PanelsTab = () => {
  const navigate = useNavigate();
  const token = getToken();

  const [panels, setPanels] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<any | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; department_id: number | null }>({ name: "", description: "", department_id: null });

  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [allAnalytes, setAllAnalytes] = useState<any[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<any | null>(null);
  const [panelAnalytes, setPanelAnalytes] = useState<any[]>([]);

  // ============================================================
  // 📦 Load Data
  // ============================================================
  const loadData = async () => {
    if (!token) return toast.error("Not authenticated");
    try {
      const [panelsRes, analytesRes, deptRes] = await Promise.all([
        labConfigService.getTestPanels(token),
        labConfigService.getAnalytes(token),
        labConfigService.getDepartments(token),
      ]);
      setPanels(panelsRes?.data || panelsRes || []);
      setAllAnalytes(analytesRes?.data || analytesRes || []);
      setDepartments(deptRes?.data || deptRes || []);
    } catch (err) {
      toast.error(`❌ Failed to load data: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // ============================================================
  // 🧱 CRUD: Panels
  // ============================================================
  const openAdd = () => {
    setEditingPanel(null);
    setForm({ name: "", description: "", department_id: null });
    setShowModal(true);
  };

  const openEdit = (panel) => {
    setEditingPanel(panel);
    setForm({
      name: panel.name,
      description: panel.description || "",
      department_id: panel.department_id || null,
    });
    setShowModal(true);
  };

  const handleSavePanel = async (e) => {
    e.preventDefault();
    try {
      if (editingPanel) {
        await labConfigService.updateTestPanel(editingPanel.id, form, token);
        toast.success("✅ Panel updated");
      } else {
        await labConfigService.createTestPanel(form, token);
        toast.success("✅ Panel created");
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      toast.error(`❌ Save failed: ${err.message}`);
    }
  };

  const handleDeletePanel = async (id) => {
    if (!window.confirm("Delete this panel?")) return;
    try {
      await labConfigService.deleteTestPanel(id, token);
      toast.success("🗑️ Panel deleted");
      setSelectedPanel(null);
      loadData();
    } catch (err) {
      toast.error(`❌ Delete failed: ${err.message}`);
    }
  };

  // ============================================================
  // 🔍 Search & Filter
  // ============================================================
  const filteredPanels = useMemo(() => {
    let result = panels;
    if (departmentFilter)
      result = result.filter((p) => p.department_id === Number(departmentFilter));
    if (searchTerm)
      result = result.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return result;
  }, [panels, searchTerm, departmentFilter]);

  // ============================================================
  // 🔗 Panel ↔ Analyte Linking
  // ============================================================
  const handlePanelSelect = async (panel) => {
    setSelectedPanel(panel);
    try {
      const response = await labConfigService.getAnalytesForPanel(panel.id, token);
      setPanelAnalytes(response?.data || response || []);
    } catch (err) {
      toast.error(`❌ Failed to fetch analytes: ${err.message}`);
      setPanelAnalytes([]);
    }
  };

  const handleAddAnalyteToPanel = async (analyteId) => {
    if (!selectedPanel) return;
    try {
      await labConfigService.addAnalyteToPanel(selectedPanel.id, Number(analyteId), token);
      toast.success("✅ Added to panel");
      handlePanelSelect(selectedPanel);
    } catch (err) {
      toast.error(`❌ Add failed: ${err.message}`);
    }
  };

  const handleRemoveAnalyteFromPanel = async (analyteId) => {
    if (!selectedPanel) return;
    if (!window.confirm("Remove this analyte?")) return;
    try {
      await labConfigService.removeAnalyteFromPanel(selectedPanel.id, analyteId, token);
      toast.success("🗑️ Removed from panel");
      handlePanelSelect(selectedPanel);
    } catch (err) {
      toast.error(`❌ Remove failed: ${err.message}`);
    }
  };

  const addableAnalytes = useMemo(() => {
    const existing = new Set(panelAnalytes.map((a) => a.id));
    return allAnalytes.filter((a) => !existing.has(a.id));
  }, [panelAnalytes, allAnalytes]);

  // ============================================================
  // 🖥️ Render
  // ============================================================
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 🧩 PANELS */}
      <motion.div className="bg-white rounded-xl p-4 border shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Panels
          </h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 bg-blue-600 text-white text-sm px-2 py-1 rounded-md hover:bg-blue-700"
          >
            <PlusCircle size={14} /> Add
          </button>
        </div>

        {/* 🔍 Search + Filter */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search panels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 border rounded-md text-sm"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <select
              className="pl-7 pr-2 py-1.5 border rounded-md text-sm"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filteredPanels.length ? (
            filteredPanels.map((p) => (
              <li
                key={p.id}
                className={`flex justify-between items-center px-3 py-2 rounded-md ${
                  selectedPanel?.id === p.id
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => handlePanelSelect(p)}
                  className="flex-1 text-left truncate"
                >
                  {p.name}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeletePanel(p.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="text-center text-gray-400 py-3">No panels found.</li>
          )}
        </ul>
      </motion.div>

      {/* 🔗 ANALYTES */}
      <motion.div className="bg-white rounded-xl p-4 border shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-green-700 flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-600" /> Analytes{" "}
          {selectedPanel && (
            <span className="text-gray-500">({selectedPanel.name})</span>
          )}
        </h3>

        {selectedPanel ? (
          <>
            <select
              onChange={(e) =>
                e.target.value && handleAddAnalyteToPanel(Number(e.target.value))
              }
              value=""
              className="w-full p-2 border rounded-md mb-3 text-sm"
            >
              <option value="">Add analyte...</option>
              {addableAnalytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <ul className="space-y-1">
              {panelAnalytes.map((a) => (
                <li
                  key={a.id}
                  className={`flex justify-between items-center p-2 border rounded-md ${
                    selectedPanel?.id === a.id ? "bg-green-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span>{a.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/lab-config/ranges/${a.id}`)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveAnalyteFromPanel(a.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-gray-500 text-sm">Select a panel to view analytes.</p>
        )}
      </motion.div>

      {/* 🧱 ADD/EDIT MODAL */}
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
              {editingPanel ? "Edit Panel" : "Add Panel"}
            </h3>
            <form onSubmit={handleSavePanel} className="space-y-3">
              <input
                placeholder="Panel Name"
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
              />
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.department_id || ""}
                onChange={(e) =>
                  setForm({ ...form, department_id: Number(e.target.value) || null })
                }
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

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

export default PanelsTab;
