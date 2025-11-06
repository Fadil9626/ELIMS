const pool = require('../config/database');

// @desc    Get all audit logs with search and filter
// @route   GET /api/audit-logs
// @access  Private (Admin)
const getAuditLogs = async (req, res) => {
  const { search = '', action = '' } = req.query;
  let query = '';
  
  try {
    const params = [];
    const whereClauses = [];
    let idx = 1;

    const trimmedSearch = search.trim();

    // Base SELECT
    const queryParts = [`
      SELECT
        a.id,
        a.action,
        a.details,
        a.created_at,
        COALESCE(u.full_name, a.details->>'email', a.details->>'username', 'System/Guest') AS user_name
      FROM
        audit_logs a
      LEFT JOIN
        users u ON a.user_id = u.id
    `];

    // Action filter
    if (action) {
      whereClauses.push(`a.action = $${idx++}`);
      params.push(action);
    }

    // Search filter (only if actual content exists)
    if (trimmedSearch) {
      const pattern = `%${trimmedSearch}%`;
      whereClauses.push(`(
        COALESCE(u.full_name, a.details->>'email', a.details->>'username', '') ILIKE $${idx}
        OR a.action ILIKE $${idx}
        OR a.details::text ILIKE $${idx}
      )`);
      params.push(pattern);
      idx++;
    }

    // Combine WHERE if needed
    if (whereClauses.length > 0) {
      queryParts.push('WHERE ' + whereClauses.join(' AND '));
    }

    // Sort order
    queryParts.push('ORDER BY a.created_at DESC;');

    // ✅ Safely join everything
    query = queryParts.join(' ').replace(/\s+/g, ' ').trim();

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching audit logs. Failed Query:', query);
    console.error('Error fetching audit logs:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error processing request. Details logged.',
    });
  }
};

module.exports = { getAuditLogs };
