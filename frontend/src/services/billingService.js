import { authFetch } from '../utils/authFetch';

const API_URL = '/api/billing';

const getDashboardStats = async ({ period = 'month', from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);       // YYYY-MM-DD
  if (to) params.set('to', to);             // YYYY-MM-DD
  if (!from && !to) params.set('period', period);

  const url = `${API_URL}/dashboard?${params.toString()}`;
  const res = await authFetch(url, { method: 'GET' });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || 'Failed to fetch dashboard stats');
  return data;
};

const getMonthlyAnalytics = async () => {
  const res = await authFetch(`${API_URL}/analytics`, { method: 'GET' });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || 'Failed to fetch analytics data');
  return data;
};

const searchEverything = async (query) => {
  const res = await authFetch(`/api/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || 'Search request failed');
  return data;
};

export default {
  getDashboardStats,
  getMonthlyAnalytics,
  searchEverything,
};
