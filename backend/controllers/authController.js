// ============================================================
// AUTH CONTROLLER  (v1.01 RBAC FIXED)
// ============================================================

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");

// ✅ Safe fallback login tracking
async function recordLogin(userId) {
  try {
    await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId]);
  } catch (err) {
    console.warn("⚠ recordLogin failed:", err.message);
  }
}

// ------------------------------------------------------------
// Generate JWT
// ------------------------------------------------------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ------------------------------------------------------------
// REGISTER (Admin-internal use)
// ------------------------------------------------------------
const registerUser = async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: "Full name, email & password required" });
  }

  try {
    // Check duplicate email
    const exists = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users(full_name, email, password_hash, is_active, created_at)
       VALUES($1,$2,$3,TRUE,NOW())
       RETURNING id, full_name, email`,
      [full_name, email, password_hash]
    );

    res.status(201).json({
      message: "User created",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------------------------------
// LOGIN (Correct RBAC hydration integrated)
// ------------------------------------------------------------
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];

    if (!(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.is_active)
      return res.status(403).json({ message: "Account disabled" });

    // ✅ Log last login
    await recordLogin(user.id);

    const token = generateToken(user.id);

    // ✅ Hydrate permissions immediately after login
    const { rows: perms } = await pool.query(
      `SELECT p.resource, p.action
         FROM user_roles ur
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = $1`,
      [user.id]
    );

    // Convert to usable map
    const permission_map = {};
    for (const p of perms) permission_map[`${p.resource}:${p.action}`] = true;

    await logAuditEvent({
      user_id: user.id,
      action: "login",
      resource: "auth",
      description: `Login from ${req.ip}`,
      ip_address: req.ip,
    });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        permission_slugs: Object.keys(permission_map),
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------------------------------------
// GET CURRENT USER
// ------------------------------------------------------------
const getMe = async (req, res) => {
  res.json(req.user); // hydrated in middleware
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
