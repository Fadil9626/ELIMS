import React, { useEffect, useState, Fragment, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Wand2,
  ShieldCheck,
  Save, // Added Save icon
} from "lucide-react";
import pathologistService from "../../services/pathologistService";
import { useSocket } from "../../context/SocketContext"; // ⚡ Import useSocket

// =============================================================
// 🧪 Result Entry Page (Enhanced with Qualitative, Flags, Panels, Verify)
// =============================================================
const ResultEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket(); // ⚡ Get socket instance

  const [template, setTemplate] = useState({ request_id: 0, items: [] });
  const [results, setResults] = useState({});
  const [initialResults, setInitialResults] = useState({}); // ✅ Store initial state
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token || null;
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const userRole = userInfo?.user?.role_name?.toLowerCase?.() || "";

  // =============================================================
  // 📡 Load Data (as a useCallback)
  // =============================================================
  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pathologistService.getResultTemplate(token, id);
      if (!res?.items?.length) {
        toast.error("No tests found for this request.");
        return res; // Return data even if empty
      }

      setTemplate(res);

      // Initialize results
      const initial = {};
      res.items.forEach((t) => {
        initial[`${t.request_item_id}_${t.test_id}`] = t.result_value || "";
        if (t.is_panel && t.analytes) {
          t.analytes.forEach(
            (a) =>
              (initial[`${a.request_item_id}_${a.test_id}`] =
                a.result_value || "")
          );
        }
      });
      
      setResults(initial);
      setInitialResults(initial); // ✅ Save initial state for comparison

      // Auto-expand all departments
      const expandMap = {};
      res.items.forEach((t) => (expandMap[t.department_name] = true));
      setExpandedGroups(expandMap);
      setError(null);
      return res; // Return data for use in handleSaveAll
    } catch (e) {
      console.error("❌ Load error:", e);
      setError(e?.message || "Failed to load result entry data.");
      return { items: [] };
    } finally {
      setLoading(false);
    }
  }, [id, token]); // Dependencies

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]); // Runs on mount

  // =============================================================
  // 💾 Save All Results (FIXED - ADDED PARENT STATUS SYNC)
  // =============================================================
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      // Only save results that have changed and are not empty after trimming
      const entries = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId] = k.split("_");
          return { reqItemId, result: v, key: k };
        })
        .filter(
          (e) => e.result && String(e.result).trim() !== "" && e.result !== initialResults[e.key]
        );

      if (!entries.length) {
        toast.error("No *new* results to save.");
        return;
      }

      // 1. Submit results for all changed analytes
      for (const entry of entries) {
        await pathologistService.submitResult(
          token,
          entry.reqItemId,
          entry.result
        );
      }

      toast.success("All changes saved successfully. Checking panel completion...");

      // 2. REFRESH data in-place to get the new status of all analytes
      const updatedTemplate = await loadTemplate();

      // 3. Check for panel completion and update status
      for (const item of updatedTemplate.items) {
        // Only process panels that are not already verified/released
        if (
          item.is_panel &&
          item.analytes &&
          item.status !== "Verified" &&
          item.status !== "Released"
        ) {
          const allAnalytesHaveResults = item.analytes.every(
            (a) => a.result_value && String(a.result_value).trim() !== ""
          );

          if (allAnalytesHaveResults && item.status !== "Completed") {
            // 🟢 FIX: Use the dedicated item status update function here
            await pathologistService.updateRequestItemStatus(
              item.request_item_id, // Pass the item ID of the parent panel
              "Completed",
              token
            );
            toast.success(`${item.test_name} set to Completed (Ready for Review).`);
          }
        }
      }

      // Re-load to update the state immediately after parent status change
      await loadTemplate();
      
      // ⚡ Emit socket events to update other pages
      if (socket) {
        socket.emit("test_status_updated", {
          request_id: template.request_id,
        });
        socket.emit("result_saved", {
          request_id: template.request_id,
        });
      }

    } catch (e) {
      console.error("❌ Save error:", e);
      toast.error(e?.message || "Failed to save results.");
    } finally {
      setSaving(false);
    }
  };

  // =============================================================
  // ✅ Verify All Results (No Reload)
  // =============================================================
  const handleVerifyAll = async () => {
    if (!["pathologist", "superadmin"].includes(userRole)) {
      toast.error("You don’t have permission to verify results.");
      return;
    }

    try {
      setVerifying(true);
      const entries = Object.entries(results);
      for (const [k] of entries) {
        const [reqItemId] = k.split("_");
        // We only verify items that have results
        if (results[k]) {
          await pathologistService.verifyResult(token, reqItemId);
        }
      }
      toast.success("All results verified successfully.");
      
      // ✅ REFRESH data in-place instead of reloading page
      await loadTemplate();

      // ⚡ Emit socket event to update other pages
      if (socket) {
        socket.emit("test_status_updated", {
          request_id: template.request_id,
        });
      }
    } catch (e) {
      console.error("❌ Verify error:", e);
      toast.error(e?.message || "Failed to verify results.");
    } finally {
      setVerifying(false);
    }
  };

  // =============================================================
  // ⚡ Quick Apply Normal
  // =============================================================
  const handleQuickApplyNormal = (panel) => {
    const updates = {};
    panel.analytes.forEach((a) => {
      if (a.type === "qualitative" && a.qualitative_values?.length) {
        const normal =
          a.qualitative_values.find((v) =>
            /(negative|non-reactive|normal)/i.test(v)
          ) || a.qualitative_values[0];
        updates[`${a.request_item_id}_${a.test_id}`] = normal;
      }
    });
    setResults((prev) => ({ ...prev, ...updates }));
    toast.success(`Applied “Normal” for ${panel.test_name}`);
  };

  // =============================================================
  // 🎨 Flag Color
  // =============================================================
  const getFlagColor = (flag) => {
    switch (flag) {
      case "H":
        return "text-red-600 font-semibold";
      case "L":
        return "text-blue-600 font-semibold";
      case "A":
        return "text-orange-600 font-semibold";
      case "R":
        return "text-red-700 font-semibold"; // Reactive
      case "N":
        return "text-black font-semibold";
      default:
        return "text-gray-500";
    }
  };

  if (loading && !template.items.length) // Only show full pulse on first load
    return (
      <div className="p-6 text-gray-500 animate-pulse">Loading template...</div>
    );

  if (error)
    return (
      <div className="p-6 text-red-600 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );

  // Group by department
  const grouped = template.items.reduce((acc, t) => {
    const key = t.department_name || "General";
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {});

  // =============================================================
  // 🧩 Render
  // =============================================================
  return (
    <div className="p-6 bg-gray-50 min-h-screen overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Result Entry</h1>
          <p className="text-gray-500">Request ID: #{template.request_id}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg p-4">
        {Object.entries(grouped).map(([group, tests]) => (
          <div key={group} className="mb-6 border rounded-md">
            {/* Department Header */}
            <button
              onClick={() =>
                setExpandedGroups((p) => ({ ...p, [group]: !p[group] }))
              }
              className="w-full flex justify-between items-center bg-blue-50 text-blue-800 font-semibold px-3 py-2 rounded-t-md"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    expandedGroups[group] ? "rotate-180" : ""
                  }`}
                />
                {group}
                <span className="text-xs text-gray-500 ml-2">
                  ({tests.length} test{tests.length !== 1 && "s"})
                </span>
              </div>
              <span className="text-sm">
                {expandedGroups[group] ? "Hide" : "Show"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {expandedGroups[group] && (
                <motion.div
                  key="table"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 text-left w-[30%]">Test</th>
                        <th className="p-2 text-left w-[30%]">Result</th>
                        <th className="p-2 text-left w-[10%]">Unit</th>
                        <th className="p-2 text-left w-[20%]">Reference Range</th>
                        <th className="p-2 text-left w-[10%]">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.map((t) => (
                        <Fragment key={t.request_item_id}>
                          {t.is_panel ? (
                            <>
                              <tr className="bg-gray-50 border-b">
                                <td
                                  colSpan={5}
                                  className="p-2 font-semibold text-gray-800 flex justify-between"
                                >
                                  {t.test_name}
                                  {t.analytes.some(
                                    (a) =>
                                      a.type === "qualitative" &&
                                      a.qualitative_values?.length
                                  ) && (
                                    <button
                                      onClick={() => handleQuickApplyNormal(t)}
                                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <Wand2 className="w-4 h-4" />
                                      Quick Apply Normal
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {t.analytes.map((a) => (
                                <ResultRow
                                  key={`${a.request_item_id}_${a.test_id}`}
                                  test={{ ...a, test_name: `— ${a.test_name}` }}
                                  value={
                                    results[`${a.request_item_id}_${a.test_id}`] || ""
                                  }
                                  onChange={(k, v) =>
                                    setResults((p) => ({ ...p, [k]: v }))
                                  }
                                  getFlagColor={getFlagColor}
                                />
                              ))}
                            </>
                          ) : (
                            <ResultRow
                              test={t}
                              value={results[`${t.request_item_id}_${t.test_id}`] || ""}
                              onChange={(k, v) =>
                                setResults((p) => ({ ...p, [k]: v }))
                              }
                              getFlagColor={getFlagColor}
                            />
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600">
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-600 w-5 h-5" />
          <span>
            Enter all results and click <b>Save All</b>. Use “Quick Apply Normal”
            for qualitative panels.
          </span>
        </div>

        <div className="flex gap-3">
          {["pathologist", "superadmin"].includes(userRole) && (
            <button
              onClick={handleVerifyAll}
              disabled={verifying || saving}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {verifying ? "Verifying..." : "Verify All"}
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={saving || verifying}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================
// 🔬 Result Row
// =============================================================
const ResultRow = ({ test, value, onChange, getFlagColor }) => {
  const key = `${test.request_item_id}_${test.test_id}`;
  const handleChange = (e) => onChange(key, e.target.value);
  // ✅ Editable unless *explicitly* Verified or Released
  const editable = !["Verified", "Released"].includes(test.status);

  return (
    <tr className="border-b hover:bg-gray-50 transition">
      <td className="p-2 font-medium">{test.test_name}</td>
      <td className="p-2">
        {test.type === "qualitative" ? (
          <select
            value={value}
            onChange={handleChange}
            disabled={!editable}
            className={`border rounded-md p-2 w-full ${
              editable
                ? "border-gray-300 focus:ring focus:ring-blue-100"
                : "bg-gray-100 text-gray-500 cursor-not-allowed"
            }`}
          >
            <option value="">Select...</option>
            {(test.qualitative_values && test.qualitative_values.length > 0
              ? test.qualitative_values
              : ["Positive", "Negative"]
            ).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="Enter result..."
            readOnly={!editable}
            className={`border rounded-md p-2 w-full ${
              editable
                ? "border-gray-300 focus:ring focus:ring-blue-100"
                : "bg-gray-100 text-gray-500 cursor-not-allowed"
            }`}
          />
        )}
      </td>
      <td className="p-2 text-gray-500">{test.unit_symbol || "—"}</td>
      <td className="p-2 text-gray-500">{test.ref_range || "—"}</td>
      <td className={`p-2 font-bold text-center ${getFlagColor(test.flag)}`}>
        {test.flag || ""}
      </td>
    </tr>
  );
};

export default ResultEntryPage;