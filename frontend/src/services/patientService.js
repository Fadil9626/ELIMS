const API_URL = '/api/patients';

// Helper: attach token
const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
});

// ✅ Get all patients
const getAllPatients = async (token) => {
  const response = await fetch(API_URL, { headers: getHeaders(token) });
  if (!response.ok) throw new Error('Failed to fetch patients');
  return response.json();
};

// ✅ Get single patient by ID
const getPatientById = async (id, token) => {
  const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders(token) });
  if (!response.ok) throw new Error('Failed to fetch patient');
  return response.json();
};

// ✅ Register new patient
const registerPatient = async (data, token) => {
  // Convert React field names to backend schema
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    contactInfo: data.contactInfo || '', // Keep consistent naming
    wardId: data.wardId || '',
    referringDoctor: data.referringDoctor || '',
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to register patient');
  return response.json();
};

// ✅ Update existing patient
const updatePatient = async (id, data, token) => {
  const payload = {
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    contactInfo: data.contactInfo || '',
    wardId: data.wardId || '',
    referringDoctor: data.referringDoctor || '',
  };

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Failed to update patient');
  return response.json();
};

// ✅ Delete patient
const deletePatient = async (id, token) => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error('Failed to delete patient');
  return response.json();
};

// ✅ Get test history for a patient
const getPatientTestHistory = async (id, token) => {
  const response = await fetch(`${API_URL}/${id}/test-requests`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error('Failed to fetch patient test history');
  return response.json();
};

const patientService = {
  getAllPatients,
  getPatientById,
  registerPatient,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
};

export default patientService;
