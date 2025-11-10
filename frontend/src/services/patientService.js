const API_URL = "/api/patients";

// Helper: attach token
const getHeaders = (token) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

// ✅ Get all patients
const getAllPatients = async (token) => {
  const res = await fetch(API_URL, { headers: getHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch patients");

  const data = await res.json();
  return Array.isArray(data) ? data : data?.rows || [];
};

// ✅ Normalize backend patient payloads
const normalizePatient = (data) => {
  if (!data) return null;
  if (data.patient) return data.patient;
  if (data.rows && data.rows.length) return data.rows[0];
  return data;
};

// ✅ Get patient by ID
const getPatientById = async (id, token) => {
  if (!id || id === "new-request") return null;

  const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch patient");

  const data = await res.json();
  return normalizePatient(data);
};

// ✅ Register new patient
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

// ✅ Update existing patient
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

// ✅ Delete patient
const deletePatient = async (id, token) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete patient");
  return res.json();
};

// ------------------------------------------------------------------
// ✅ FINAL FIX: Correct URL and no-cache setting
// ------------------------------------------------------------------
const getPatientTestHistory = async (id, token) => {
  if (!id || id === "new-request") return [];

  const res = await fetch(
    `/api/test-requests/patient/${id}`, // <-- FIX 1: This is the correct URL
    {
      headers: getHeaders(token),
      cache: 'no-store', // <-- FIX 2: This stops the 304 caching error
    }
  );

  if (!res.ok) throw new Error("Failed to fetch patient test history");
  const data = await res.json();

  if (Array.isArray(data)) return data;
  return data?.rows || data?.tests || [];
};

// ✅ NEW: Patient Search
const searchPatients = async (query, token) => {
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(token),
  });

  if (!res.ok) throw new Error("Failed to search patients");

  const data = await res.json();

  // Normalize possible backend formats
  if (Array.isArray(data)) return data;
  return data?.rows || data?.patients || [];
};

const patientService = {
  getAllPatients,
  getPatientById,
  registerPatient,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  searchPatients, // ✅ Exporting your new function
};

export default patientService;