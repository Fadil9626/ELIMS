import apiFetch from "./apiFetch";

const API_URL = "/api/pathologist";
const REQUEST_API = "/api/test-requests";

// 🛡️ SAFETY NET: Default options if DB returns nothing
const FALLBACK_OPTIONS = {
  "Urine Color": ["Yellow", "Pale Yellow", "Amber", "Red", "Brown", "Other"],
  "Urine Appearance": ["Clear", "Hazy", "Cloudy", "Turbid", "Bloody"],
  "Urine Protein": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Glucose": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Ketones": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Blood": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Urine Bilirubin": ["Negative", "Positive +", "Positive ++", "Positive +++"],
  "Leucocytes": ["Negative", "Trace", "Positive +", "Positive ++", "Positive +++"],
  "Nitrite": ["Negative", "Positive"],
  "Urobilinogen": ["Normal", "0.1", "1.0", "4.0", "8.0", "12.0"],
  "HCG (Pregnancy)": ["Negative", "Positive"],
  "H. Pylori": ["Negative", "Positive"],
  "VDRL / TPHA": ["Non-reactive", "Reactive"],
  "HBsAg (Rapid)": ["Negative", "Positive"],
  "HCV (Hepatitis C)": ["Negative", "Positive"],
  "Rheumatoid Factor": ["Negative", "Positive"],
  "C-Reactive Protein": ["Negative", "Positive"]
};

// =============================================================
// 📋 Worklist & Filters
// =============================================================
export const getWorklist = async (token, filters = {}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );
  const query = new URLSearchParams(cleanFilters).toString();
  return apiFetch(`${API_URL}/worklist?${query}`, { headers: { Authorization: `Bearer ${token}` } });
};

export const getResults = getWorklist;

// =============================================================
// 📊 Dashboard Counts
// =============================================================
export const getStatusCounts = async (token) => {
  return apiFetch(`${API_URL}/status-counts`, { headers: { Authorization: `Bearer ${token}` } });
};

// =============================================================
// 🧩 Enhanced Result Entry (The "Template")
// =============================================================
export const getResultTemplate = async (token, requestId) => {
  // 1. Fetch Data
  const data = await apiFetch(`${API_URL}/requests/${requestId}/template`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });

  // 2. Helper: Parse Options from DB or Fallback
  const resolveOptions = (item) => {
    let options = [];
    const rawVal = item.qualitative_value || item.qualitative_values;

    // A. Try Parsing from DB
    if (Array.isArray(rawVal) && rawVal.length > 0) {
        options = rawVal;
    } else if (typeof rawVal === 'string') {
        if (rawVal.startsWith('{')) {
            options = rawVal.replace(/^\{|\}$/g, '').split(',').map(s => s.replace(/^"|"$/g, '').trim());
        } else if (rawVal.includes(';')) {
            options = rawVal.split(';').map(s => s.trim());
        }
    }

    // B. If DB failed, check Fallback Dictionary
    if (options.length === 0 && FALLBACK_OPTIONS[item.test_name]) {
        options = FALLBACK_OPTIONS[item.test_name];
    }

    return options;
  };

  // 3. Helper: Process Item
  const processItem = (item) => {
    const options = resolveOptions(item);

    return {
      ...item,
      unit_symbol: item.unit_symbol || item.unit_name || "",
      // 🚀 FORCE QUALITATIVE IF OPTIONS EXIST
      type: options.length > 0 ? "qualitative" : (item.type || "quantitative"),
      qualitative_values: options.filter(Boolean),
    };
  };

  // 4. Normalize & Flatten Data for UI
  if (data && data.items) {
    const flatList = [];
    
    data.items.forEach((item) => {
        // Process the parent item
        const processedParent = processItem(item);
        flatList.push(processedParent);

        // If it has nested analytes (children), extract them too
        if (item.is_panel && Array.isArray(item.analytes)) {
            item.analytes.forEach((child) => {
                const processedChild = processItem({
                    ...child,
                    department_name: item.department_name,
                    panel_name: item.test_name 
                });
                flatList.push(processedChild);
            });
        }
    });
    data.items = flatList;
  }

  return data;
};

// =============================================================
// ✍️ Submit Single Result
// =============================================================
export const submitResult = async (token, testItemId, resultValue) => {
  return apiFetch(`${API_URL}/items/${testItemId}/submit`, {
    method: "POST",
    body: JSON.stringify({ result: resultValue }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

// =============================================================
// 🧾 Result History
// =============================================================
export const getResultHistory = async (token, testItemId) => {
  return apiFetch(`${API_URL}/items/${testItemId}/history`, { headers: { Authorization: `Bearer ${token}` } });
};

// =============================================================
// ✅ Verification & Review
// =============================================================
export const verifyResult = async (token, testItemId) => {
  return apiFetch(`${API_URL}/items/${testItemId}/verify`, {
    method: "POST",
    body: JSON.stringify({ action: "verify" }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const reopenResult = async (token, testItemId) => {
  return apiFetch(`${API_URL}/items/${testItemId}/reopen`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const markForReview = async (token, testItemId) => {
  return apiFetch(`${API_URL}/items/${testItemId}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
};

// =============================================================
// 🔁 Update Request Status
// =============================================================
export const updateRequestStatus = async (requestId, newStatus, token) => {
  if (!requestId || !newStatus) throw new Error("Missing ID or status");
  return apiFetch(`${REQUEST_API}/${requestId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const releaseReport = async (token, requestId) => {
  return updateRequestStatus(requestId, "Released", token);
};

// =============================================================
// 🔬 Analyzer Integration
// =============================================================
export const getAnalyzerResults = async (token, testItemId) => {
  try {
    return await apiFetch(`${API_URL}/items/${testItemId}/analyzer-results`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
  } catch (error) {
    if (error.status === 404) {
      return {
        test_item_id: testItemId,
        instrument: null,
        sample_id: null,
        results: {},
        analyzer_meta: null,
        updated_at: new Date(0).toISOString(),
      };
    }
    throw error;
  }
};

export const adoptAnalyzerResults = async (token, testItemId, options = {}) => {
  const overwrite = options.overwrite ?? true;
  return apiFetch(`${API_URL}/items/${testItemId}/adopt-analyzer?overwrite=${overwrite}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const updateRequestItemStatus = async (testItemId, newStatus, token) => {
  if (!testItemId || !newStatus) throw new Error("Missing ID or status");
  return apiFetch(`${API_URL}/items/${testItemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

const pathologistService = {
  getWorklist,
  getResults,
  getStatusCounts,
  getResultTemplate,
  submitResult,
  getResultHistory,
  verifyResult,
  reopenResult,
  markForReview,
  releaseReport,
  updateRequestStatus,
  updateRequestItemStatus,
  getAnalyzerResults,
  adoptAnalyzerResults,
};

export default pathologistService;