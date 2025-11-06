import React, { useState, useEffect } from "react";
import {
  Layers,
  PlusCircle,
  Pencil,
  Trash2,
  FlaskConical,
  XCircle,
  Save,
  Search,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";

const TestPanelsManager = () => {
  // Specify types for state
  const [panels, setPanels] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allAnalytes, setAllAnalytes] = useState<any[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<any | null>(null);
  const [panelAnalytes, setPanelAnalytes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [analyteSearch, setAnalyteSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department_id: "",
    price: "",
  });

  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

  // ============================================================
  // 📡 Fetch Panels, Departments, and Analytes
  // ============================================================
  const fetchData = async () => {
    if (!token) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [panelsResponse, analytesResponse, deptResponse] = await Promise.all([
        // ✅ FIX: Pass the token to all functions
        labConfigService.getPanels(token),
        // ✅ FIX: Use correct function name 'getAllTests' and pass token
        labConfigService.getAllTests(token),
        labConfigService.getDepartments(token),
      ]);

      // Safely extract arrays from API responses (e.g., if API returns {data: [...]})
      const panelsData = panelsResponse?.data || (Array.isArray(panelsResponse) ? panelsResponse : []);
      const analytesData = analytesResponse?.data || (Array.isArray(analytesResponse) ? analytesResponse : []);
      const deptData = deptResponse?.data || (Array.isArray(deptResponse) ? deptResponse : []);

      // ✅ Filter out analytes that are actually panels
      const cleanedAnalytes = (analytesData || []).filter(
        (a: any) =>
          !panelsData.some(
            (p: any) => p.name?.toLowerCase() === a.name?.toLowerCase()
          ) && a.is_panel !== true
      );

      setPanels(panelsData || []);
      setAllAnalytes(cleanedAnalytes || []);
      setDepartments(deptData || []);
    } catch (err: any) {
      console.error("❌ Failed to load data:", err);
      toast.error(`Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Add token as dependency

  // ============================================================
  // 🧠 Select Panel
  // ============================================================
  const handleSelectPanel = async (panel: any) => {
    setSelectedPanel(panel);
    setPanelAnalytes([]);
    setAnalyteSearch("");
    if (!token) return toast.error("Session expired. Please log in.");
    try {
      // ✅ FIX: Use correct function name 'getAnalytesForPanel' and pass token
      const response = await labConfigService.getAnalytesForPanel(panel.id, token);
      const data = response?.data || (Array.isArray(response) ? response : []);
      setPanelAnalytes(data || []);
    } catch (err: any) {
      console.error("❌ Failed to load analytes:", err);
      toast.error(`Failed to load analytes: ${err.message}`);
    }
  };

  // ============================================================
  // 💾 Save Panel (Add/Edit)
  // ============================================================
  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Panel name is required.");
    if (!formData.department_id) return toast.error("Select a department.");
    if (!formData.price) return toast.error("Price is required.");
    if (!token) return toast.error("Session expired. Please log in.");

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        department_id: formData.department_id,
        price: parseFloat(formData.price),
      };

      if (editingPanel) {
        // ✅ FIX: Use 'updateTestPanel' and pass token
        await labConfigService.updateTestPanel(editingPanel.id, payload, token);
        toast.success("Panel updated successfully");
      } else {
        // ✅ FIX: Pass token
        await labConfigService.createPanel(payload, token);
        toast.success("Panel created successfully");
      }

      setShowModal(false);
      setEditingPanel(null);
      setFormData({ name: "", description: "", department_id: "", price: "" });
      fetchData();
    } catch (err: any) {
      console.error("❌ Save error:", err);
      toast.error(`Failed to save panel: ${err.message}`);
    }
  };

  // ============================================================
  // 🗑️ Delete Panel
  // ============================================================
  const handleDeletePanel = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this panel?")) return;
    if (!token) return toast.error("Session expired. Please log in.");
    try {
      // ✅ FIX: Use correct function name 'deleteTestPanel'
      await labConfigService.deleteTestPanel(id, token);
      toast.success("Panel deleted");
      setSelectedPanel(null);
      setPanelAnalytes([]);
      fetchData();
    } catch (err: any) {
      console.error("❌ Delete error:", err);
      toast.error(`Failed to delete panel: ${err.message}`);
    }
  };

  // ============================================================
  // ➕ Add / Remove Analytes
  // ============================================================
  const handleAddAnalyte = async (analyteId: string) => {
    if (!selectedPanel || !analyteId) return;
    if (!token) return toast.error("Session expired. Please log in.");
    try {
      // ✅ FIX: Use correct function name 'addAnalyteToPanel' and pass token
      await labConfigService.addAnalyteToPanel(
        selectedPanel.id,
        parseInt(analyteId),
        token
      );
      toast.success("Analyte added!");
      handleSelectPanel(selectedPanel);
    } catch (err: any) {
      console.error("❌ Add analyte error:", err);
      toast.error(`Failed to add analyte: ${err.message}`);
    }
  };

  const handleRemoveAnalyte = async (analyteId: number) => {
    if (!selectedPanel) return;
    if (!window.confirm("Remove this analyte from the panel?")) return;
    if (!token) return toast.error("Session expired. Please log in.");
    try {
      // ✅ FIX: Use correct function name 'removeAnalyteFromPanel' and pass token
      await labConfigService.removeAnalyteFromPanel(
        selectedPanel.id,
        analyteId,
        token
      );
      toast.success("Analyte removed");
      handleSelectPanel(selectedPanel);
    } catch (err: any) {
      console.error("❌ Remove analyte error:", err);
      toast.error(`Failed to remove analyte: ${err.message}`);
    }
  };

  // ============================================================
  // 🔍 Filters
  // ============================================================
  const filteredPanels = panels.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const panelAnalyteIds = new Set(panelAnalytes.map((a) => a.id));

  const filteredAnalytes = allAnalytes.filter((a) => {
    const name = a?.name || a?.test_name;
    if (!name) return false;
    const matches = name.toLowerCase().includes(analyteSearch.toLowerCase());
    const notLinked = !panelAnalyteIds.has(a.id);
    return matches && notLinked;
  });

  // ============================================================
  // 🧩 UI
  // ============================================================
  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* LEFT — Panels */}
      <motion.div
        className="bg-white rounded-2xl shadow p-4 border"
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="text-blue-600 w-5 h-5" /> Test Panels
          </h3>
          <button
            onClick={() => {
              setEditingPanel(null);
              setFormData({
                name: "",
                description: "",
                department_id: "",
                price: "",
              });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4" /> Add
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search panels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-md pl-8 pr-2 py-1.5 text-sm"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-2.5 text-gray-400"
              onClick={() => setSearchTerm("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <ul className="max-h-[70vh] overflow-y-auto divide-y">
          {filteredPanels.map((panel) => (
            <li
              key={panel.id}
              className={`flex flex-col justify-between p-2 rounded-md transition ${
                selectedPanel?.id === panel.id
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-50"
              }`}
            >
              <button
                onClick={() => handleSelectPanel(panel)}
                className="text-left font-medium"
              >
                {panel.name}
              </button>
              {panel.department_name && (
                <span className="text-xs opacity-80">
                  Dept: {panel.department_name}
                </span>
              )}
              <div className="flex items-center gap-2 opacity-80 mt-1">
                <button
                  onClick={() => {
                    setEditingPanel(panel);
                    setFormData({
                      name: panel.name,
                      description: panel.description || "",
                      department_id: panel.department_id || "",
                      price: panel.price || "",
                    });
                    setShowModal(true);
                  }}
                  title="Edit"
                  className="hover:text-yellow-500"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeletePanel(panel.id)}
                  title="Delete"
                  className="hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* RIGHT — Analytes */}
      <motion.div
        className={`bg-white rounded-2xl shadow p-4 border ${
          !selectedPanel ? "opacity-50 pointer-events-none" : ""
        }`}
        whileHover={{ scale: 1.01 }}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <FlaskConical className="text-green-600 w-5 h-5" /> Analytes{" "}
          {selectedPanel && (
            <span className="text-gray-500">({selectedPanel.name})</span>
          )}
        </h3>

        {selectedPanel && (
          <>
            <div className="relative">
              <input
                type="text"
                placeholder="Search analytes..."
                value={analyteSearch}
                onChange={(e) => setAnalyteSearch(e.target.value)}
                className="w-full border rounded-md mb-2 p-2 text-sm pr-8"
              />
              {analyteSearch && (
                <button
                  className="absolute right-2 top-2.5 text-gray-400"
                  onClick={() => setAnalyteSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              onChange={(e) => handleAddAnalyte(e.target.value)}
              value=""
              className="w-full border rounded-md p-2 mb-3 text-sm"
            >
              <option value="">Select an analyte to add...</option>
              {filteredAnalytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.test_name}
                </option>
              ))}
            </select>

            <ul className="space-y-1 max-h-[60vh] overflow-y-auto border rounded-md p-2">
              {panelAnalytes.map((a) => (
                <li
                  key={a.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded-md hover:bg-gray-100"
                >
                  <span>{a.name || a.test_name}</span>
                  <button
                    onClick={() => handleRemoveAnalyte(a.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.div>

      {/* MODAL */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
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
                <Layers className="text-blue-600" />
                {editingPanel ? "Edit Panel" : "Add New Panel"}
              </h3>

              <form onSubmit={handleSavePanel} className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Panel Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full border rounded-md p-2 mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Department *
                  </label>
                  <input
                    type="text"
                    placeholder="Type to search department..."
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="w-full border rounded-md p-2 mb-2 text-sm"
                  />
                  <div className="border rounded-md max-h-32 overflow-y-auto">
                    {filteredDepartments.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setFormData({ ...formData, department_id: d.id });
                          setDeptSearch(d.name);
                        }}
                        className={`px-2 py-1 cursor-pointer hover:bg-blue-100 ${
                          formData.department_id === d.id ? "bg-blue-200" : ""
                        }`}
                      >
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Price *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full border rounded-md p-2 mt-1"
                    placeholder="Enter panel price"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="w-full border rounded-md p-2 mt-1"
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

export default TestPanelsManager;