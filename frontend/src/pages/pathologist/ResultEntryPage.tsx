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
  Beaker,
  FileText
} from "lucide-react";

// ==================================================================================
// 🛡️ UI FALLBACK OPTIONS
// ==================================================================================
const UI_OVERRIDES: Record<string, string[]> = {
  "Urine Appearance": ["Clear", "Hazy", "Cloudy", "Turbid", "Bloody"],
  "Urine Protein": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Glucose": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Ketones": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Blood": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Bilirubin": ["Negative", "Positive +", "Positive ++", "Positive +++"],
  "Leucocytes": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Nitrite": ["Negative", "Positive"],
  "HCG (Pregnancy)": ["Negative", "Positive"],
  "H. Pylori": ["Negative", "Positive"],
  "VDRL / TPHA": ["Non-reactive", "Reactive"],
  "HBsAg (Rapid)": ["Negative", "Positive"],
  "HCV (Hepatitis C)": ["Negative", "Positive"],
  "Rheumatoid Factor": ["Negative", "Positive"],
  "C-Reactive Protein": ["Negative", "Positive"],
  "Salmonella Typhi O": ["Neg", "1:80", "1:160", "1:320"],
  "Salmonella Typhi H": ["Neg", "1:80", "1:160", "1:320"]
};

// ==================================================================================
// 🔧 INTERNAL UTILITIES
// ==================================================================================

const apiFetch = async (url: string, options: any = {}) => {
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

const pathologistService = {
  getResultTemplate: async (token: string, requestId: string) => {
    return apiFetch(`/api/pathologist/requests/${requestId}/template`);
  },
  submitResult: async (token: string, testItemId: number, resultValue: string) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/submit`, {
      method: "POST",
      body: JSON.stringify({ result: resultValue }),
    });
  },
  verifyResult: async (token: string, testItemId: number) => {
    return apiFetch(`/api/pathologist/items/${testItemId}/verify`, {
      method: "POST",
      body: JSON.stringify({ action: "verify" }),
    });
  }
};

const useAuth = () => {
  const [user, setUser] = useState<any>(null);
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

// ============================================================
// Result Entry Page Component
// ============================================================
const ResultEntryPage = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [template, setTemplate] = useState<any>({ request_id: 0, items: [] });
  const [results, setResults] = useState<any>({});
  const [initialResults, setInitialResults] = useState<any>({});
  const [expandedGroups, setExpandedGroups] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.role_name?.toLowerCase() || "";

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

      const flatItems: any[] = [];
      res.items.forEach((item: any) => {
         flatItems.push(item);
         if(item.is_panel && Array.isArray(item.analytes)) {
             item.analytes.forEach((child: any) => {
                 flatItems.push({
                     ...child,
                     department_name: item.department_name,
                     panel_name: item.test_name
                 });
             });
         }
      });
      
      res.items = flatItems;
      setTemplate(res);

      const initial: any = {};
      res.items.forEach((t: any) => {
        if (t.request_item_id) {
          initial[`${t.request_item_id}_${t.test_id}`] = t.result_value || "";
        }
      });

      setResults(initial);
      setInitialResults(initial);

      const expand: any = {};
      res.items.forEach((t: any) => {
        const group = t.panel_name || t.department_name || "Unassigned";
        expand[group] = true;
      });
      setExpandedGroups(expand);
      setError(null);
    } catch (e: any) {
      console.error("ResultEntry loadTemplate error:", e);
      setError(e?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const changed = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId] = k.split("_");
          return { reqItemId, result: v, key: k };
        })
        .filter((e: any) => {
          if (!e.reqItemId || isNaN(Number(e.reqItemId))) return false;
          const val = e.result;
          return (
            val !== undefined && val !== null && String(val).trim() !== "" && val !== initialResults[e.key]
          );
        });

      if (!changed.length) {
        toast("No new changes to save.", { icon: "ℹ️" });
        return;
      }

      for (const entry of changed) {
        await pathologistService.submitResult(token, entry.reqItemId, entry.result as string);
      }

      toast.success("Results saved.");
      await loadTemplate();

    } catch (e: any) {
      toast.error(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyAll = async () => {
    if (userRole === "lab technician") { 
         toast.error("Technicians cannot verify results.");
         return;
    }
    try {
      setVerifying(true);
      const keys = Object.entries(results)
        .map(([k, v]) => {
          const [reqItemId] = k.split("_");
          return { reqItemId, result: v };
        })
        .filter((e) => e.reqItemId && !isNaN(Number(e.reqItemId)) && e.result);

      if (keys.length === 0) {
          toast.error("No results entered.");
          return;
      }

      for (const entry of keys) {
        await pathologistService.verifyResult(token, Number(entry.reqItemId));
      }
      toast.success("Verified successfully.");
      await loadTemplate();
    } catch (e: any) {
      toast.error(e?.message || "Verify failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleQuickApplyNormal = (testsInGroup: any[]) => {
    const updates: any = {};
    testsInGroup.forEach((a) => {
        if(a.is_panel) return; 

        let options = a.qualitative_values || [];
        if (!options.length && UI_OVERRIDES[a.test_name]) {
            options = UI_OVERRIDES[a.test_name];
        }

        // Skip text fields in quick apply
        if (a.type === "quantitative" || a.test_name.includes("Microscopy")) return;

        if (options.length > 0) {
            const normal = options.find((v: string) => 
                /(negative|non-reactive|normal|clear|yellow)/i.test(v)
            ) || options[0];
            
            if (normal) {
                updates[`${a.request_item_id}_${a.test_id}`] = normal;
            }
        }
    });
    setResults((prev: any) => ({ ...prev, ...updates }));
    toast.success(`Auto-filled normal results.`);
  };

  const grouped = template.items.reduce((acc: any, t: any) => {
    const group = t.panel_name || t.department_name || "Unassigned Tests";
    if (!acc[group]) acc[group] = [];
    acc[group].push(t);
    return acc;
  }, {});

  // ✅ SORTING LOGIC: Pushes 'Microscopy' to the bottom
  Object.keys(grouped).forEach(group => {
      grouped[group].sort((a: any, b: any) => {
          const isAMicro = a.test_name.toLowerCase().includes("microscopy");
          const isBMicro = b.test_name.toLowerCase().includes("microscopy");

          if (isAMicro && !isBMicro) return 1; // A goes to bottom
          if (!isAMicro && isBMicro) return -1; // B goes to bottom
          return a.id - b.id; // Default sort by ID
      });
  });

  if (loading && !template.items.length)
    return <div className="p-6 text-center text-gray-500 animate-pulse">Loading template...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Result Entry</h1>
          <p className="text-sm text-gray-500">Request #{template.request_id}</p>
        </div>
        <div className="flex gap-3">
             <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([groupName, tests]: [string, any]) => (
          <div key={groupName} className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedGroups((prev: any) => ({ ...prev, [groupName]: !prev[groupName] }))}
              className="w-full flex justify-between items-center bg-blue-50/50 px-4 py-3 text-left border-b border-blue-100"
            >
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <Wand2 className="w-4 h-4 text-blue-600" />
                {groupName}
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-xs bg-white text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
                    {tests.filter((t:any) => !t.is_panel).length} tests
                 </span>
                 <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${expandedGroups[groupName] ? "rotate-180" : ""}`} />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {expandedGroups[groupName] && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                   <div className="bg-white px-4 py-2 border-b border-gray-50 flex justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleQuickApplyNormal(tests); }}
                        className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={14} /> Quick Normal
                      </button>
                   </div>
                   <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 w-[40%]">Test Name</th>
                            <th className="px-4 py-3 w-[30%]">Result</th>
                            <th className="px-4 py-3 w-[10%]">Unit</th>
                            <th className="px-4 py-3 w-[20%] text-right">Reference</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {tests.map((t: any) => (
                            <ResultRow
                                key={t.request_item_id || t.test_id}
                                test={t}
                                value={results[`${t.request_item_id}_${t.test_id}`] || ""}
                                onChange={(val: string) =>
                                    setResults((prev: any) => ({ ...prev, [`${t.request_item_id}_${t.test_id}`]: val }))
                                }
                            />
                        ))}
                        </tbody>
                   </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-6 mt-6 shadow-lg flex justify-end gap-3 z-10">
         <button onClick={handleSaveAll} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 font-medium shadow-sm transition-all active:scale-95">
            {saving ? <span className="animate-pulse">Saving...</span> : <><Save className="w-4 h-4" /> Save Results</>}
          </button>
          <button onClick={handleVerifyAll} disabled={verifying} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 font-medium shadow-sm transition-all active:scale-95">
            {verifying ? <span className="animate-pulse">Verifying...</span> : <><ShieldCheck className="w-4 h-4" /> Verify All</>}
          </button>
      </div>
    </div>
  );
};

// ============================================================
// 🧱 Row Component
// ============================================================
const ResultRow = ({ test, value, onChange }: any) => {
  if (test.is_panel) {
     return (
        <tr className="bg-blue-50/20">
           <td colSpan={4} className="px-4 py-2 font-bold text-blue-800 text-xs uppercase tracking-wider border-t border-blue-100">
               {test.test_name}
           </td>
        </tr>
     );
  }

  const isLocked = ["Verified", "Released"].includes(test.status);
  
  // --- OPTIONS LOGIC ---
  let options = test.qualitative_values || [];
  if (!options.length && UI_OVERRIDES[test.test_name]) {
     options = UI_OVERRIDES[test.test_name];
  }
  if (typeof test.qualitative_value === 'string' && test.qualitative_value.startsWith('{')) {
      options = test.qualitative_value.replace(/^\{|\}$/g, '').split(',');
  }
  options = options.map((o: string) => o.replace(/"/g, '').trim());

  // --- TYPE LOGIC (Strict enforcement) ---
  const isQuantitative = test.type === 'quantitative';
  
  // ✅ FORCE TEXT FOR THESE FIELDS
  const forceText = [
      "Urine Color", 
      "Urobilinogen",
      "Specific Gravity",
      "pH"
  ].some(key => test.test_name.includes(key));

  // ✅ FORCE TEXT AREA FOR MICROSCOPY
  const isTextArea = test.test_name.toLowerCase().includes("microscopy");

  const showDropdown = !isQuantitative && !forceText && !isTextArea && options.length > 0;

  const getColorClass = (val: string) => {
      if(!val) return "text-gray-900";
      if(/positive|reactive|\+\+/i.test(val)) return "text-red-600 font-bold";
      if(/trace/i.test(val)) return "text-orange-600 font-medium";
      return "text-green-700 font-medium";
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3 font-medium text-gray-800">
        <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
            {test.test_name}
        </div>
      </td>

      <td className="px-4 py-3">
        {showDropdown ? (
          <div className="relative">
              <select
                value={value}
                onChange={(e) => !isLocked && onChange(e.target.value)}
                disabled={isLocked}
                className={`w-full p-2.5 border rounded-lg outline-none bg-white appearance-none transition-shadow cursor-pointer 
                    ${isLocked ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500 border-gray-300'}
                    ${getColorClass(value)}
                `}
              >
                <option value="">Select Result...</option>
                {options.map((opt: string) => (
                  <option key={opt} value={opt} className="text-gray-900 font-normal">
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : isTextArea ? (
           <div className="relative">
               <FileText className="absolute top-3 left-3 w-4 h-4 text-gray-400 pointer-events-none" />
               <textarea
                 value={value}
                 onChange={(e) => !isLocked && onChange(e.target.value)}
                 readOnly={isLocked}
                 rows={3} // Taller box
                 className={`w-full p-2.5 pl-9 border rounded-lg outline-none transition-shadow resize-y
                    ${isLocked ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500 border-gray-300'}
                 `}
                 placeholder="Type microscopy findings..."
               />
           </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => !isLocked && onChange(e.target.value)}
            readOnly={isLocked}
            className={`w-full p-2.5 border rounded-lg outline-none transition-shadow
                ${isLocked ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-blue-500 border-gray-300'}
            `}
            placeholder="Enter value..."
          />
        )}
      </td>

      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
        {test.unit_symbol || "—"}
      </td>
      
      <td className="px-4 py-3 text-right text-gray-400 text-xs">
        {test.ref_range || "—"}
      </td>
    </tr>
  );
};

export default ResultEntryPage;