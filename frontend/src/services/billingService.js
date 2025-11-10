import { authFetch } from "../utils/authFetch";

const API_URL = "/api/billing";

// ✅ Correct endpoint: /dashboard
const getDashboardStats = async ({ period = "month", from, to } = {}) => {
  const params = new URLSearchParams();

  if (from) params.set("from", from);   // YYYY-MM-DD
  if (to) params.set("to", to);
  if (!from && !to) params.set("period", period);

  const url = `${API_URL}/dashboard?${params.toString()}`;

  const res = await authFetch(url, { method: "GET" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) throw new Error(data.message || "Failed to get dashboard stats");
  return data;
};

// ✅ Correct endpoint: /analytics
const getMonthlyAnalytics = async () => {
  const res = await authFetch(`${API_URL}/analytics`, { method: "GET" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) throw new Error(data.message || "Failed to get analytics");
  return data;
};

const searchEverything = async (query) => {
  const res = await authFetch(`/api/search?q=${encodeURIComponent(query)}`, {
    method: "GET",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || "Search failed");
  return data;
};

export default {
  getDashboardStats,
  getMonthlyAnalytics,
  searchEverything,
};
