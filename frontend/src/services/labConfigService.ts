// ============================================================================
// 🧪 LAB CONFIG SERVICE (Final TypeScript Production-Synced Version)
// ============================================================================
// Handles all API calls related to laboratory configuration:
// Panels, Analytes, Units, Departments, Sample Types, Wards, and Normal Ranges.
// ============================================================================

// -----------------------------
// 📦 Type Declarations
// -----------------------------
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface TestAnalyte {
  id: number;
  test_name: string;
  name?: string; // Add 'name' as optional
  department_id?: number;
  department_name?: string;
  department?: string; // Add 'department'
  sample_type_id?: number;
  sample_type_name?: string;
  sample_type?: string; // Add 'sample_type'
  unit_id?: number;
  unit_symbol?: string;
  price?: number;
  is_active?: boolean;
  is_panel?: boolean; // Add 'is_panel'
  test_type?: string; // Add 'test_type'
  qualitative_value?: string; // Add 'qualitative_value'
}

export interface Panel {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface Department {
  id: number;
  name: string;
}

export interface SampleType {
  id: number;
  name: string;
}

export interface Unit {
  id: number;
  name: string; // This should be 'unit_name' based on your controller
  unit_name?: string;
  symbol: string;
}

export interface NormalRange {
  id: number;
  test_id: number;
  analyte_id?: number;
  gender?: string;
  age_min?: number;
  min_age?: number; // Add 'min_age'
  age_max?: number;
  max_age?: number; // Add 'max_age'
  low_value?: string;
  min_value?: string; // Add 'min_value'
  high_value?: string;
  max_value?: string; // Add 'max_value'
  unit_id?: number;
  comments?: string;
  note?: string; // Add 'note'
  range_type?: string;
  qualitative_value?: string;
  symbol_operator?: string;
  range_label?: string;
}

// ============================================================================
// 🌐 Unified API Helper
// ============================================================================
const apiCall = async <T = any>(
  url: string,
  method: string,
  token?: string,
  body?: any
): Promise<T> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(url, config);

  // 🧩 Handle Errors
  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const message =
      errorData.message ||
      errorData.error ||
      `Route not found: ${method} ${url.replace(window.location.origin, "")}`;

    throw new Error(message);
  }

  // Handle 204 No Content
  if (response.status === 204) return { success: true } as T;
  const res = await response.json();
  // ✅ This makes all functions safely return an array if data exists
  return res.data || (Array.isArray(res) ? res : []);
};

// ============================================================================
// 🌐 Base Endpoints
// ============================================================================
const BASE = "/api/lab-config";
const PANEL_API_URL = `${BASE}/panels`;
const ANALYTE_API_URL = `${BASE}/tests`;
const ANALYTE_ALL_API_URL = `${BASE}/tests/all`;
const UNIT_API_URL = `${BASE}/units`;
const RANGE_API_URL = `${BASE}/tests`;
const RANGE_BASE_URL = `${BASE}/ranges`;

// ✅ FIX: These routes are mounted on /api/, not /api/lab-config/
const DEPARTMENT_API_URL = "/api/departments";
const SAMPLE_TYPE_API_URL = "/api/sample-types";
const WARD_API_URL = "/api/wards";


// ============================================================================
// 🧩 Panels
// ============================================================================
const getTestPanels = async (token?: string): Promise<Panel[]> => {
  return apiCall<Panel[]>(PANEL_API_URL, "GET", token);
};

const createTestPanel = async (data: Partial<Panel>, token?: string) =>
  apiCall(PANEL_API_URL, "POST", token, data);

const updateTestPanel = async (id: number, data: Partial<Panel>, token?: string) =>
  apiCall(`${PANEL_API_URL}/${id}`, "PUT", token, data);

const deleteTestPanel = async (id: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${id}`, "DELETE", token);

// ============================================================================
// 🧬 Analytes / Tests
// ============================================================================
// Fetches ONLY analytes (is_panel = false)
const getAnalytes = async (token?: string): Promise<TestAnalyte[]> => {
  return apiCall<TestAnalyte[]>(ANALYTE_API_URL, "GET", token);
};

// Fetches ALL tests (is_panel = true AND false)
const getAllTests = async (token?: string): Promise<TestAnalyte[]> => {
  return apiCall<TestAnalyte[]>(ANALYTE_ALL_API_URL, "GET", token);
};

const createAnalyte = async (data: Partial<TestAnalyte>, token?: string) =>
  apiCall(ANALYTE_API_URL, "POST", token, data);

const updateAnalyte = async (id: number, data: Partial<TestAnalyte>, token?: string) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "PUT", token, data);

const deleteAnalyte = async (id: number, token?: string) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "DELETE", token);

// This function was missing but referenced by TestsTab
const toggleTestStatus = (id: number, isActive: boolean, t?: string) => 
  apiCall(`${ANALYTE_API_URL}/${id}`, "PUT", t, { is_active: isActive });

// ============================================================================
// 🔗 Panel–Analyte Linking
// ============================================================================
const getAnalytesForPanel = async (panelId: number, token?: string): Promise<TestAnalyte[]> => {
  return apiCall<TestAnalyte[]>(
    `${PANEL_API_URL}/${panelId}/analytes`,
    "GET",
    token
  );
};

const addAnalyteToPanel = async (panelId: number, analyteId: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes`, "POST", token, { analyte_id: analyteId });

const removeAnalyteFromPanel = async (panelId: number, analyteId: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes/${analyteId}`, "DELETE", token);

// ============================================================================
// 🧠 Panel Range Inheritance & Overrides
// ============================================================================
const getPanelRanges = async (panelId: number, token?: string): Promise<NormalRange[]> => {
  return apiCall<NormalRange[]>(
    `${PANEL_API_URL}/${panelId}/ranges`,
    "GET",
    token
  );
};

const setPanelRangeOverride = async (
  panelId: number,
  analyteId: number,
  data: Partial<NormalRange>,
  token?: string
) => apiCall(`${PANEL_API_URL}/${panelId}/ranges/${analyteId}`, "POST", token, data);

const deletePanelRangeOverride = async (panelId: number, analyteId: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${panelId}/ranges/${analyteId}`, "DELETE", token);

// ============================================================================
// 📏 Units
// ============================================================================
const getUnits = async (token?: string): Promise<Unit[]> => {
  return apiCall<Unit[]>(UNIT_API_URL, "GET", token);
};

// ============================================================================
// 🏥 Departments / Sample Types / Wards
// ============================================================================
const getDepartments = async (token?: string): Promise<Department[]> => {
  return apiCall<Department[]>(DEPARTMENT_API_URL, "GET", token);
};

const getSampleTypes = async (token?: string): Promise<SampleType[]> => {
  return apiCall<SampleType[]>(SAMPLE_TYPE_API_URL, "GET", token);
};

const getWards = async (token?: string): Promise<any[]> => {
  return apiCall<any[]>(WARD_API_URL, "GET", token);
};

// ============================================================================
// 🧠 Normal Ranges
// ============================================================================
const getNormalRanges = async (testId: number, token?: string): Promise<NormalRange[]> => {
  return apiCall<NormalRange[]>(
    `${RANGE_API_URL}/${testId}/ranges`,
    "GET",
    token
  );
};

const createNormalRange = async (testId: number, data: Partial<NormalRange>, token?: string) =>
  apiCall(`${RANGE_API_URL}/${testId}/ranges`, "POST", token, data);

const updateNormalRange = async (rangeId: number, data: Partial<NormalRange>, token?: string) =>
  apiCall(`${RANGE_BASE_URL}/${rangeId}`, "PUT", token, data);

const deleteNormalRange = async (rangeId: number, token?: string) =>
  apiCall(`${RANGE_BASE_URL}/${rangeId}`, "DELETE", token);

// ============================================================================
// 📦 Export Service
// ============================================================================
const labConfigService = {
  // Panels
  getTestPanels,
  getPanels: getTestPanels,
  createTestPanel,
  createPanel: createTestPanel,
  updateTestPanel,
  deleteTestPanel,

  // Analytes / Tests
  getAnalytes,
  getTests: getAnalytes,
  getAllTests,
  getAllCatalogTests: getAllTests, // ✅ alias for legacy calls
  createAnalyte,
  createTest: createAnalyte,
  updateAnalyte,
  updateTest: updateAnalyte,
  deleteAnalyte,
  deleteTest: deleteAnalyte,
  toggleTestStatus, // ✅ Added missing function

  // Panel–Analyte Links
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,

  // Panel Range Overrides
  getPanelRanges,
  setPanelRangeOverride,
  deletePanelRangeOverride,

  // Config Tables
  getUnits,
  getDepartments,
  getSampleTypes,
  getWards,

  // Normal Ranges
  getNormalRanges,
  createNormalRange,
  updateNormalRange,
  deleteNormalRange,
};

export default labConfigService;