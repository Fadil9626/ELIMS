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
import pathologistService from "../../services/pathologistService";
import { useSocket } from "../../context/SocketContext";

const ResultEntryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [template, setTemplate] = useState({ request_id: 0, items: [] });
  const [results, setResults] = useState({});
  const [initialResults, setInitialResults] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);

  const token = JSON.parse(localStorage.getItem("userInfo"))?.token || null;
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  const userRole = userInfo?.user?.role_name?.toLowerCase?.() || "";

  // ============================================================
  // Load Template
  // ============================================================
  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pathologistService.getResultTemplate(token, id);

      if (!res?.items?.length) {
        toast.error("No tests available.");
        return res;
      }

      setTemplate(res);

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
      setInitialResults(initial);

      const expand = {};
      res.items.forEach((t) => (expand[t.department_name] = true));
      setExpandedGroups(expand);
      setError(null);
      return res;
    } catch (e) {
      setError(e?.message || "Failed to load data.");
      return { items: [] };
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  // ============================================================
  // Save All
  // ============================================================
  const handleSaveAll = async () => {
    try {
      setSaving(true);

      const changed = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId] = k.split("_");
          return { reqItemId, result: v, key: k };
        })
        .filter(
          (e) =>
            e.result &&
            String(e.result).trim() !== "" &&
            e.result !== initialResults[e.key]
        );

      if (!changed.length) {
        toast.error("No new results to save.");
        return;
      }

      for (const entry of changed) {
        await pathologistService.submitResult(token, entry.reqItemId, entry.result);
      }

      toast.success("Results saved.");

      const updated = await loadTemplate();

      // Auto-complete panel status if all analytes done
      for (const item of updated.items) {
        if (
          item.is_panel &&
          item.analytes &&
          item.status !== "Verified" &&
          item.status !== "Released"
        ) {
          const allDone = item.analytes.every(
            (a) => a.result_value && String(a.result_value).trim() !== ""
          );

          if (allDone && item.status !== "Completed") {
            await pathologistService.updateRequestItemStatus(
              item.request_item_id,
              "Completed",
              token
            );
            toast.success(`${item.test_name} marked Completed.`);
          }
        }
      }

      await loadTemplate();

      if (socket) {
        socket.emit("result_saved", { request_id: template.request_id });
        socket.emit("test_status_updated", { request_id: template.request_id });
      }
    } catch (e) {
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Verify All
  // ============================================================
  const handleVerifyAll = async () => {
    if (!["pathologist", "superadmin"].includes(userRole)) {
      toast.error("Not authorized.");
      return;
    }

    try {
      setVerifying(true);

      for (const key of Object.keys(results)) {
        const [reqItemId] = key.split("_");
        if (results[key]) await pathologistService.verifyResult(token, reqItemId);
      }

      toast.success("Verified successfully.");
      await loadTemplate();

      if (socket) {
        socket.emit("test_status_updated", { request_id: template.request_id });
      }
    } catch (e) {
      toast.error(e?.message || "Verify failed.");
    } finally {
      setVerifying(false);
    }
  };

  // ============================================================
  // Quick Apply for Panels
  // ============================================================
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
    setResults((p) => ({ ...p, ...updates }));
    toast.success(`Auto-filled normal results for ${panel.test_name}`);
  };

  // ============================================================
  // Flag Colors
  // ============================================================
  const getFlagColor = (flag) => {
    switch (flag) {
      case "H": return "text-red-600 font-semibold";
      case "L": return "text-blue-600 font-semibold";
      case "A": return "text-orange-600 font-semibold";
      case "R": return "text-red-700 font-semibold";
      case "N": return "text-green-600 font-semibold";
      default: return "text-gray-500";
    }
  };

  if (loading && !template.items.length)
    return <div className="p-6 animate-pulse text-gray-500">Loading...</div>;

  if (error)
    return (
      <div className="p-6 text-red-600 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );

  const grouped = template.items.reduce((acc, t) => {
    acc[t.department_name] = acc[t.department_name] || [];
    acc[t.department_name].push(t);
    return acc;
  }, {});

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Result Entry</h1>
          <p className="text-gray-500">Request #{template.request_id}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </div>

      {/* Table per Department */}
      <div className="bg-white shadow rounded-lg p-4">
        {Object.entries(grouped).map(([group, tests]) => (
          <div key={group} className="mb-6 border rounded-md">
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
                {group} <span className="text-xs text-gray-500 ml-2">({tests.length})</span>
              </div>
              <span className="text-sm">{expandedGroups[group] ? "Hide" : "Show"}</span>
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
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-2 text-left w-[30%]">Test</th>
                        <th className="p-2 text-left w-[30%]">Result</th>
                        <th className="p-2 text-left w-[10%]">Unit</th>
                        <th className="p-2 text-left w-[20%]">Reference</th>
                        <th className="p-2 text-center w-[10%]">Flag</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tests.map((t) => (
                        <Fragment key={t.request_item_id}>
                          {t.is_panel ? (
                            <>
                              <tr className="bg-gray-50 border-b">
                                <td colSpan={5} className="p-2 font-semibold flex justify-between">
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
                                      <Wand2 className="w-4 h-4" /> Quick Normal
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {t.analytes.map((a) => (
                                <ResultRow
                                  key={`${a.request_item_id}_${a.test_id}`}
                                  test={{ ...a, test_name: `— ${a.test_name}` }}
                                  value={results[`${a.request_item_id}_${a.test_id}`] || ""}
                                  onChange={(k, v) => setResults((p) => ({ ...p, [k]: v }))}
                                  getFlagColor={getFlagColor}
                                />
                              ))}
                            </>
                          ) : (
                            <ResultRow
                              test={t}
                              value={results[`${t.request_item_id}_${t.test_id}`] || ""}
                              onChange={(k, v) => setResults((p) => ({ ...p, [k]: v }))}
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
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-gray-600">
          <CheckCircle className="text-green-600 w-5 h-5" />
          <span>
            Enter all results and click <b>Save All</b>.
          </span>
        </div>

        <div className="flex gap-3">
          {["pathologist", "superadmin"].includes(userRole) && (
            <button
              onClick={handleVerifyAll}
              disabled={verifying || saving}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-5 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {verifying ? "Verifying..." : "Verify All"}
            </button>
          )}

          <button
            onClick={handleSaveAll}
            disabled={saving || verifying}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save All"}
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
  const key = `${test.request_item_id}_${test.test_id}`;
  const editable = !["Verified", "Released"].includes(test.status);

  return (
    <tr className="border-b hover:bg-gray-50 transition">
      <td className="p-2 font-medium">{test.test_name}</td>

      <td className="p-2">
        {test.type === "qualitative" ? (
          <select
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
            disabled={!editable}
            className={`border rounded-md p-2 w-full ${
              editable
                ? "border-gray-300 focus:ring focus:ring-blue-100"
                : "bg-gray-100 text-gray-500 cursor-not-allowed"
            }`}
          >
            <option value="">Select...</option>
            {(test.qualitative_values?.length ? test.qualitative_values : ["Positive", "Negative"]).map(
              (opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              )
            )}
          </select>
        ) : (
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
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
