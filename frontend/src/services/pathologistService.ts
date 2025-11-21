import apiFetch from "./apiFetch";

const API_URL = "/api/pathologist";
const REQUEST_API = "/api/test-requests";

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
  // 🚀 UPDATE: Points to the main Test Request controller to get 
  // the Department-Filtered view we built.
  const data = await apiFetch(`${REQUEST_API}/${requestId}/results`, { 
    headers: { Authorization: `Bearer ${token}` } 
  });

  // Normalize qualitative & quantitative items for the UI
  if (data && data.items) {
    data.items = data.items.map((item) => ({
      ...item,
      unit_symbol: item.unit_symbol || item.unit_name || "",
      type:
        item.type ||
        ((item.ref_range || "").toLowerCase().match(/positive|negative|reactive/i)
          ? "qualitative"
          : "quantitative"),
      qualitative_values: (item.qualitative_values || []).filter(Boolean),
    }));
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
// 🔁 Update Request Status (Main Request Header)
// =============================================================
export const updateRequestStatus = async (requestId, newStatus, token) => {
  if (!requestId || !newStatus) {
    throw new Error("Missing requestId or status");
  }
  // 🚀 UPDATE: Fixed method to PATCH and added /status endpoint
  // This matches: router.patch("/:id/status", ...)
  return apiFetch(`${REQUEST_API}/${requestId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

// =============================================================
// 🧾 Release Report
// =============================================================
export const releaseReport = async (token, requestId) => {
  // 🚀 UPDATE: Uses the standard status update endpoint 
  // to leverage the "Restricted Status" logic in testRequestController.
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

// =============================================================
// 🆕 Update Individual Test Item Status
// =============================================================
export const updateRequestItemStatus = async (testItemId, newStatus, token) => {
  if (!testItemId || !newStatus) {
    throw new Error("Missing testItemId or status");
  }
  return apiFetch(`${API_URL}/items/${testItemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: newStatus }),
    headers: { Authorization: `Bearer ${token}` },
  });
};

// =============================================================
// 🧠 Export Default
// =============================================================
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