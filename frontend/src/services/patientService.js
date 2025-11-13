const API_URL = "/api/patients";

// Attach token to requests
const getHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// Normalize patient objects to avoid null issues
const normalizePatient = (data) => {
  if (!data) return null;
  if (data.patient) return data.patient;
  if (data.rows?.length) return data.rows[0];
  return data;
};

// -------------------------------------------------------------
// ✅ Get ALL patients
// -------------------------------------------------------------
const getAllPatients = async (token) => {
  const res = await fetch(API_URL, { headers: getHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch patients");

  const data = await res.json();
  return Array.isArray(data) ? data : data?.rows || [];
};

// -------------------------------------------------------------
// ✅ Get patient by ID
// -------------------------------------------------------------
const getPatientById = async (id, token) => {
  if (!id || id === "new-request") return null;

  const res = await fetch(`${API_URL}/${id}`, {
    headers: getHeaders(token),
  });

  if (!res.ok) throw new Error("Failed to fetch patient");

  return normalizePatient(await res.json());
};

// -------------------------------------------------------------
// ✅ Register patient
// -------------------------------------------------------------
const registerPatient = async (data, token) => {
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    contactInfo: data.contactInfo || "",
    wardId: data.wardId || "",
    referringDoctor: data.referringDoctor || "",
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to register patient");
  return res.json();
};

// -------------------------------------------------------------
// ✅ Update patient
// -------------------------------------------------------------
const updatePatient = async (id, data, token) => {
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    contactInfo: data.contactInfo || "",
    wardId: data.wardId || "",
    referringDoctor: data.referringDoctor || "",
  };

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to update patient");
  return res.json();
};

// -------------------------------------------------------------
// ✅ Delete patient
// -------------------------------------------------------------
const deletePatient = async (id, token) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getHeaders(token),
  });

  if (!res.ok) throw new Error("Failed to delete patient");
  return res.json();
};

// -------------------------------------------------------------
// ✅ Get patient test history
// -------------------------------------------------------------
const getPatientTestHistory = async (id, token) => {
  if (!id || id === "new-request") return [];

  const res = await fetch(`/api/test-requests/patient/${id}`, {
    headers: getHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch patient test history");

  const data = await res.json();
  return Array.isArray(data) ? data : data?.rows || data?.tests || [];
};

// -------------------------------------------------------------
// ✅ SEARCH (Reception Dashboard) — ALWAYS sends q=
// -------------------------------------------------------------
const searchPatients = async ({ query = "", year, page = 1, limit = 10, token }) => {
  const params = new URLSearchParams();
  params.append("q", query.trim().toLowerCase()); // ✅ backend expects q
  if (year) params.append("year", year);
  params.append("page", page);
  params.append("limit", limit);

  const res = await fetch(`${API_URL}/search?${params.toString()}`, {
    headers: getHeaders(token),
  });

  if (!res.ok) {
    console.error("🔍 Search error:", await res.text());
    throw new Error("Failed to search patients");
  }

  const data = await res.json();

  return {
    results: data.results || data.rows || data.patients || [],
    totalPages: data.totalPages || 1,
    total: data.total || 0,
    page: data.page || page,
  };
};

// -------------------------------------------------------------
export default {
  getAllPatients,
  getPatientById,
  registerPatient,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  searchPatients,
};
