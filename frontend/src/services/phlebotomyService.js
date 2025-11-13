// services/phlebotomyService.js
const API_URL = '/api/phlebotomy/';

const getSummary = async (token) => {
  const res = await fetch(`${API_URL}summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
};

// ✅ **FIX**: Swapped 'token' and 'filters' arguments to match your component's call
const getWorklist = async (filters = {}, token) => {
  const query = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_URL}worklist?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch worklist');
  return res.json();
};

const markSampleAsCollected = async (id, token) => {
  const res = await fetch(`${API_URL}collect/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to mark as collected');
  return res.json();
};

const exportCollected = async (token) => {
  const res = await fetch(`${API_URL}export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to export data');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collected_samples_${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const phlebotomyService = {
  getSummary,
  getWorklist,
  markSampleAsCollected,
  exportCollected,
};

export default phlebotomyService;