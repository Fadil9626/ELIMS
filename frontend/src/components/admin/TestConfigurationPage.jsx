import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  PlusCircle,
  FlaskConical,
  Activity,
  Settings,
} from "lucide-react";
import labConfigService from "../../services/labConfigService";

// =============================================================
// 🔐 TOKEN HELPER
// =============================================================
const getToken = () => {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return "";
    const parsed = raw.startsWith("{") ? JSON.parse(raw) : { token: raw };
    return parsed?.token || "";
  } catch {
    return "";
  }
};

// =============================================================
// 🔧 SMALL HELPERS
// =============================================================
const numOrNull = (v) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const cleanRangePayload = (data) => {
  const rangeType = data.range_type || "numeric";

  const base = {
    range_type: rangeType,
    gender: data.gender === "Any" ? null : data.gender || null,
    min_age: numOrNull(data.min_age),
    max_age: numOrNull(data.max_age),
    range_label: (data.range_label || "").trim() || null,
    symbol_operator: (data.symbol_operator || "").trim() || null,
  };

  if (rangeType === "numeric") {
    return {
      ...base,
      min_value: numOrNull(data.min_value),
      max_value: numOrNull(data.max_value),
      qualitative_value: null,
    };
  } else {
    return {
      ...base,
      min_value: null,
      max_value: null,
      qualitative_value: data.qualitative_value || null,
    };
  }
};

// =============================================================
// 🧩 MAIN COMPONENT
// =============================================================
const TestConfigurationPage = () => {
  const [panels, setPanels] = useState([]);
  const [allAnalytes, setAllAnalytes] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panelAnalytes, setPanelAnalytes] = useState([]);
  const [selectedAnalyte, setSelectedAnalyte] = useState(null);
  const [analyteRanges, setAnalyteRanges] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newRange, setNewRange] = useState({
    range_type: "numeric",
    min_age: "",
    max_age: "",
    gender: "Any",
    min_value: "",
    max_value: "",
    qualitative_value: "",
    symbol_operator: "",
    range_label: "",
  });

  // =============================================================
  // 📦 LOAD INITIAL DATA
  // =============================================================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const token = getToken();
        const [panelsData, analytesData] = await Promise.all([
          labConfigService.getTestPanels(token),
          labConfigService.getTests(token),
        ]);
        setPanels(panelsData || []);
        setAllAnalytes(analytesData || []);
      } catch (e) {
        console.error("❌ Load init failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // =============================================================
  // 🧬 PANEL → ANALYTE MANAGEMENT
  // =============================================================
  const handlePanelSelect = async (panel) => {
    setSelectedPanel(panel);
    setSelectedAnalyte(null);
    setAnalyteRanges([]);
    try {
      const token = getToken();
      const data = await labConfigService.getAnalytesForPanel(panel.id, token);
      setPanelAnalytes(data || []);
    } catch (e) {
      console.error("❌ Failed to load panel analytes:", e);
    }
  };

  const handleAddAnalyteToPanel = async (analyteId) => {
    if (!selectedPanel || !analyteId) return;
    try {
      const token = getToken();
      await labConfigService.addAnalyteToPanel(selectedPanel.id, Number(analyteId), token);
      await handlePanelSelect(selectedPanel);
    } catch (e) {
      console.error(e);
      alert("Failed to add analyte (maybe already added).");
    }
  };

  const handleRemoveAnalyteFromPanel = async (analyteId) => {
    if (!selectedPanel) return;
    if (!window.confirm("Remove this analyte from the panel?")) return;
    try {
      const token = getToken();
      await labConfigService.removeAnalyteFromPanel(selectedPanel.id, analyteId, token);
      await handlePanelSelect(selectedPanel);
      if (selectedAnalyte?.id === analyteId) {
        setSelectedAnalyte(null);
        setAnalyteRanges([]);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to remove analyte.");
    }
  };

  const addableAnalytes = useMemo(() => {
    const already = new Set(panelAnalytes.map((a) => a.id));
    return allAnalytes.filter((a) => !already.has(a.id));
  }, [panelAnalytes, allAnalytes]);

  // =============================================================
  // 🧪 RANGE MANAGEMENT
  // =============================================================
  const handleAnalyteSelect = async (analyte) => {
    setSelectedAnalyte(analyte);
    try {
      const token = getToken();
      const ranges = await labConfigService.getNormalRanges(analyte.id, token);
      setAnalyteRanges(ranges || []);
    } catch (e) {
      console.error("❌ Failed to load ranges:", e);
    }
  };

  const handleCreateRange = async (e) => {
    e.preventDefault();
    if (!selectedAnalyte) return;
    try {
      const token = getToken();
      const payload = cleanRangePayload(newRange);
      const created = await labConfigService.createNormalRange(selectedAnalyte.id, payload, token);
      setAnalyteRanges((prev) => [...prev, created]);
      setNewRange({
        range_type: "numeric",
        min_age: "",
        max_age: "",
        gender: "Any",
        min_value: "",
        max_value: "",
        qualitative_value: "",
        symbol_operator: "",
        range_label: "",
      });
    } catch (e) {
      console.error(e);
      alert("Failed to add normal range.");
    }
  };

  const handleDeleteRange = async (rangeId) => {
    if (!window.confirm("Delete this range?")) return;
    try {
      const token = getToken();
      await labConfigService.deleteNormalRange(rangeId, token);
      setAnalyteRanges((prev) => prev.filter((r) => r.id !== rangeId));
    } catch (e) {
      console.error(e);
      alert("Failed to delete range.");
    }
  };

  // =============================================================
  // 🖼️ UI
  // =============================================================
  if (loading) {
    return <div className="text-center mt-10 text-gray-600">Loading Lab Configuration...</div>;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Panels */}
        <motion.div className="bg-white rounded-2xl shadow p-4 border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Test Panels
          </h3>
          <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
            {panels.map((panel) => (
              <li key={panel.id}>
                <button
                  onClick={() => handlePanelSelect(panel)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition ${
                    selectedPanel?.id === panel.id
                      ? "bg-blue-600 text-white font-medium"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {panel.name}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Analytes */}
        <motion.div className="bg-white rounded-2xl shadow p-4 border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Analytes {selectedPanel && <span className="text-gray-500">({selectedPanel.name})</span>}
          </h3>
          {selectedPanel ? (
            <>
              <select
                onChange={(e) => e.target.value && handleAddAnalyteToPanel(e.target.value)}
                className="w-full p-2 border rounded-md mb-4"
                value=""
              >
                <option value="">Add an analyte...</option>
                {addableAnalytes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
                {panelAnalytes.map((analyte) => (
                  <li
                    key={analyte.id}
                    className={`flex justify-between items-center p-2 rounded-md ${
                      selectedAnalyte?.id === analyte.id
                        ? "bg-green-50 border border-green-300"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <button onClick={() => handleAnalyteSelect(analyte)} className="text-left w-full">
                      {analyte.name}
                    </button>
                    <button
                      onClick={() => handleRemoveAnalyteFromPanel(analyte.id)}
                      className="text-red-500 hover:text-red-700 font-bold ml-3"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-gray-500">Select a panel to view analytes.</p>
          )}
        </motion.div>

        {/* Ranges */}
        <motion.div className="bg-white rounded-2xl shadow p-4 border">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            Normal Ranges{" "}
            {selectedAnalyte && <span className="text-gray-500">({selectedAnalyte.name})</span>}
          </h3>

          {selectedAnalyte ? (
            <>
              <form
                onSubmit={handleCreateRange}
                className="space-y-3 bg-gray-50 rounded-md p-3 border border-gray-200 mb-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Range Type</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newRange.range_type}
                      onChange={(e) => setNewRange((s) => ({ ...s, range_type: e.target.value }))}
                    >
                      <option value="numeric">Numeric</option>
                      <option value="qualitative">Qualitative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Gender</label>
                    <select
                      className="w-full border rounded p-2"
                      value={newRange.gender}
                      onChange={(e) => setNewRange((s) => ({ ...s, gender: e.target.value }))}
                    >
                      <option value="Any">Any</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Label</label>
                    <input
                      className="w-full border rounded p-2"
                      value={newRange.range_label}
                      onChange={(e) => setNewRange((s) => ({ ...s, range_label: e.target.value }))}
                      placeholder="e.g., Adult"
                    />
                  </div>
                </div>

                {/* Age */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Age</label>
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={newRange.min_age}
                      onChange={(e) => setNewRange((s) => ({ ...s, min_age: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Max Age</label>
                    <input
                      type="number"
                      className="w-full border rounded p-2"
                      value={newRange.max_age}
                      onChange={(e) => setNewRange((s) => ({ ...s, max_age: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Numeric vs Qualitative */}
                {newRange.range_type === "numeric" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Value</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded p-2"
                        value={newRange.min_value}
                        onChange={(e) =>
                          setNewRange((s) => ({ ...s, min_value: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Value</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded p-2"
                        value={newRange.max_value}
                        onChange={(e) =>
                          setNewRange((s) => ({ ...s, max_value: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Symbol</label>
                      <input
                        className="w-full border rounded p-2"
                        placeholder="≤ / ≥"
                        value={newRange.symbol_operator}
                        onChange={(e) =>
                          setNewRange((s) => ({ ...s, symbol_operator: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Qualitative Value
                    </label>
                    <select
                      className="w-full border rounded p-2"
                      value={newRange.qualitative_value}
                      onChange={(e) =>
                        setNewRange((s) => ({ ...s, qualitative_value: e.target.value }))
                      }
                    >
                      <option value="">Select...</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Non-Reactive">Non-Reactive</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Add Range
                </button>
              </form>

              {/* Range List */}
              <ul className="space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                {analyteRanges.length === 0 && (
                  <li className="text-gray-500">No ranges yet. Add one above.</li>
                )}
                {analyteRanges.map((range) => {
                  const rt = (range.range_type || "numeric").toLowerCase();
                  const label =
                    rt === "numeric"
                      ? `${range.min_value ?? ""}–${range.max_value ?? ""}`
                      : range.qualitative_value || "Qualitative";
                  return (
                    <li
                      key={range.id}
                      className="flex items-center justify-between bg-gray-50 rounded-md p-2 border"
                    >
                      <span>
                        {range.gender || "Any"}: <strong>{label}</strong>
                      </span>
                      <button
                        onClick={() => handleDeleteRange(range.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-gray-500">Select an analyte to manage ranges.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TestConfigurationPage;
