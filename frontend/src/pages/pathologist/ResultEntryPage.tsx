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
  Save,
} from "lucide-react";

// ==================================================================================
// 🔧 INTERNAL UTILITIES (Replaces missing imports)
// ==================================================================================

// 1. API Fetch Wrapper
const apiFetch = async (url, options = {}) => {
  let token = "";
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.token || "";
    }
  } catch (e) {
    console.error("Error reading token", e);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    let message;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      message = text;
    }
    throw new Error(message || `API Error: ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return text;
  }
};

// 2. Pathologist Service (Internal Definition)
const pathologistService = {
  getResultTemplate: async (token, requestId) => {
    const data = await apiFetch(`/api/pathologist/requests/${requestId}/template`);
    // Normalize data
    if (data && data.items) {
        data.items = data.items.map((item) => ({
          ...item,
          unit_symbol: item.unit_symbol || item.unit_name || "",
          type: item.type || 
            ((item.ref_range || "").toLowerCase().match(/positive|negative|reactive/) 
              ? "qualitative" : "quantitative"),
          qualitative_values: (item.qualitative_values || []).filter(Boolean),
        }));
    }
    return data;
  },
  submitResult: async (token, testItemId, resultValue) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/submit`, {
      method: "POST",
      body: JSON.stringify({ result: resultValue }),
    });
  },
  verifyResult: async (token, testItemId) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/verify`, {
      method: "POST",
      body: JSON.stringify({ action: "verify" }),
    });
  },
  updateRequestItemStatus: async (testItemId, status, token) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }
};

// 3. Internal Auth Hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("elims_auth_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setToken(parsed.token);
      }
    } catch (e) {
      console.error("Auth load error", e);
    }
  }, []);

  return { user, token };
};

// 4. Internal Socket Hook
const useSocket = () => ({
  socket: {
    emit: () => {}, // Mock emit
    on: () => {},
    off: () => {}
  }
});

// ============================================================
// Result Entry Page Component (STRICT MODE)
// ============================================================
const ResultEntryPage = () => {
  const { id } = useParams(); // requestId from route
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { token, user } = useAuth();

  const [template, setTemplate] = useState({ request_id: 0, items: [] });
  const [results, setResults] = useState({});
  const [initialResults, setInitialResults] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const userRole = user?.role_name?.toLowerCase() || "";

  // ------------------------------------------------------------
  // Load Template
  // ------------------------------------------------------------
  const loadTemplate = useCallback(async () => {
    if (!token || !id) return;

    try {
      setLoading(true);
      const res = await pathologistService.getResultTemplate(token, id);

      if (!res?.items?.length) {
        toast.error("No tests available for this request.");
        setTemplate({ request_id: Number(id) || 0, items: [] });
        return res;
      }

      setTemplate(res);

      // Build initial values map
      const initial = {};
      res.items.forEach((t) => {
        if (t.request_item_id) {
          initial[`${t.request_item_id}_${t.test_id}`] = t.result_value || "";
        }
        if (t.is_panel && Array.isArray(t.analytes)) {
          t.analytes.forEach((a) => {
            if (a.request_item_id) {
              initial[`${a.request_item_id}_${a.test_id}`] =
                a.result_value || "";
            }
          });
        }
      });

      setResults(initial);
      setInitialResults(initial);

      // Expand all departments by default
      const expand = {};
      res.items.forEach((t) => {
        const group = t.department_name || "Unassigned";
        expand[group] = true;
      });
      setExpandedGroups(expand);
      setError(null);
      return res;
    } catch (e) {
      console.error("ResultEntry loadTemplate error:", e);
      setError(e?.message || "Failed to load data.");
      setTemplate({ request_id: Number(id) || 0, items: [] });
      return { items: [] };
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  // ------------------------------------------------------------
  // Save All (STRICT, skip invalid IDs)
  // ------------------------------------------------------------
  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // Build list of changed entries with valid numeric request_item_id
      const changed = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId, testId] = k.split("_");
          return { reqItemId, testId, result: v, key: k };
        })
        .filter((e) => {
          // Must have a numeric request_item_id
          if (!e.reqItemId || isNaN(Number(e.reqItemId))) {
            return false;
          }
          const val = e.result;
          // Only save if value is defined and different from initial load
          return (
            val !== undefined &&
            val !== null &&
            String(val).trim() !== "" &&
            val !== initialResults[e.key]
          );
        });

      if (!changed.length) {
        toast("No new changes to save.", { icon: "ℹ️" });
        return;
      }

      // Save each changed result
      for (const entry of changed) {
        await pathologistService.submitResult(
          token,
          entry.reqItemId, // itemId (strict)
          entry.result
        );
      }

      toast.success("Results saved.");

      const updated = await loadTemplate();

      // Auto-complete panels → Completed when all analytes have values
      if (updated?.items?.length) {
        for (const item of updated.items) {
          if (
            item.is_panel &&
            Array.isArray(item.analytes) &&
            item.status !== "Verified" &&
            item.status !== "Released"
          ) {
            const allDone = item.analytes.every(
              (a) =>
                a.request_item_id &&
                a.result_value &&
                String(a.result_value).trim() !== ""
            );

            if (allDone && item.status !== "Completed") {
              await pathologistService.updateRequestItemStatus(
                item.request_item_id,
                "Completed", // STRICT MODE
                token
              );
              toast.success(`${item.test_name} marked Completed.`);
            }
          }
        }
      }

      await loadTemplate();

      if (socket && socket.emit) {
        socket.emit("result_saved", { request_id: template.request_id });
        socket.emit("test_status_updated", { request_id: template.request_id });
      }
    } catch (e) {
      console.error("SaveAll error:", e);
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Verify All (STRICT MODE)
  // ------------------------------------------------------------
  const handleVerifyAll = async () => {
    // Allow pathologists, superadmins, or verify-permitted users
    // Simple check here, but backend enforces strict permissions
    if (userRole === "lab technician") { 
         toast.error("Technicians cannot verify results. Please ask a Pathologist.");
         return;
    }

    try {
      setVerifying(true);

      // Only verify items that have a numeric id and a non-empty result
      const keys = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId] = k.split("_");
          return { reqItemId, result: v };
        })
        .filter(
          (e) =>
            e.reqItemId &&
            !isNaN(Number(e.reqItemId)) &&
            e.result &&
            String(e.result).trim() !== ""
        );

      if (keys.length === 0) {
          toast.error("No results entered to verify.");
          return;
      }

      for (const entry of keys) {
        await pathologistService.verifyResult(token, entry.reqItemId);
      }

      toast.success("Verified successfully.");
      await loadTemplate();

      if (socket && socket.emit) {
        socket.emit("test_status_updated", { request_id: template.request_id });
      }
    } catch (e) {
      console.error("VerifyAll error:", e);
      toast.error(e?.message || "Verify failed.");
    } finally {
      setVerifying(false);
    }
  };

  // ------------------------------------------------------------
  // Quick Apply for Panels (qualitative)
  // ------------------------------------------------------------
  const handleQuickApplyNormal = (panel) => {
    const updates = {};
    panel.analytes.forEach((a) => {
      if (
        (a.type === "qualitative" || (a.qualitative_values && a.qualitative_values.length > 0)) &&
        a.request_item_id
      ) {
        // Look for "Negative", "Non-Reactive", or "Normal"
        const normal =
          (a.qualitative_values || []).find((v) =>
            /(negative|non-reactive|normal)/i.test(v)
          ) || (a.qualitative_values || [])[0];
        
        if (normal) {
             updates[`${a.request_item_id}_${a.test_id}`] = normal;
        }
      }
    });
    setResults((prev) => ({ ...prev, ...updates }));
    toast.success(`Auto-filled normal results for ${panel.test_name}`);
  };

  // ------------------------------------------------------------
  // Flag Colors
  // ------------------------------------------------------------
  const getFlagColor = (flag) => {
    switch (flag) {
      case "H":
        return "text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded";
      case "L":
        return "text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded";
      case "A":
        return "text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded";
      case "R":
        return "text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded";
      case "N":
        return "text-green-600 font-semibold";
      default:
        return "text-gray-400";
    }
  };

  // ------------------------------------------------------------
  // Loading / Error States
  // ------------------------------------------------------------
  if (!user) return <div className="p-6 text-center text-gray-500">Loading session...</div>;
  if (loading && !template.items.length)
    return <div className="p-6 text-center text-gray-500 animate-pulse">Loading template...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600 flex items-center gap-2 justify-center">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );

  // Group items by department
  const grouped = template.items.reduce((acc, t) => {
    const group = t.department_name || "Unassigned Department";
    if (!acc[group]) acc[group] = [];
    acc[group].push(t);
    return acc;
  }, {});

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="p-6 bg-gray-50 min-h-screen max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Result Entry</h1>
          <p className="text-sm text-gray-500">Request #{template.request_id}</p>
        </div>
        <div className="flex gap-3">
             <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
        </div>
      </div>

      {/* Table per Department */}
      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No tests found in this request.</p>
            </div>
        )}

        {Object.entries(grouped).map(([group, tests]) => (
          <div key={group} className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() =>
                setExpandedGroups((prev) => ({
                  ...prev,
                  [group]: !prev[group],
                }))
              }
              className="w-full flex justify-between items-center bg-gray-50 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2 font-semibold text-gray-800">
                <ChevronDown
                  className={`w-5 h-5 transition-transform text-gray-500 ${
                    expandedGroups[group] ? "rotate-180" : ""
                  }`}
                />
                {group}
                <span className="bg-white border px-2 py-0.5 rounded-full text-xs text-gray-500 font-medium shadow-sm">
                  {tests.length}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedGroups[group] && (
                <motion.div
                  key="table"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-gray-100 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 w-[35%]">Test Name</th>
                            <th className="px-4 py-3 w-[25%]">Result</th>
                            <th className="px-4 py-3 w-[15%]">Unit</th>
                            <th className="px-4 py-3 w-[15%]">Reference</th>
                            <th className="px-4 py-3 w-[10%] text-center">Flag</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                        {tests.map((t) => (
                            <Fragment key={t.request_item_id || `${t.test_id}-panel`}>
                            {t.is_panel ? (
                                <>
                                {/* Panel Header Row */}
                                <tr className="bg-blue-50/30">
                                    <td
                                    colSpan={5}
                                    className="px-4 py-2 font-semibold text-blue-900 flex justify-between items-center"
                                    >
                                    <span className="flex items-center gap-2">
                                        <Wand2 className="w-4 h-4 text-blue-500" /> {t.test_name}
                                    </span>
                                    {Array.isArray(t.analytes) &&
                                        t.analytes.some(
                                        (a) =>
                                            (a.type === "qualitative" || a.qualitative_values?.length > 0)
                                        ) && (
                                        <button
                                            onClick={() => handleQuickApplyNormal(t)}
                                            className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded shadow-sm transition-colors"
                                        >
                                            Quick Normal
                                        </button>
                                        )}
                                    </td>
                                </tr>

                                {/* Panel Analytes */}
                                {Array.isArray(t.analytes) &&
                                    t.analytes.map((a) => (
                                    <ResultRow
                                        key={
                                        a.request_item_id
                                            ? `${a.request_item_id}_${a.test_id}`
                                            : `noid_${a.test_id}`
                                        }
                                        test={{
                                        ...a,
                                        test_name: a.test_name, // Indent handled in component or CSS
                                        is_analyte: true
                                        }}
                                        value={
                                        a.request_item_id
                                            ? results[
                                                `${a.request_item_id}_${a.test_id}`
                                            ] || ""
                                            : ""
                                        }
                                        onChange={(k, v) =>
                                        setResults((prev) => ({
                                            ...prev,
                                            [k]: v,
                                        }))
                                        }
                                        getFlagColor={getFlagColor}
                                    />
                                    ))}
                                </>
                            ) : (
                                <ResultRow
                                test={t}
                                value={
                                    t.request_item_id
                                    ? results[
                                        `${t.request_item_id}_${t.test_id}`
                                        ] || ""
                                    : ""
                                }
                                onChange={(k, v) =>
                                    setResults((prev) => ({ ...prev, [k]: v }))
                                }
                                getFlagColor={getFlagColor}
                                />
                            )}
                            </Fragment>
                        ))}
                        </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 mt-6 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="text-green-600 w-5 h-5" />
          <span>
            Save results first, then verify.
          </span>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {["pathologist", "superadmin", "admin"].includes(userRole) && (
            <button
              onClick={handleVerifyAll}
              disabled={verifying || saving}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-colors font-medium"
            >
              {verifying ? (
                  <span className="animate-pulse">Verifying...</span>
              ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify All
                  </>
              )}
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={saving || verifying}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {saving ? (
                <span className="animate-pulse">Saving...</span>
            ) : (
                <>
                    <Save className="w-4 h-4" /> Save All
                </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Row Component
// ============================================================
const ResultRow = ({ test, value, onChange, getFlagColor }) => {
  const hasId = !!test.request_item_id && !isNaN(Number(test.request_item_id));
  const key = hasId
    ? `${test.request_item_id}_${test.test_id}`
    : `noid_${test.test_id}`;
  
  // Lock if verified/released unless reopening is implemented in row actions
  const lockedByStatus = ["Verified", "Released"].includes(test.status);
  const editable = hasId && !lockedByStatus;

  const commonInputClasses = editable
    ? "border rounded-lg px-3 py-2 w-full border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
    : "border rounded-lg px-3 py-2 w-full bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200";

  // Detect qualitative type
  const isQualitative = 
    test.type === "qualitative" || 
    (test.qualitative_values && test.qualitative_values.length > 0);

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className={`px-4 py-3 font-medium text-gray-800 ${test.is_analyte ? "pl-8" : ""}`}>
        <div className="flex items-center gap-2">
            {test.is_analyte && <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>}
            {test.test_name}
            {!hasId && (
            <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                Error: No ID
            </span>
            )}
        </div>
      </td>

      <td className="px-4 py-3">
        {isQualitative ? (
          <select
            value={value}
            onChange={(e) => editable && onChange(key, e.target.value)}
            disabled={!editable}
            className={`${commonInputClasses} appearance-none`}
          >
            <option value="">Select...</option>
            {(test.qualitative_values?.length
              ? test.qualitative_values
              : ["Positive", "Negative", "Reactive", "Non-Reactive"]
            ).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text" // text to allow "< 5.0" inputs if needed, else use number
            value={value}
            onChange={(e) => editable && onChange(key, e.target.value)}
            readOnly={!editable}
            className={commonInputClasses}
            placeholder="Enter value"
          />
        )}
      </td>

      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
        {test.unit_symbol || "—"}
      </td>
      
      <td className="px-4 py-3 text-gray-500 text-xs">
        {test.ref_range || "—"}
      </td>
      
      <td className="px-4 py-3 text-center">
        {test.flag && (
            <span className={`text-xs ${getFlagColor(test.flag)}`}>
                {test.flag}
            </span>
        )}
      </td>
    </tr>
  );
};

export default ResultEntryPage;