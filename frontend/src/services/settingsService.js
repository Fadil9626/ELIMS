// =============================================================
// 📦 API CONFIG
// =============================================================
const API_URL = "/api/settings";

// =============================================================
// ⚙️ API HELPER
// =============================================================
const apiFetch = async (
  url,
  token,
  options = {}
) => {
  // For FormData (file uploads), we must NOT set Content-Type
  // The browser will set it automatically with the correct boundary
  const isFormData = options.body instanceof FormData;

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  if (!isFormData && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    let message;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.error || text;
    } catch {
      message = text;
    }
    const error = new Error(`❌ API Error: ${message || res.statusText} (${res.status}) at ${url}`);
    error.status = res.status;
    error.url = url;
    throw error;
  }

  try {
    return text ? JSON.parse(text) : ({});
  } catch {
    return text;
  }
};

// =============================================================
// 🏠 Lab Profile Functions
// =============================================================

/**
 * @desc 🟢 NEW: Fetches general app settings (like maintenance_mode)
 * (Corresponds to getAllSettings in the controller)
 */
export const getSettings = async (token) => {
  return apiFetch(
    `${API_URL}/`, // Calls GET /api/settings
    token,
    { method: "GET" }
  );
};

/**
 * @desc Fetches lab profile settings (name, address, logos)
 */
export const getLabProfile = async (token) => {
  return apiFetch(
    `${API_URL}/lab-profile`,
    token,
    { method: "GET" }
  );
};

/**
 * @desc Updates lab profile text settings
 * (Corresponds to updateLabProfile in the controller)
 */
export const updateSettings = async (settingsData, token) => {
  // NOTE: This service function is currently set to update the LAB PROFILE.
  // The error in SettingsContext.jsx might be because it's calling this
  // function expecting it to update GENERAL settings (PUT /api/settings/).
  // For now, we leave it, as getSettings was the primary error.
  return apiFetch(
    `${API_URL}/lab-profile`, 
    token, 
    {
      method: "PUT",
      body: JSON.stringify(settingsData),
    }
  );
};

// =============================================================
// 🖼️ Logo Upload Functions
// =============================================================

/**
 * Uploads the light theme logo
 */
export const uploadLabLogoLight = async (file, token) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch(
    `${API_URL}/lab-profile/logo/light`, 
    token, 
    {
      method: "POST",
      body: formData,
    }
  );
};

/**
 * Uploads the dark theme logo
 */
export const uploadLabLogoDark = async (file, token) => {
 const formData = new FormData();
  formData.append("file", file);

  return apiFetch(
    `${API_URL}/lab-profile/logo/dark`, 
    token, 
    {
      method: "POST",
      body: formData,
Boolean    }
  );
};

// =============================================================
// 🧠 Export Default
// =============================================================
const settingsService = {
  getSettings, // 🟢 ADDED THIS
  getLabProfile,
  updateSettings,
  uploadLabLogoLight,
  uploadLabLogoDark,
};

export default settingsService;