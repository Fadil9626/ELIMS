// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// Optional audit; no-op if missing
let logAuditEvent = async () => {};
try {
  ({ logAuditEvent } = require("../utils/auditLogger"));
} catch (_) {}

/* --------------------------- helpers --------------------------- */

function buildPermSet(rows) {
  const map = {};
  const list = [];
  for (const r of rows) {
    const res = String(r.resource || "").trim();
    const act = String(r.action || "").trim();
    if (!res || !act) continue;
    const key = `${res}:${act}`;
    if (!map[key]) {
      map[key] = true;
      list.push(key);
    }
  }
  return { map, list };
}

function mergeLegacyRolePerms(base, legacy) {
  if (!legacy) return;
  try {
    const parsed = typeof legacy === "string" ? JSON.parse(legacy) : legacy;

    if (Array.isArray(parsed)) {
      for (const p of parsed) {
        if (typeof p === "string") {
          const [res, act] = p.split(":").map(s => s?.trim());
          if (res && act) base[`${res}:${act}`] = true;
        } else if (p && p.resource && p.action) {
          base[`${String(p.resource).trim()}:${String(p.action).trim()}`] = true;
        }
      }
    } else if (parsed && typeof parsed === "object") {
      for (const [res, actions] of Object.entries(parsed)) {
        if (actions && typeof actions === "object") {
          for (const [act, allowed] of Object.entries(actions)) {
            if (allowed) base[`${res}:${act}`] = true;
          }
        }
      }
    }
  } catch {
    // ignore malformed legacy JSON
  }
}

function toMatrix(map) {
  const matrix = {};
  for (const key of Object.keys(map || {})) {
    if (key === "*:*") continue;
    const [mod, act] = key.split(":");
    if (!mod || !act) continue;
    if (!matrix[mod]) matrix[mod] = {};
    matrix[mod][act] = true;
  }
  return matrix;
}

function isElevatedRoleNameSet(roleNames) {
  const set = new Set(
    [...(roleNames || [])].map((n) => String(n || "").toLowerCase().trim())
  );
  return set.has("superadmin") || set.has("super admin") || set.has("admin");
}

/** Extract JWT from headers/query in a very tolerant way */
function extractToken(req) {
  // Headers (case-insensitive)
  const h =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.get?.("authorization") ||
    req.get?.("Authorization");

  if (h && typeof h === "string") {
    const trimmed = h.trim();
    // Patterns: "Bearer <token>" or "JWT <token>" (case-insensitive)
    const m = trimmed.match(/^(bearer|jwt)\s+(.+)$/i);
    if (m) return m[2].trim();
    // Sometimes clients send just the token
    if (trimmed.length > 20) return trimmed;
  }

  // Optional: token in query string (useful for testing)
  if (req.query?.token && String(req.query.token).length > 20) {
    return String(req.query.token);
  }

  return null;
}

/* ----------------------- user hydration ----------------------- */

async function hydrateUserContext(userId) {
  // 1) Base user + primary role (with legacy JSON)
  const { rows: userRows } = await pool.query(
    `SELECT 
        u.id, u.full_name, u.email, u.role_id, u.department, u.profile_image_url,
        r.name AS role_name, r.permissions AS legacy_role_permissions
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1`,
    [userId]
  );
  if (!userRows.length) return null;
  const user = userRows[0];

  // 2) All roles (primary + user_roles)
  const roleIds = new Set();
  const roleNames = new Set();
  if (user.role_id) roleIds.add(Number(user.role_id));
  if (user.role_name) roleNames.add(String(user.role_name));

  const { rows: extraRoles } = await pool.query(
    `SELECT r.id, r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1`,
    [userId]
  );
  for (const r of extraRoles) {
    roleIds.add(Number(r.id));
    roleNames.add(String(r.name));
  }

  // 3) Explicit grants from role_permissions
  let permRows = [];
  if (roleIds.size) {
    const { rows } = await pool.query(
      `SELECT p.resource, p.action
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = ANY($1::int[])`,
      [[...roleIds]]
    );
    permRows = rows;
  }

  // 4) Slug map + list
  const { map: permMap } = buildPermSet(permRows);

  // 5) Merge legacy JSON from primary role
  mergeLegacyRolePerms(permMap, user.legacy_role_permissions);

  // 6) Elevation check
  // ✅ FIX: Added check for role_id 1 (SuperAdmin) or 2 (Admin)
  // This now perfectly matches your frontend AuthContext logic.
  if (
    isElevatedRoleNameSet(roleNames) || 
    user.role_id === 1 || 
    user.role_id === 2
  ) {
    permMap["*:*"] = true; // wildcard = full access
  }

  // 7) Matrix
  const matrix = toMatrix(permMap);

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      department: user.department,
      profile_image_url: user.profile_image_url,
      role_id: user.role_id,
      role_name: user.role_name,
      roles: [...roleNames],
      role_ids: [...roleIds],

      permission_slugs: Object.keys(permMap), // ["patients:view", ... , "*:*"?]
      permissions_map: permMap,              // { "patients:view": true, ... }
      permissions_matrix: matrix,              // { patients: { view:true } }
    },
  };
}

function can(user, resource, action) {
  if (!user) return false;
  const map = user.permissions_map || {};
  if (map["*:*"]) return true;
  return !!map[`${resource}:${action}`];
}

/* ----------------------- middleware ----------------------- */

const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      await logAuditEvent?.({
        user_id: null,
        action: "NO_TOKEN_PROVIDED",
        details: { ip: req.ip, path: req.originalUrl },
      });
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    // Add small clock tolerance to reduce false expiries on skewed clocks
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 10 });

    const ctx = await hydrateUserContext(decoded.id);
    if (!ctx) {
      await logAuditEvent?.({
        user_id: decoded.id,
        action: "TOKEN_USER_NOT_FOUND",
        details: { reason: "Token valid but user missing" },
      });
      return res.status(404).json({ message: "User not found" });
    }

    req.user = { ...ctx.user };
    return next();
  } catch (error) {
    await logAuditEvent?.({
      user_id: null,
      action: "INVALID_TOKEN",
      details: { error: error.message, ip: req.ip, path: req.originalUrl },
    });
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

const authorize = (resource, action) => {
  if (!resource || !action) {
    return (_req, _res, next) => {
      console.warn("⚠️ authorize() called without resource/action. Skipping check.");
      next();
    };
  }
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "User not found in request context" });
      if (can(user, resource, action)) return next();
      return res.status(403).json({ message: "Forbidden: You do not have permission to perform this action." });
    } catch (error) {
      console.error("❌ Authorization middleware error:", error.message);
      return res.status(500).json({ message: "Internal authorization error" });
    }
  };
};

module.exports = {
  protect,
  authorize,
  can,
};