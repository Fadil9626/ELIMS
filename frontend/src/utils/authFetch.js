// src/utils/authFetch.js

// ✅ FIX 1: Define the correct storage key
const STORAGE_KEY = "elims_auth_v1";

export const authFetch = async (url, options = {}) => {
  // ✅ FIX 2: Read from the correct storage key
  const rawData = localStorage.getItem(STORAGE_KEY);
  const userInfo = rawData ? JSON.parse(rawData) : null;
  const token = userInfo?.token;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // ✅ FIX 3: Add the token
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  return res;
};