// ============================================================================
// 🧪 LAB CONFIG SERVICE (Final Production Version)
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
  test_name?: string;
  name?: string;
  department_id?: number;
  department_name?: string;
  sample_type_id?: number;
  sample_type_name?: string;
  unit_id?: number;
  unit_symbol?: string;
  price?: number;
  is_active?: boolean;
  is_panel?: boolean;
  test_type?: string;
}

export interface Panel {
  id: number;
  name: string;
  description?: string;
  is_active?: boolean;
  price?: number;
  department_id?: number;
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
  unit_name?: string;
  symbol: string;
}

export interface NormalRange {
  id: number;
  analyte_id?: number;
  range_type?: string;
  qualitative_value?: string;
  min_value?: number;
  max_value?: number;
  symbol_operator?: string;
  range_label?: string;
  note?: string;
  gender?: string;
  min_age?: number;
  max_age?: number;
  unit_id?: number;
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
  const headers: Record<string, string> = {};
  if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config: RequestInit = { method, headers };
  if (body) config.body = body instanceof FormData ? body : JSON.stringify(body);

  const response = await fetch(url, config);

  if (!response.ok) {
    let error: any = {};
    try {
      error = await response.json();
    } catch (e) {
      throw new Error(`API Error ${response.status}`);
    }
    throw new Error(error.message || error.error || "Request failed");
  }

  if (response.status === 204) return {} as T;

  const data = await response.json();
  return (data.data !== undefined ? data.data : data) as T;
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
const getPanels = async (token?: string): Promise<Panel[]> =>
  apiCall<Panel[]>(PANEL_API_URL, "GET", token);

const createPanel = async (data: Partial<Panel>, token?: string) =>
  apiCall(PANEL_API_URL, "POST", token, data);

const updateTestPanel = async (id: number, data: Partial<Panel>, token?: string) =>
  apiCall(`${PANEL_API_URL}/${id}`, "PUT", token, data);

/// 🔥 REQUIRED FIX — alias for frontend
const updatePanel = updateTestPanel;

const deleteTestPanel = async (id: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${id}`, "DELETE", token);

/// 🔥 REQUIRED FIX — alias for frontend
const deletePanel = deleteTestPanel;

// ============================================================================
// 🧬 ANALYTES / TESTS
// ============================================================================
const getAnalytes = async (token?: string): Promise<TestAnalyte[]> =>
  apiCall<TestAnalyte[]>(`${ANALYTE_API_URL}`, "GET", token);

const getAllTests = async (token?: string): Promise<TestAnalyte[]> =>
  apiCall<TestAnalyte[]>(`${ANALYTE_API_URL}/all`, "GET", token);

const createAnalyte = async (data: Partial<TestAnalyte>, token?: string) =>
  apiCall(ANALYTE_API_URL, "POST", token, data);

const updateAnalyte = async (id: number, data: Partial<TestAnalyte>, token?: string) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "PUT", token, data);

const deleteAnalyte = async (id: number, token?: string) =>
  apiCall(`${ANALYTE_API_URL}/${id}`, "DELETE", token);

// ============================================================================
// 🔗 PANEL ANALYTE LINKS
// ============================================================================
const getAnalytesForPanel = async (panelId: number, token?: string): Promise<TestAnalyte[]> =>
  apiCall<TestAnalyte[]>(`${PANEL_API_URL}/${panelId}/analytes`, "GET", token);

const addAnalyteToPanel = async (panelId: number, analyteId: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes`, "POST", token, { analyte_id: analyteId });

const removeAnalyteFromPanel = async (panelId: number, analyteId: number, token?: string) =>
  apiCall(`${PANEL_API_URL}/${panelId}/analytes/${analyteId}`, "DELETE", token);

// ============================================================================
// 📏 UNITS
// ============================================================================
const getUnits = async (token?: string): Promise<Unit[]> =>
  apiCall<Unit[]>(UNIT_API_URL, "GET", token);

// ============================================================================
// 🏥 DEPARTMENTS / SAMPLE TYPES / WARDS
// ============================================================================
const getDepartments = async (token?: string): Promise<Department[]> =>
  apiCall<Department[]>(DEPARTMENT_API_URL, "GET", token);

const getSampleTypes = async (token?: string): Promise<SampleType[]> =>
  apiCall<SampleType[]>(SAMPLE_TYPE_API_URL, "GET", token);

const getWards = async (token?: string): Promise<any[]> =>
  apiCall<any[]>(WARD_API_URL, "GET", token);

// ============================================================================
// 🧠 NORMAL RANGES
// ============================================================================
const getNormalRanges = async (analyteId: number, token?: string): Promise<NormalRange[]> =>
  apiCall<NormalRange[]>(`${ANALYTE_API_URL}/${analyteId}/ranges`, "GET", token);

const createNormalRange = async (
  analyteId: number,
  data: Partial<NormalRange>,
  token?: string
) => apiCall(`${ANALYTE_API_URL}/${analyteId}/ranges`, "POST", token, data);

const updateNormalRange = async (rangeId: number, data: Partial<NormalRange>, token?: string) =>
  apiCall(`/api/lab-config/ranges/${rangeId}`, "PUT", token, data);

const deleteNormalRange = async (rangeId: number, token?: string) =>
  apiCall(`/api/lab-config/ranges/${rangeId}`, "DELETE", token);

// ============================================================================
// 📦 EXPORT SERVICE
// ============================================================================
const labConfigService = {
  // Panels
  getPanels,
  getTestPanels: getPanels,
  createPanel,
  createTestPanel: createPanel,
  updatePanel,
  updateTestPanel,
  deletePanel,
  deleteTestPanel,

  // Tests / Analytes
  getAnalytes,
  getAllTests,
  createAnalyte,
  updateAnalyte,
  deleteAnalyte,

  // Panel–Analyte Links
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,

  // Units / Config tables
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
