// ============================================================
// AUTH MIDDLEWARE (RBAC Stable / Fully Patched Version)
// ============================================================

const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Optional audit logger
let logEvent = async () => {};
try {
  const logger = require("../utils/auditLogger");
  if (typeof logger.logEvent === "function") {
    logEvent = logger.logEvent;
  }
} catch {}

// ------------------------------------------------------------
// Extract Bearer token
// ------------------------------------------------------------
function extractToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return h.trim();
}

// ------------------------------------------------------------
// Build permission map: "patients:view"
// ------------------------------------------------------------
function buildPermissionMap(rows) {
  const map = {};
  for (const r of rows) {
    const res = String(r.resource || "").trim().toLowerCase();
    const act = String(r.action || "").trim().toLowerCase();
    if (res && act) map[`${res}:${act}`] = true;
  }
  return map;
}

// Convert permission map → matrix for UI
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
// ⭐ Hydrate full RBAC context (used by /api/auth/login AND /api/me)
// ------------------------------------------------------------
async function hydrateUserContext(userId) {
  const u = await pool.query(
    `SELECT id, full_name, email, profile_image_url, role_id, department_id
     FROM users WHERE id=$1`,
    [userId]
  );

  if (!u.rows.length) return null;
  const user = u.rows[0];

  // Load main + extra roles
  const rolesResult = await pool.query(
    `
    SELECT r.id, r.name, r.slug
    FROM roles r
    WHERE r.id = $1
    
    UNION
    
    SELECT r.id, r.name, r.slug
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $2
    `,
    [user.role_id, userId]
  );

  const roleList = rolesResult.rows;
  const roleIds = roleList.map((r) => r.id);
  const roleNames = roleList.map((r) => r.name.toLowerCase());
  const roleSlugs = roleList.map((r) => (r.slug || "").toLowerCase());

  // Load permissions
  const perms = await pool.query(
    `
    SELECT p.resource, p.action
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ANY($1::int[])
    `,
    [roleIds]
  );

  const permission_map = buildPermissionMap(perms.rows);

  // SUPER ADMIN
  const isSuperAdmin =
    roleIds.includes(1) ||
    roleNames.includes("super admin") ||
    roleSlugs.includes("super_admin");

  if (isSuperAdmin) {
    permission_map["*:*"] = true;
  }

  const primaryRoleName = roleList[0]?.name || "";

  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    profile_image_url: user.profile_image_url,
    department: user.department_id || null,

    role_id: user.role_id || null,
    role_name: primaryRoleName,

    roles: roleList.map((r) => r.name),
    role_slugs: roleSlugs,
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

    await logEvent(req, {
      module: "AUTH",
      action: "TOKEN_VALID",
      severity: "INFO",
      details: { user_id: user.id },
    });

    next();
  } catch (err) {
    console.error("Protect error:", err.message);

    await logEvent(req, {
      module: "AUTH",
      action: "TOKEN_INVALID",
      severity: "WARNING",
      details: { error: err.message },
    });

    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ------------------------------------------------------------
// 🛡 authorize() — FULLY FIXED VERSION
// ------------------------------------------------------------
const authorize = (resources, action) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ message: "Unauthorized (no user)" });

  const perms = new Set(
    (req.user.permission_slugs || []).map((p) => p.toLowerCase())
  );

  // SUPER ADMIN bypass
  if (perms.has("*:*")) return next();

  const norm = (v) => String(v || "").trim().toLowerCase();

  let needed = [];

  // Case 1: Array of full permission strings (NO ACTION)
  // authorize(["patients:view", "test_requests:view"])
  if (Array.isArray(resources) && !action) {
    needed = resources.map((r) => norm(r));
  }

  // Case 2: Classic authorize("tests","view")
  else if (!Array.isArray(resources) && action) {
    needed = [`${norm(resources)}:${norm(action)}`];
  }

  // Case 3: Array of resources + single action
  // authorize(["patients","test_requests"], "view")
  else if (Array.isArray(resources) && action) {
    needed = resources.map((r) => `${norm(r)}:${norm(action)}`);
  }

  const allowed = needed.some((key) => perms.has(key));

  if (!allowed) {
    console.warn("🚫 Forbidden access", {
      user: req.user.email,
      needed,
      have: [...perms],
    });
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
};

// ------------------------------------------------------------
module.exports = {
  protect,
  authorize,
  hydrateUserContext,
};
