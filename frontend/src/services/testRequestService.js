const API_URL = "/api/test-requests";

/**
 * 🌐 Robust API fetch wrapper with clear error handling (UNCHANGED)
 */
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);

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

/* ===========================================================
 * 🧪 TEST REQUEST API CALLS
 * =========================================================== */

/** Get all test requests */
const getAllTestRequests = (token) =>
  apiFetch(`${API_URL}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

/** Get one test request by ID */
const getTestRequestById = (requestId, token) => {
  if (!requestId || requestId === "undefined")
    throw new Error("Invalid test request ID");

  return apiFetch(`${API_URL}/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// 💡 NEW FUNCTION: Get all test requests for a specific patient
const getTestRequestsByPatientId = (patientId, token) => {
  if (!patientId || patientId === "undefined")
    throw new Error("Invalid patient ID");

  // Calls the new route added to the Express router: /api/test-requests/patient/:patientId
  return apiFetch(`${API_URL}/patient/${patientId}`, { 
    headers: { Authorization: `Bearer ${token}` },
  });
};


/** Update workflow status */
const updateTestRequestStatus = (requestId, status, token) => {
  if (!requestId) throw new Error("requestId required");
  if (!status) throw new Error("status required");

  return apiFetch(`${API_URL}/${requestId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
};

/**
 * 🧬 Create new test request (always sends testIds[])
 * Backend expands panels automatically. (UNCHANGED)
 */
const createTestRequest = async (requestData, token) => {
  const { patientId, testIds = [] } = requestData || {};

  if (!patientId) throw new Error("Patient ID is required");
  if (!Array.isArray(testIds) || testIds.length === 0)
    throw new Error("At least one test or panel must be selected");

  // ✅ Ensure we send clean numeric IDs
  const normalizedTestIds = testIds
    .map((id) => (typeof id === "object" ? Number(id.id) : Number(id)))
    .filter(Boolean);

  const payload = {
    patientId: Number(patientId),
    testIds: normalizedTestIds,
  };

  console.log("📦 Sending Test Request Payload:", payload);

  try {
    const result = await apiFetch(`${API_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

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

  return apiFetch(`${API_URL}/${requestId}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(paymentData),
  });
};

/** Fetch result entry template */
const getResultEntryTemplate = async (requestId, token) => {
  if (!requestId) throw new Error("requestId required");

  try {
    const data = await apiFetch(`${API_URL}/${requestId}/result-entry`, {
      headers: { Authorization: `Bearer ${token}` },
    });

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

  return apiFetch(`${API_URL}/${requestId}/results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ results }),
  });
};

/** Verify or reject results */
const verifyResults = (requestId, action, comment, token) => {
  if (!requestId) throw new Error("requestId required");
  if (!["verify", "reject"].includes(action))
    throw new Error("Action must be 'verify' or 'reject'");

  return apiFetch(`${API_URL}/${requestId}/verify-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, comment }),
  });
};

/* ===========================================================
 *  EXPORTS
 * =========================================================== */
export default {
  getAllTestRequests,
  getTestRequestById,
  getTestRequestsByPatientId, // 💡 NEW EXPORT
  updateTestRequestStatus,
  createTestRequest,
  processPayment,
  getResultEntryTemplate,
  saveResultEntry,
  verifyResults,
};