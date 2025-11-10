import { useAuth } from "../context/AuthContext";

export const dashboardService = {
  async getStats(period = "month", authedFetch) {
    const res = await authedFetch(`/api/dashboard/stats?period=${period}`, { method: "GET" });
    const data = await res.json();
    return data;
  },

  async getAnalytics(authedFetch) {
    const res = await authedFetch(`/api/dashboard/analytics`, { method: "GET" });
    const data = await res.json();
    return data;
  }
};
