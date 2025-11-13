// src/services/departmentService.js
import { apiFetch } from './apiFetch'; // Assuming you have a shared apiFetch wrapper

const API_URL = '/api/departments';

/**
 * Fetches all active departments for dropdown menus.
 * @param {string} token - The user's auth token.
 */
const getAllDepartments = async (token) => {
  if (!token) throw new Error("Authentication token is required.");

  // Use the shared apiFetch wrapper if available, otherwise use standard fetch
  if (typeof apiFetch === 'function') {
    return apiFetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Fallback standard fetch
  const res = await fetch(API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to fetch departments');
  }
  return res.json();
};

const departmentService = {
  getAllDepartments,
  // You can add create/update/delete functions here later if needed
};

export default departmentService;