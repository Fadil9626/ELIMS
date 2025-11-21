const pool = require("../config/database");

const getAuditLogs = async (req, res) => {
  try {
    const {
      search = "",
      action = "",
      module = "",
      severity = "",
      user = "",
      role = "",
      from = "",
      to = "",
      page = 1,
      limit = 20,
    } = req.query;

    const params = [];
    let idx = 1;
    const where = [];
    const trimmed = (v) => String(v || "").trim();

    // Global search
    if (trimmed(search)) {
      where.push(`(
        a.username ILIKE $${idx} OR
        a.action ILIKE $${idx} OR
        a.module ILIKE $${idx} OR
        a.severity ILIKE $${idx} OR
        a.details::text ILIKE $${idx}
      )`);
      params.push(`%${trimmed(search)}%`);
      idx++;
    }

    // Filters
    if (trimmed(action)) {
      where.push(`a.action = $${idx}`);
      params.push(trimmed(action).toUpperCase());
      idx++;
    }

    if (trimmed(module)) {
      where.push(`a.module = $${idx}`);
      params.push(trimmed(module).toUpperCase());
      idx++;
    }

    if (trimmed(severity)) {
      where.push(`a.severity = $${idx}`);
      params.push(trimmed(severity).toUpperCase());
      idx++;
    }

    if (trimmed(user)) {
      where.push(`a.username ILIKE $${idx}`);
      params.push(`%${trimmed(user)}%`);
      idx++;
    }

    if (trimmed(role)) {
      where.push(`a.role ILIKE $${idx}`);
      params.push(`%${trimmed(role)}%`);
      idx++;
    }

    // Date range
    if (from) {
      where.push(`a.created_at >= $${idx}`);
      params.push(from);
      idx++;
    }

    if (to) {
      where.push(`a.created_at <= $${idx}::timestamp`);
      params.push(to + " 23:59:59");
      idx++;
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const limitNum = Number(limit);
    const pageNum = Number(page);
    const offset = (pageNum - 1) * limitNum;

    // Total count
    const totalQuery = `
      SELECT COUNT(*) AS total
      FROM audit_logs a
      ${whereSQL}
    `;
    const totalRes = await pool.query(totalQuery, params);
    const total = Number(totalRes.rows[0].total);

    // Fetch logs
    const logsQuery = `
      SELECT
        a.id,
        a.user_id,
        a.username,
        a.role,
        a.module,
        a.action,
        a.severity,
        a.details,
        a.ip_address,
        a.user_agent,
        a.entity,
        a.entity_id,
        a.entity_type,
        a.created_at
      FROM audit_logs a
      ${whereSQL}
      ORDER BY a.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset};
    `;

    const logsRes = await pool.query(logsQuery, params);

    res.json({
      success: true,
      logs: logsRes.rows,
      total,
      page: pageNum,
      limit: limitNum,
    });

  } catch (error) {
    console.error("❌ Audit Log Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load audit logs",
    });
  }
};

module.exports = { getAuditLogs };
