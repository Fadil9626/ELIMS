import apiFetch from "./apiFetch";

const API_URL = "/api/reports";

const reportService = {
  /**
   * Get list of all completed/verified reports for the "All Reports" page.
   * Supports filtering by search term.
   */
  getAllReports: async (token, filters = {}) => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const query = new URLSearchParams(cleanFilters).toString();
    
    return await apiFetch(`${API_URL}?${query}`, { 
        headers: { Authorization: `Bearer ${token}` } 
    });
  },

  /**
   * Fetch full report data for a single request ID.
   */
  getReportByRequestId: async (requestId, token) => {
    const headers = { Authorization: `Bearer ${token}` };
    return await apiFetch(`${API_URL}/request/${requestId}`, { headers });
  },

  /**
   * Fetch Lab Profile Settings (Name, Address, Logos)
   * This connects to the settings endpoint managed by the Admin.
   */
  getLabSettings: async (token) => {
    const headers = { Authorization: `Bearer ${token}` };
    // Connects to the existing settings endpoint
    return await apiFetch(`/api/settings/lab-profile`, { headers });
  }
};

export default reportService;