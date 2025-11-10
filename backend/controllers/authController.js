// backend/controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");

// small helper
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

async function recordLogin(userId) {
  try {
    await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
  } catch (e) {
    console.warn("recordLogin failed:", e.message);
  }
}

// Build normalized RBAC payload for a user id
async function buildRbacForUser(userId) {
  // roles (may be multiple)
  const { rows: roleRows } = await pool.query(
    `
    SELECT r.id, r.name,
           lower(replace(r.name, ' ', '_')) AS slug
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
    ORDER BY r.id
    `,
    [userId]
  );

  const roles = roleRows.map(r => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
  }));

  // permissions via roles
  const { rows: permRows } = await pool.query(
    `
    SELECT DISTINCT p.resource, p.action
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = $1
    `,
    [userId]
  );

  // slugs and map
  const permission_slugs = permRows.map(p => `${p.resource}:${p.action}`);
  const permission_map = {};
  for (const s of permission_slugs) permission_map[s] = true;

  // detect super admin
  const hasSuperAdmin = roles.some(r => r.slug === "super_admin");

  // If Super Admin, give wildcard for the frontend bypass
  if (hasSuperAdmin && !permission_slugs.includes("*:*")) {
    permission_slugs.push("*:*");
    permission_map["*:*"] = true;
  }

  // also give a convenient primary role (first one)
  const primary = roles[0] || null;

  return {
    roles,
    primary_role: primary ? { id: primary.id, name: primary.name, slug: primary.slug } : null,
    permission_slugs,
    permission_map,
    is_super_admin: hasSuperAdmin,
  };
}

// -------------------- REGISTER (optional) --------------------
exports.registerUser = async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ message: "Full name, email & password required" });

  try {
    const dup = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (dup.rowCount) return res.status(400).json({ message: "Email already registered" });

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users(full_name, email, password_hash, is_active, created_at)
       VALUES($1,$2,$3,TRUE,NOW())
       RETURNING id, full_name, email`,
      [full_name, email, password_hash]
    );

    res.status(201).json({ message: "User created", user: rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------- LOGIN --------------------
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const { rows, rowCount } = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM users WHERE email = $1`,
      [email]
    );
    if (!rowCount) return res.status(401).json({ message: "Invalid credentials" });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    if (!u.is_active) return res.status(403).json({ message: "Account disabled" });

    await recordLogin(u.id);

    const rbac = await buildRbacForUser(u.id);
    const token = signToken(u.id);

    await logAuditEvent({
      user_id: u.id,
      action: "login",
      resource: "auth",
      description: `Login from ${req.ip}`,
      ip_address: req.ip,
    });

    res.json({
      token,
      user: {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        role_name: rbac.primary_role?.name || null,
        role_slug: rbac.primary_role?.slug || null,
        roles: rbac.roles,                // full list
        permission_slugs: rbac.permission_slugs,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// -------------------- GET /me (optional but recommended) --------------------
exports.getMe = async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query(
      `SELECT id, full_name, email FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: "User not found" });

    const u = rows[0];
    const rbac = await buildRbacForUser(u.id);

    res.json({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role_name: rbac.primary_role?.name || null,
      role_slug: rbac.primary_role?.slug || null,
      roles: rbac.roles,
      permission_slugs: rbac.permission_slugs,
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
