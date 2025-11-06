import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { PlusCircle, FlaskConical, Activity, Settings } from "lucide-react";
import labConfigService from "../../services/labConfigService";
import toast from "react-hot-toast";

// =============================================================
// 🔧 HELPERS
// =============================================================
const numOrNull = (v: any) => {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const cleanRangePayload = (data: any) => {
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
  const [panels, setPanels] = useState<any[]>([]);
  const [allAnalytes, setAllAnalytes] = useState<any[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<any | null>(null);
  const [panelAnalytes, setPanelAnalytes] = useState<any[]>([]);
  const [selectedAnalyte, setSelectedAnalyte] = useState<any | null>(null);
  const [analyteRanges, setAnalyteRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [newRange, setNewRange] = useState<any>({
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

  // ✅ FIX: Get the token
  const token = JSON.parse(localStorage.getItem("userInfo") || "{}")?.token;

  // =============================================================
  // 📦 LOAD INITIAL DATA
  // =============================================================
  useEffect(() => {
    // ✅ FIX: Check for token first
    if (!token) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const [panelsResponse, analytesResponse] = await Promise.all([
          // ✅ FIX: Pass token
          labConfigService.getPanels(token),
          // ✅ FIX: Use correct function name 'getAllTests' and pass token
          labConfigService.getAllTests(token), 
        ]);
        
        // ✅ FIX: Safely extract arrays from API responses
        const panelsData = panelsResponse?.data || (Array.isArray(panelsResponse) ? panelsResponse : []);
        const analytesData = analytesResponse?.data || (Array.isArray(analytesResponse) ? analytesResponse : []);

        setPanels(panelsData);
        setAllAnalytes(analytesData);
      } catch (e: any) {
        console.error("❌ Load init failed:", e);
        toast.error(`Failed to load lab configuration: ${e.message}`);
        setPanels([]); // Set to empty array on fail
        setAllAnalytes([]); // Set to empty array on fail
      } finally {
        setLoading(false);
      }
    })();
    // ✅ FIX: Add token as dependency
  }, [token]);

  // =============================================================
  // 🧬 PANEL → ANALYTE MANAGEMENT
  // =============================================================
  const handlePanelSelect = async (panel: any) => {
    setSelectedPanel(panel);
    setSelectedAnalyte(null);
    setAnalyteRanges([]);
    if (!token) return toast.error("Session expired"); // ✅ FIX: Token check
      try {
      // ✅ FIX: Use correct function name 'getAnalytesForPanel' and pass token
      const response = await labConfigService.getAnalytesForPanel(panel.id, token);
      // ✅ FIX: Safely extract array (handle both direct array responses and { data: [...] } responses)
      const data = (Array.isArray(response) ? response : (response as any)?.data) || [];
      setPanelAnalytes(data);
    } catch (e: any) {
      console.error("❌ Failed to load panel analytes:", e);
      toast.error(`Failed to load panel analytes: ${e.message}`);
      setPanelAnalytes([]); // Set to empty array on fail
    }
  };

  const handleAddAnalyteToPanel = async (analyteId: string) => {
    if (!selectedPanel || !analyteId) return;
    if (!token) return toast.error("Session expired"); // ✅ FIX: Token check
    try {
      // ✅ FIX: Use correct function name 'addAnalyteToPanel' and pass token
      await labConfigService.addAnalyteToPanel(selectedPanel.id, Number(analyteId), token);
      await handlePanelSelect(selectedPanel);
      toast.success("Analyte added to panel");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to add analyte: ${e.message}`);
    }
  };

  const handleRemoveAnalyteFromPanel = async (analyteId: number) => {
    if (!selectedPanel) return;
    if (!window.confirm("Remove this analyte from the panel?")) return;
    if (!token) return toast.error("Session expired"); // ✅ FIX: Token check
    try {
      // ✅ FIX: Use correct function name 'removeAnalyteFromPanel' and pass token
      await labConfigService.removeAnalyteFromPanel(selectedPanel.id, analyteId, token);
      await handlePanelSelect(selectedPanel);
      if (selectedAnalyte?.id === analyteId) {
        setSelectedAnalyte(null);
        setAnalyteRanges([]);
      }
      toast.success("Analyte removed from panel");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to remove analyte: ${e.message}`);
    }
  };

  const addableAnalytes = useMemo(() => {
    // ✅ FIX: Add guards to prevent .map crash
    if (!Array.isArray(panelAnalytes) || !Array.isArray(allAnalytes)) return [];
    const already = new Set(panelAnalytes.map((a) => a.id));
    return allAnalytes.filter((a) => !already.has(a.id));
  }, [panelAnalytes, allAnalytes]);

  // =============================================================
  // 🧪 RANGE MANAGEMENT
  // =============================================================
  const handleAnalyteSelect = async (analyte: any) => {
    setSelectedAnalyte(analyte);
    if (!token) return toast.error("Session expired"); // ✅ FIX: Token check
    try {
      // ✅ FIX: Pass token and safely extract array
      const response = await labConfigService.getNormalRanges(analyte.id, token);
      const ranges = Array.isArray(response) ? response : (response as any)?.data || [];
      setAnalyteRanges(ranges);
    } catch (e: any) {
      console.error("❌ Failed to load ranges:", e);
      toast.error(`Failed to load ranges: ${e.message}`);
      setAnalyteRanges([]); // Set to empty array on fail
    }
  };

  const handleCreateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnalyte || !token) return; // ✅ FIX: Token check
    try {
      const payload = cleanRangePayload(newRange);
      // ✅ FIX: Pass token
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
      toast.success("Range added");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to add range: ${e.message}`);
    }
  };

  const handleDeleteRange = async (rangeId: number) => {
    if (!window.confirm("Delete this range?")) return;
    if (!token) return toast.error("Session expired"); // ✅ FIX: Token check
    try {
      // ✅ FIX: Pass token
      await (labConfigService as any).deleteNormalRange(rangeId, token);
      setAnalyteRanges((prev) => prev.filter((r) => r.id !== rangeId));
      toast.success("Range deleted");
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to delete range: ${e.message}`);
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
            {/* ✅ FIX: Add guard to prevent .map crash */}
            {Array.isArray(panels) && panels.map((panel) => (
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
                {/* ✅ FIX: Add guard */}
                {Array.isArray(addableAnalytes) && addableAnalytes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
                {/* ✅ FIX: Add guard */}
                {Array.isArray(panelAnalytes) && panelAnalytes.map((analyte) => (
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
              {/* Add Range Form */}
              <form
                onSubmit={handleCreateRange}
                className="space-y-3 bg-gray-50 rounded-md p-3 border border-gray-200 mb-4"
              >
                {/* Top Inputs */}
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

                {/* Age Fields */}
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

                {/* Numeric / Qualitative */}
                {newRange.range_type === "numeric" ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Value</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded p-2"
                        value={newRange.min_value}
                        onChange={(e) => setNewRange((s) => ({ ...s, min_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Value</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full border rounded p-2"
                        value={newRange.max_value}
                        onChange={(e) => setNewRange((s) => ({ ...s, max_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Symbol</label>
                      <input
                        className="w-full border rounded p-2"
                        placeholder="≤ / ≥"
                        value={newRange.symbol_operator}
                        onChange={(e) => setNewRange((s) => ({ ...s, symbol_operator: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Qualitative Value</label>
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
                {/* ✅ FIX: Add guard */}
                {Array.isArray(analyteRanges) && analyteRanges.length === 0 && (
                  <li className="text-gray-500">No ranges yet. Add one above.</li>
                )}
                {/* ✅ FIX: Add guard */}
                {Array.isArray(analyteRanges) && analyteRanges.map((range) => {
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