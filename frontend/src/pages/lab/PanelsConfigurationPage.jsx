import React, { useEffect, useState } from "react";
import {
  Layers,
  PlusCircle,
  Pencil,
  Trash2,
  Save,
  XCircle,
  Beaker,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import labConfigService from "../../services/labConfigService";
import NormalRangesTab from "./NormalRangesTab";

/**
 * 🧪 PanelsConfigurationPage
 * -----------------------------------------------------------
 * Manages creation, editing, and configuration of test panels.
 * Allows adding/removing analytes and configuring analyte ranges.
 */
export default function PanelsConfigurationPage() {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token;

  const [panels, setPanels] = useState([]);
  const [analytes, setAnalytes] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelAnalytes, setPanelAnalytes] = useState([]);
  const [expandedAnalyte, setExpandedAnalyte] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
  });
  const [showForm, setShowForm] = useState(false);

  // =============================================================
  // 🧭 LOAD DATA
  // =============================================================
  useEffect(() => {
    loadPanels();
    loadAnalytes();
  }, []);

  const loadPanels = async () => {
    try {
      setLoading(true);
      const res = await labConfigService.getTestPanels(token);
      setPanels(res);
    } catch (err) {
      toast.error(err.message || "Failed to load panels");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytes = async () => {
    try {
      const res = await labConfigService.getAnalytes(token);
      setAnalytes(res);
    } catch (err) {
      toast.error(err.message || "Failed to load analytes");
    }
  };

  const loadPanelAnalytes = async (panelId) => {
    try {
      const res = await labConfigService.getAnalytesForPanel(panelId, token);
      setPanelAnalytes(res);
    } catch (err) {
      toast.error(err.message || "Failed to fetch panel analytes");
    }
  };

  // =============================================================
  // ✏️ FORM HANDLERS
  // =============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleNew = () => {
    setSelectedPanel(null);
    setFormData({ name: "", price: "" });
    setShowForm(true);
  };

  const handleEdit = (panel) => {
    setSelectedPanel(panel);
    setFormData({
      name: panel.name,
      price: panel.price || "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedPanel(null);
  };

  // =============================================================
  // 💾 SAVE / UPDATE PANEL
  // =============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Panel name is required");

    try {
      if (selectedPanel) {
        await labConfigService.updateTestPanel(selectedPanel.id, formData, token);
        toast.success("✅ Panel updated successfully");
      } else {
        await labConfigService.createTestPanel(formData, token);
        toast.success("✅ Panel created successfully");
      }
      setShowForm(false);
      loadPanels();
    } catch (err) {
      toast.error(err.message || "Failed to save panel");
    }
  };

  // =============================================================
  // 🗑️ DELETE PANEL
  // =============================================================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this panel?")) return;
    try {
      await labConfigService.deleteTestPanel(id, token);
      toast.success("🗑️ Deleted successfully");
      loadPanels();
    } catch (err) {
      toast.error(err.message || "Failed to delete panel");
    }
  };

  // =============================================================
  // 🔗 PANEL–ANALYTE LINKING
  // =============================================================
  const handleAddAnalyte = async (analyteId) => {
    if (!selectedPanel) return toast.error("Select a panel first");
    try {
      await labConfigService.addAnalyteToPanel(selectedPanel.id, analyteId, token);
      toast.success("✅ Analyte added");
      loadPanelAnalytes(selectedPanel.id);
    } catch (err) {
      toast.error(err.message || "Failed to add analyte");
    }
  };

  const handleRemoveAnalyte = async (analyteId) => {
    if (!selectedPanel) return;
    try {
      await labConfigService.removeAnalyteFromPanel(selectedPanel.id, analyteId, token);
      toast.success("🗑️ Analyte removed");
      loadPanelAnalytes(selectedPanel.id);
    } catch (err) {
      toast.error(err.message || "Failed to remove analyte");
    }
  };

  const handleSelectPanel = (panel) => {
    setSelectedPanel(panel);
    setExpandedAnalyte(null);
    loadPanelAnalytes(panel.id);
  };

  // =============================================================
  // 🔍 FILTERED PANELS
  // =============================================================
  const filteredPanels = panels.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // =============================================================
  // 🧠 UI
  // =============================================================
  return (
    <div className="p-5">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Layers size={20} /> Test Panels Configuration
        </h1>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search panel..."
            className="border rounded-lg px-3 py-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={loadPanels}
            className="flex items-center gap-1 bg-gray-100 border px-3 py-1 rounded-lg hover:bg-gray-200"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusCircle size={16} /> New
          </button>
        </div>
      </div>

      {/* PANEL FORM */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border"
        >
          <input
            type="text"
            name="name"
            placeholder="Panel Name"
            value={formData.name}
            onChange={handleChange}
            className="border rounded-lg p-2"
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            value={formData.price}
            onChange={handleChange}
            className="border rounded-lg p-2"
          />
          <div className="flex items-center gap-2 col-span-full">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save size={16} /> {selectedPanel ? "Update" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-3 py-2 border border-gray-400 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <XCircle size={16} /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* PANELS TABLE */}
      <div className="overflow-x-auto mb-10">
        {loading ? (
          <div className="italic text-gray-500">Loading...</div>
        ) : filteredPanels.length === 0 ? (
          <div className="italic text-gray-500">No panels found.</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Name</th>
                <th className="border p-2">Price</th>
                <th className="border p-2 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPanels.map((p) => (
                <tr
                  key={p.id}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedPanel?.id === p.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleSelectPanel(p)}
                >
                  <td className="border p-2">{p.name}</td>
                  <td className="border p-2 text-right">{p.price || 0}</td>
                  <td className="border p-2 flex justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(p);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PANEL ANALYTES SECTION */}
      {selectedPanel && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Beaker size={18} /> Analytes in {selectedPanel.name}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <select
              onChange={(e) => handleAddAnalyte(e.target.value)}
              className="border rounded-lg p-2"
              defaultValue=""
            >
              <option value="">➕ Add Analyte</option>
              {analytes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {panelAnalytes.length === 0 ? (
            <div className="text-gray-500 italic">No analytes in this panel yet.</div>
          ) : (
            <div className="space-y-2">
              {panelAnalytes.map((a) => (
                <div key={a.id} className="border rounded-lg">
                  <div className="flex justify-between items-center p-3 bg-gray-50">
                    <span className="font-medium">{a.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedAnalyte((prev) => (prev === a.id ? null : a.id))
                        }
                        className="flex items-center gap-1 text-gray-700 hover:text-blue-600"
                      >
                        {expandedAnalyte === a.id ? (
                          <>
                            <ChevronUp size={16} /> Hide Ranges
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} /> Configure Ranges
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRemoveAnalyte(a.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {expandedAnalyte === a.id && (
                    <div className="p-4 bg-white border-t">
                      <NormalRangesTab analyteId={a.id} token={token} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
