import { authFetch } from "../utils/authFetch";

const BASE_URL = "/api/billing";

/**
 * Dashboard Summary Stats
 * Supports:
 * - period = today|week|month|year (default: month)
 * - OR custom date range via from=YYYY-MM-DD & to=YYYY-MM-DD
 */
const getDashboardStats = async ({ period = "month", from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (!from && !to) params.set("period", period);

  const url = `${BASE_URL}/dashboard?${params.toString()}`;

  const res = await authFetch(url, { method: "GET" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || "Failed to fetch dashboard stats");
  return data;
};

/**
 * Monthly Revenue + Patient Registration Analytics
 */
const getMonthlyAnalytics = async () => {
  const res = await authFetch(`${BASE_URL}/analytics`, { method: "GET" });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || "Failed to fetch analytics data");
  return data;
};

export default {
  getDashboardStats,
  getMonthlyAnalytics,
};
