import apiFetch from "./apiFetch";

const STORAGE_KEY = "elims_auth_v1";

// ----------------------
// LOGIN
// ----------------------
// 🚀 FIXED: Accepts an object { email, password }
async function login({ email, password }) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // 🚀 FIXED: Pass only the relative URL. apiFetch handles the base.
  const response = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  // Store token + user structure AuthContext expects
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token: response.token, user: response.user })
  );

  return response;
}

// ----------------------
// GET CURRENT USER
// ----------------------
async function getMe() {
  // 🚀 FIXED: Pass only the relative URL
  return apiFetch("/api/auth/me");
}

// ----------------------
// LOGOUT
// ----------------------
function logout() {
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  login,
  logout,
  getMe,
};