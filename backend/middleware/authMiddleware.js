// ============================================================
// AUTH MIDDLEWARE (Enhanced Stable Version)
// protect → validates JWT + loads roles + permissions
// authorize(resource, action) → checks permissions (case-insensitive)
// ============================================================

const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Optional audit logger – if available
let logAuditEvent = async () => {};
try {
  const auditModule = require("../utils/auditLogger");
  if (typeof auditModule?.logAuditEvent === "function") {
    logAuditEvent = auditModule.logAuditEvent;
  }
} catch {}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return h.trim();
}

// Build permission map: { "patients:view": true, "billing:collect": true }
function buildPermissionMap(rows) {
  const map = {};
  for (const r of rows) {
    const res = String(r.resource || "").trim();
    const act = String(r.action || "").trim();
    if (res && act) map[`${res}:${act}`] = true;
  }
  return map;
}

// Convert permission map into UI matrix
function toMatrix(map) {
  const matrix = {};
  for (const key of Object.keys(map)) {
    if (key === "*:*") continue;
    const [res, act] = key.split(":");
    if (!matrix[res]) matrix[res] = {};
    matrix[res][act] = true;
  }
  return matrix;
}

// ------------------------------------------------------------
// Load user + roles + permissions
// ------------------------------------------------------------
async function hydrateUserContext(userId) {
  const userRes = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role_id, u.profile_image_url, u.department
     FROM users u
     WHERE u.id = $1`,
    [userId]
  );

  if (!userRes.rows.length) return null;
  const user = userRes.rows[0];

  // Load primary + secondary roles
  const roleRes = await pool.query(
    `SELECT r.id, r.name
     FROM roles r
     WHERE r.id = $1
     UNION
     SELECT r.id, r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $2`,
    [user.role_id, userId]
  );

  const roles = roleRes.rows;
  const roleIds = roles.map((r) => r.id);
  const roleNames = roles.map((r) => r.name.toLowerCase());

  // Load permissions
  const permsRes = await pool.query(
    `SELECT p.resource, p.action
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ANY($1::int[])`,
    [roleIds]
  );

  const permission_map = buildPermissionMap(permsRes.rows);

  // ✅ SUPERADMIN ALWAYS HAS FULL ACCESS
  const isSuperAdmin =
    roleNames.includes("superadmin") ||
    roleNames.includes("super admin") ||
    roleIds.includes(1);

  if (isSuperAdmin) {
    permission_map["*:*"] = true;
  }

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    profile_image_url: user.profile_image_url,
    department: user.department || null,
    roles: roles.map((r) => r.name),
    role_ids: roleIds,
    permission_slugs: Object.keys(permission_map),
    permissions_map: permission_map,
    permissions_matrix: toMatrix(permission_map),
  };
}

// ------------------------------------------------------------
// protect middleware
// ------------------------------------------------------------
const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await hydrateUserContext(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user;

    await logAuditEvent({
      user_id: user.id,
      action: "auth_protect",
      resource: "auth",
      description: `Token verified`,
    });

    next();
  } catch (err) {
    console.error("Auth protect error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ------------------------------------------------------------
// authorize middleware (improved - case-insensitive, multi-resource support)
// ------------------------------------------------------------
const authorize = (resources, action) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  // Normalize helper
  const normalize = (v) =>
    String(v || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  // Build normalized permission set
  const userPerms = new Set(
    Object.keys(req.user.permissions_map || {}).map((k) => normalize(k))
  );

  // Superadmin bypass
  if (userPerms.has("*:*")) return next();

  // Allow array or single resource
  const resourceList = Array.isArray(resources) ? resources : [resources];

  // Build needed keys
  const needed = resourceList.map(
    (r) => `${normalize(r)}:${normalize(action)}`
  );

  // Check for match
  const allowed = needed.some((key) => userPerms.has(key));

  if (!allowed) {
    console.warn("🚫 Forbidden access", {
      user: req.user.email,
      roles: req.user.roles,
      needed,
      have: [...userPerms],
    });
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

// ------------------------------------------------------------
module.exports = { protect, authorize };
