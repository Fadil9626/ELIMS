/* =========================================================================
 * User / Profile / Security / API Key service
 * - Uses a single BASE derived from VITE_API_BASE_URL (optional)
 * - Centralized authedFetch with robust error handling + timeout
 * - Includes automatic normalization for user payloads (full_name, role_ids)
 * ======================================================================= */

/** Normalize base (optional), e.g. http://localhost:5000 */
const BASE = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

/** Route roots (prefixed by BASE if provided) */
const withBase = (p) => `${BASE}${p}`;
const API_USERS = withBase("/api/users");
const API_PROFILE = withBase("/api/profile/professional");
const API_AUTH = withBase("/api/auth");
const API_KEYS = withBase("/api/keys");

/* -------------------------------- Utilities ------------------------------- */

/** Pull token from arg or localStorage */
const getToken = (maybeToken) => {
  if (maybeToken) return maybeToken;
  try {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    return userInfo?.token || null;
  } catch {
    return null;
  }
};

/** Robust error parser (handles JSON or text) */
const parseError = async (res) => {
  try {
    const data = await res.clone().json();
    return data?.message || data?.error || res.statusText || "Request failed";
  } catch {
    const txt = await res.text().catch(() => "");
    return txt || res.statusText || "Request failed";
  }
};

/**
 * Centralized fetch with Authorization header and timeout.
 * - auto-attaches Bearer token (if present)
 * - throws Error(message) on !res.ok
 * - returns JSON if content-type is JSON; else text
 */
const authedFetch = async (url, { token, headers, timeoutMs = 20000, ...rest } = {}) => {
  const jwt = getToken(token);
  const mergedHeaders = {
    ...(headers || {}),
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new DOMException("Timeout", "AbortError")), timeoutMs);

  let res;
  try {
    res = await fetch(url, { headers: mergedHeaders, signal: ac.signal, ...rest });
  } catch (err) {
    clearTimeout(t);
    if (err?.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw new Error(err?.message || "Network error");
  }
  clearTimeout(t);

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
};

/* -------------------------------- Helpers --------------------------------- */
/** Normalize user payload for backend consistency */
const normalizeUserPayload = (data = {}) => ({
  full_name: data.full_name || data.fullName || "",
  email: data.email || "",
  password: data.password || undefined,
  role_ids: data.role_ids || data.roleIds || [],
});

/* ------------------------------- Users (Admin) ---------------------------- */

export const getAllUsers = (token) => authedFetch(`${API_USERS}`, { token });

export const getActiveUsers = (token) => authedFetch(`${API_USERS}/active`, { token });

export const createUser = (userData, token) =>
  authedFetch(`${API_USERS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeUserPayload(userData)),
    token,
  });

export const updateUser = (userId, userData, token) =>
  authedFetch(`${API_USERS}/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizeUserPayload(userData)),
    token,
  });

export const deleteUser = (userId, token) =>
  authedFetch(`${API_USERS}/${userId}`, { method: "DELETE", token });

/* ------------------------------- My Profile ------------------------------- */

export const getProfile = (token) => authedFetch(`${API_USERS}/profile`, { token });

export const updateProfile = (userData, token) =>
  authedFetch(`${API_USERS}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
    token,
  });

export const changePassword = (passwordData, token) =>
  authedFetch(`${API_USERS}/profile/change-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(passwordData),
    token,
  });

/**
 * ✅ Fixed version: matches backend upload.single('profile_picture')
 */
export const uploadProfilePicture = (file, token) => {
  const formData = new FormData();
  formData.append("profile_picture", file); // ✅ match backend field name
  return authedFetch(`${API_USERS}/profile/picture`, {
    method: "PUT",
    body: formData,
    token,
  });
};

/* --------------------------- Admin: Set Password -------------------------- */
export const adminSetPassword = (userId, newPassword, token) =>
  authedFetch(`${API_USERS}/${userId}/set-password`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
    token,
  });

/* ------------------------ Professional Profile --------------------------- */

export const getProfessionalProfile = (token) => authedFetch(`${API_PROFILE}`, { token });

export const updateProfessionalProfile = (payload, token) =>
  authedFetch(`${API_PROFILE}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    token,
  });

export const uploadSignature = (file, token) => {
  const form = new FormData();
  form.append("file", file);
  return authedFetch(`${API_PROFILE}/signature`, {
    method: "POST",
    body: form,
    token,
  });
};

/* -------------------------- Sessions & 2FA -------------------------------- */

export const listSessions = (token) => authedFetch(`${API_AUTH}/sessions`, { token });

export const revokeSession = (sessionId, token) =>
  authedFetch(`${API_AUTH}/sessions/${sessionId}`, { method: "DELETE", token });

export const revokeAllSessions = (token) =>
  authedFetch(`${API_AUTH}/sessions`, { method: "DELETE", token });

export const twoFASetup = (token) => authedFetch(`${API_AUTH}/2fa/setup`, { method: "POST", token });

export const twoFAEnable = (code, token) =>
  authedFetch(`${API_AUTH}/2fa/enable`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    token,
  });

export const twoFADisable = (token) =>
  authedFetch(`${API_AUTH}/2fa/disable`, { method: "DELETE", token });

export const twoFARegenerateRecovery = (token) =>
  authedFetch(`${API_AUTH}/2fa/recovery`, { method: "POST", token });

/* -------------------------- API Keys (NEW) -------------------------------- */

export const listApiKeys = (token) => authedFetch(`${API_KEYS}`, { token });

export const generateApiKey = (name, token) =>
  authedFetch(`${API_KEYS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    token,
  });

export const revokeApiKey = (keyId, token) =>
  authedFetch(`${API_KEYS}/${keyId}`, { method: "DELETE", token });

/* ------------------------------ Default bundle ---------------------------- */

const userService = {
  // Admin
  getAllUsers,
  getActiveUsers,
  createUser,
  updateUser,
  deleteUser,
  adminSetPassword,

  // Profile
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePicture, // ✅ fixed

  // Professional
  getProfessionalProfile,
  updateProfessionalProfile,
  uploadSignature,

  // Sessions & 2FA
  listSessions,
  revokeSession,
  revokeAllSessions,
  twoFASetup,
  twoFAEnable,
  twoFADisable,
  twoFARegenerateRecovery,

  // API Keys
  listApiKeys,
  generateApiKey,
  revokeApiKey,
};

export default userService;
