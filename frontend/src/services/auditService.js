import apiFetch from "./apiFetch";

const API = "/audit-logs";

/**
 * Fetch audit logs with filters + pagination
 */
export const getLogs = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const path = `${API}?${query}`;

  const data = await apiFetch(path);

  return {
    success: true,
    logs: data.logs || [],
    total: data.total || 0,
    page: data.page || filters.page || 1,
    limit: data.limit || filters.limit || 20,
    total_pages:
      data.total_pages ||
      Math.ceil((data.total || 0) / (filters.limit || 20)),
  };
};
