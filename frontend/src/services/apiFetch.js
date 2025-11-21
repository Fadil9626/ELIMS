const BASE = import.meta.env.VITE_API_URL;

async function apiFetch(url, options = {}) {
  const fullUrl = BASE + url;

  // Token injection
  const saved = JSON.parse(localStorage.getItem("elims_auth_v1") || "{}");
  const token = saved.token;

  const headers = { ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  const isJSON =
    !(options.body instanceof FormData) &&
    ["POST", "PUT", "PATCH"].includes((options.method || "GET").toUpperCase());

  if (isJSON) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(fullUrl, { ...options, headers });

    if (!res.ok) {
      let msg;
      try {
        msg = (await res.json()).message;
      } catch {
        msg = res.statusText;
      }

      if (res.status === 401 && msg.toLowerCase().includes("token")) {
        localStorage.removeItem("elims_auth_v1");
        window.location.href = "/login";
      }

      throw new Error(msg);
    }

    if (res.status === 204) return null;

    return await res.json();
  } catch (err) {
    console.error("❌ Network Error:", err);
    throw new Error("Network Error: " + err.message);
  }
}

export default apiFetch;
