// ============================================================================
// 🧪 LAB CONFIG SERVICE (Full Service Logic from TS, converted to JS)
// ============================================================================

// -----------------------------
// 🌐 Unified API Helper
// -----------------------------
const apiCall = async (
  url,
  method,
  token,
  body
) => {
  const headers = {};
  // Handle file uploads (if applicable) or standard JSON
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  
  // CRITICAL: Ensure the Authorization header is set with the Bearer token
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = body instanceof FormData ? body : JSON.stringify(body);

  const response = await fetch(url, config);

  if (!response.ok) {
    let error = {};
    try {
      error = await response.json();
    } catch (e) {
      // If JSON parsing fails, throw a generic HTTP error
      throw new Error(`API Error ${response.status}: Failed to parse error response.`);
    }
    // Throw the specific error message provided by the backend
    throw new Error(error.message || error.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return {};

  const data = await response.json();
  // Return the nested 'data' field if the backend wraps it, otherwise return the whole response
  return (data.data !== undefined ? data.data : data);
};

// ============================================================================
// 🌐 Base Endpoints
// ============================================================================
const BASE = "/api/lab-config";

const PANEL_API_URL = `${BASE}/panels`;
const ANALYTE_API_URL = `${BASE}/tests`;
const UNIT_API_URL = `${BASE}/units`;

const DEPARTMENT_API_URL = "/api/departments";
const SAMPLE_TYPE_API_URL = "/api/sample-types";
const WARD_API_URL = "/api/wards";

// ============================================================================
// 🧪 PANELS
// ============================================================================
const getPanels = async (token) =>
  apiCall(PANEL_API_URL, "GET", token);

const createPanel = async (data, token) =>
  apiCall(PANEL_API_URL, "POST", token, data);

const updatePanel = async (id, data, token) =>
  apiCall(`${PANEL_API_URL}/${id}`, "PUT", token, data);

const deletePanel = async (id, token) =>
  apiCall(`${PANEL_API_URL}/${id}`, "DELETE", token);

// --- Compatibility alias for older frontend components ---
const getTestPanels = getPanels;
const updateTestPanel = updatePanel;
const deleteTestPanel = deletePanel;
const createTestPanel = createPanel;

// ============================================================================
// 🧬 ANALYTES / TESTS (Reduced for brevity, using full logic)
// ============================================================================
const getAnalytes = async (token) =>
  apiCall(`${ANALYTE_API_URL}`, "GET", token);

const getAllTests = async (token) =>
  apiCall(`${ANALYTE_API_URL}/all`, "GET", token);

const updateAnalyte = async (id, data, token) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "PUT", token, data);

const createAnalyte = async (data, token) =>
  apiCall(ANALYTE_API_URL, "POST", token, data);

const deleteAnalyte = async (id, token) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "DELETE", token);
  
// --- Legacy aliases for UI compatibility ---
const getAllCatalogTests = getAllTests;
const updateTest = updateAnalyte; 

// ============================================================================
// 🔗 PANEL ANALYTE LINKS (Reduced for brevity, using full logic)
// ============================================================================
const getAnalytesForPanel = async (panelId, token) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes`, "GET", token);

const addAnalyteToPanel = async (panelId, analyteId, token) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes`, "POST", token, { analyte_id: analyteId });

const removeAnalyteFromPanel = async (panelId, analyteId, token) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes/${analyteId}`, "DELETE", token);

// ============================================================================
// 📏 UNITS
// ============================================================================
const getUnits = async (token) =>
  apiCall(UNIT_API_URL, "GET", token);

// ============================================================================
// 🏥 DEPARTMENTS / SAMPLE TYPES / WARDS
// ============================================================================
const getDepartments = async (token) =>
  apiCall(DEPARTMENT_API_URL, "GET", token);

const getSampleTypes = async (token) =>
  apiCall(SAMPLE_TYPE_API_URL, "GET", token);

// 🚀 WARDS: This is the critical function using the clean API helper
const getWards = async (token) =>
  apiCall(WARD_API_URL, "GET", token);


// You would need to define createWard, updateWard, deleteWard here as well, 
// using the same WARD_API_URL and apiCall structure. 
// Assuming they are already correctly defined in the full JS service based on previous steps:

const createWard = async (data, token) =>
  apiCall(WARD_API_URL, "POST", token, data);

const updateWard = async (id, data, token) =>
  apiCall(`${WARD_API_URL}/${id}`, "PUT", token, data);

const deleteWard = async (id, token) =>
  apiCall(`${WARD_API_URL}/${id}`, "DELETE", token);


// ============================================================================
// 🧠 NORMAL RANGES (Reduced for brevity, using full logic)
// ============================================================================
const getNormalRanges = async (analyteId, token) =>
  apiCall(`${ANALYTE_API_URL}/${analyteId}/ranges`, "GET", token);

const createNormalRange = async (
  analyteId,
  data,
  token
) => apiCall(`${ANALYTE_API_URL}/${analyteId}/ranges`, "POST", token, data);

const updateNormalRange = async (rangeId, data, token) =>
  apiCall(`/api/lab-config/ranges/${rangeId}`, "PUT", token, data);

const deleteNormalRange = async (rangeId, token) =>
  apiCall(`/api/lab-config/ranges/${rangeId}`, "DELETE", token);

// ============================================================================
// 📦 EXPORT SERVICE
// ============================================================================
const labConfigService = {
  // Panels
  getPanels,
  getTestPanels,
  createPanel,
  createTestPanel,
  updatePanel,
  updateTestPanel,
  deletePanel,
  deleteTestPanel,

  // Tests / Analytes
  getAnalytes,
  getAllTests,
  getAllCatalogTests,
  createAnalyte,
  updateAnalyte,
  updateTest, 
  deleteAnalyte,

  // Panel–Analyte Links
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,

  // Units / Config tables
  getUnits,
  getDepartments,
  getSampleTypes,
  getWards, // <--- This function should now successfully call your backend

  // Ward CUD
  createWard,
  updateWard,
  deleteWard,

  // Normal Ranges
  getNormalRanges,
  createNormalRange,
  updateNormalRange,
  deleteNormalRange,
};

export default labConfigService;