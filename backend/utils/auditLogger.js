const pool = require("../config/database");

// Core audit writer — never throws
const auditCore = async (req = {}, event = {}) => {
  try {
    const {
      action,
      module = null,
      severity = "INFO",
      role = null,
      details = {},
    } = event;

    if (!action) return;

    const src = req.user || req.auditUser || {};

    const userId = src.id || null;
    const username = src.full_name || src.email || "System";
    const userRole = src.role_slug || src.role || role || null;

    // Safe IP handling
    let ipHeader = req.headers?.["x-forwarded-for"];
    let ip = null;

    if (typeof ipHeader === "string") {
      ip = ipHeader.split(",")[0].trim();
    } else {
      ip = req.socket?.remoteAddress || null;
    }

    const ua = req.headers?.["user-agent"] || null;

    await pool.query(
      `
      INSERT INTO audit_logs
        (user_id, username, role, module, action, severity, details, ip_address, user_agent)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
      `,
      [
        userId,
        username,
        userRole,
        module,
        action,
        severity,
        JSON.stringify(details),
        ip,
        ua,
      ]
    );
  } catch (err) {
    console.error("⚠️ Audit log failed silently:", err.message);
  }
};

// export both for backwards compatibility
module.exports = {
  logEvent: auditCore,
  logAuditEvent: auditCore,
};
