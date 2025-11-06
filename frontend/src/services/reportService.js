// =============================================================
// 📄 Report Service — Final v3.0
// Handles all API interactions for Reports module
// =============================================================

const API_URL = '/api/reports';

// -------------------------------------------------------------
// ✅ Get All Completed Reports (with optional filters)
// -------------------------------------------------------------
const getAllReports = async (token, filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`❌ Failed to fetch completed reports: ${text}`);
  }

  return response.json();
};

// -------------------------------------------------------------
// ✅ Get Single Report by Test Request ID
// -------------------------------------------------------------
const getReportByRequestId = async (requestId, token) => {
  const response = await fetch(`${API_URL}/test-request/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`❌ Failed to fetch report detail: ${text}`);
  }

  return response.json();
};

// -------------------------------------------------------------
// ✅ Exported API
// -------------------------------------------------------------
const reportService = {
  getAllReports,
  getReportByRequestId,
};

export default reportService;
