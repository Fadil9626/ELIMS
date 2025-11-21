// frontend/src/services/testRequestService.js
const API_URL = "/api/test-requests";

/**
 * 🧩 Helper: get token from localStorage (same pattern as other pages)
 */
const getStoredToken = () => {
  try {
    const raw = localStorage.getItem("elims_auth_v1");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return (
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.access_token ||
      ""
    );
  } catch (e) {
    console.error("Failed to parse elims_auth_v1:", e);
    return "";
  }
};

/**
 * 🌐 Robust API fetch wrapper with clear error handling
 *    - Can use token passed in OR fall back to localStorage
 */
async function apiFetch(url, options = {}, tokenArg) {
  // Prefer explicit token if provided, else from localStorage
  const authToken = tokenArg || getStoredToken();

  const baseHeaders = {
    ...(options.headers || {}),
  };

  if (!baseHeaders["Content-Type"] && options.body) {
    baseHeaders["Content-Type"] = "application/json";
  }

  if (authToken && !baseHeaders["Authorization"]) {
    baseHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  const config = {
    ...options,
    headers: baseHeaders,
  };

  try {
    const res = await fetch(url, config);

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data?.message) msg = data.message;
      } catch {
        const text = await res.text().catch(() => "");
        if (text) msg = text;
      }
      throw new Error(msg);
    }

    if (res.status === 204) return null;
    return await res.json();
  } catch (err) {
    console.error("❌ API Error:", err.message);
    throw new Error(err.message || "Network error");
  }
}

/* -----------------------------------------------------------
 * Priority normalizer for API
 * --------------------------------------------------------- */
const normalizePriorityForApi = (priority) => {
  if (!priority) return undefined;
  const p = priority.toString().trim().toUpperCase();
  if (["URGENT", "STAT", "EMERGENCY", "EMERG"].includes(p)) {
    return "URGENT";
  }
  // everything else is routine for the DB
  return "Routine";
};

/* ===========================================================
 * 🧪 TEST REQUEST API CALLS
 * =========================================================== */

/** Get all test requests */
const getAllTestRequests = (token) =>
  apiFetch(`${API_URL}/`, {}, token);

/** Get one test request by ID */
const getTestRequestById = (requestId, token) => {
  if (!requestId || requestId === "undefined")
    throw new Error("Invalid test request ID");

  return apiFetch(`${API_URL}/${requestId}`, {}, token);
};

/** Get all test requests for a specific patient */
const getTestRequestsByPatientId = (patientId, token) => {
  if (!patientId || patientId === "undefined")
    throw new Error("Invalid patient ID");

  return apiFetch(`${API_URL}/patient/${patientId}`, {}, token);
};

/** Update workflow status */
const updateTestRequestStatus = (requestId, status, token) => {
  if (!requestId) throw new Error("requestId required");
  if (!status) throw new Error("status required");

  return apiFetch(
    `${API_URL}/${requestId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
    token
  );
};

/** Create new test request (✅ sends priority to backend) */
const createTestRequest = async (requestData, token) => {
  const { patientId, testIds = [], priority } = requestData || {};

  if (!patientId) throw new Error("Patient ID is required");
  if (!Array.isArray(testIds) || testIds.length === 0)
    throw new Error("At least one test or panel must be selected");

  const normalizedTestIds = testIds
    .map((id) => (typeof id === "object" ? Number(id.id) : Number(id)))
    .filter(Boolean);

  const payload = {
    patientId: Number(patientId),
    testIds: normalizedTestIds,
  };

  const normalizedPriority = normalizePriorityForApi(priority);
  if (normalizedPriority) {
    payload.priority = normalizedPriority; // 🔴 this is what backend uses
  }

  console.log("📦 Sending Test Request Payload:", payload);

  try {
    const result = await apiFetch(
      `${API_URL}/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      token
    );

    console.log("✅ Test request created:", result);
    return result;
  } catch (err) {
    console.error("❌ createTestRequest error:", err.message);
    throw new Error(err.message || "Failed to create test request");
  }
};

/** Process payment */
const processPayment = (requestId, paymentData, token) => {
  if (!requestId) throw new Error("requestId required");
  if (!paymentData?.amount) throw new Error("amount required");
  if (!paymentData?.paymentMethod)
    throw new Error("paymentMethod required");

  return apiFetch(
    `${API_URL}/${requestId}/payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    },
    token
  );
};

/** Fetch result entry template */
const getResultEntryTemplate = async (requestId, token) => {
  if (!requestId) throw new Error("requestId required");

  try {
    const data = await apiFetch(
      `${API_URL}/${requestId}/result-entry`,
      {},
      token
    );
    return data;
  } catch (err) {
    console.error("❌ getResultEntryTemplate error:", err.message);
    throw new Error(err.message);
  }
};

/** Save multiple test results */
const saveResultEntry = (requestId, results, token) => {
  if (!Array.isArray(results) || results.length === 0)
    throw new Error("Results array required");

  return apiFetch(
    `${API_URL}/${requestId}/results`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results }),
    },
    token
  );
};

/** Verify or reject results */
const verifyResults = (requestId, action, comment, token) => {
  if (!requestId) throw new Error("requestId required");
  if (!["verify", "reject"].includes(action))
    throw new Error("Action must be 'verify' or 'reject'");

  return apiFetch(
    `${API_URL}/${requestId}/verify-results`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, comment }),
    },
    token
  );
};

/* ===========================================================
 * EXPORTS
 * =========================================================== */
export default {
  getAllTestRequests,
  getTestRequestById,
  getTestRequestsByPatientId,
  updateTestRequestStatus,
  createTestRequest,
  processPayment,
  getResultEntryTemplate,
  saveResultEntry,
  verifyResults,
};
