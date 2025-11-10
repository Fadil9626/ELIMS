// src/utils/authFetch.js
export const authFetch = async (url, options = {}) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  const token = userInfo?.token;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  // ✅ Do NOT auto-logout here.
  // We let the caller handle errors. This avoids HTML parsing issues.
  return res;
};
