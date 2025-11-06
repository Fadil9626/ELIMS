const API_URL = '/api/audit-logs';

/**
 * ==========================================================
 * 🔍 Get all audit logs with optional search, filter, and pagination
 * ----------------------------------------------------------
 * @param {string} token - User JWT token
 * @param {Object} filters - Search and filter options
 *   { search?: string, action?: string, page?: number, limit?: number }
 * ==========================================================
 */
const getLogs = async (token, filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const config = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await fetch(`${API_URL}?${query}`, config);

    if (!response.ok) {
      // Attempt to parse backend error if JSON
      let errorDetail;
      try {
        const data = await response.json();
        errorDetail = data.message || JSON.stringify(data);
      } catch {
        errorDetail = await response.text();
      }

      throw new Error(
        `❌ Failed to fetch audit logs (${response.status}): ${errorDetail}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('⚠️ Error in getLogs():', error.message);
    throw error;
  }
};

export { getLogs };
