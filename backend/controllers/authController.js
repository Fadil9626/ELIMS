const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");
const { recordLogin } = require("./userController"); // 🕒 Update login timestamp

// -----------------------------------------------------------------------------
// 🔐 Generate JWT
// -----------------------------------------------------------------------------
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// -----------------------------------------------------------------------------
// 🧍 REGISTER USER (Admin only)
// -----------------------------------------------------------------------------
const registerUser = async (req, res) => {
  const { full_name, email, password, role_id, department } = req.body;

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      await logAuditEvent({
        user_id: req.user?.id || null,
        action: "REGISTER_FAILED",
        details: { email, reason: "User already exists" },
      });
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, role_id, department, created_at, is_active)
      VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
      RETURNING id, full_name, email, role_id, department
      `,
      [full_name, email, hashedPassword, role_id || 3, department || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    await logAuditEvent({
      user_id: req.user?.id || null,
      action: "REGISTER_USER",
      details: { new_user_id: user.id, email: user.email, role_id },
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
    });
  } catch (err) {
    console.error("❌ Registration Error:", err.message);
    await logAuditEvent({
      user_id: req.user?.id || null,
      action: "REGISTER_FAILED",
      details: { email, error: err.message },
    });
    res.status(500).json({ message: "Server error during registration" });
  }
};

// -----------------------------------------------------------------------------
// 🔑 LOGIN USER
// -----------------------------------------------------------------------------
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      await logAuditEvent({
        user_id: null,
        action: "LOGIN_FAILED",
        details: { email, reason: "User not found", ip: req.ip },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await logAuditEvent({
        user_id: user.id,
        action: "LOGIN_FAILED",
        details: { email, reason: "Wrong password", ip: req.ip },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.is_active) {
      await logAuditEvent({
        user_id: user.id,
        action: "LOGIN_BLOCKED",
        details: { email, reason: "Account inactive", ip: req.ip },
      });
      return res.status(403).json({ message: "Account is inactive. Contact admin." });
    }

    // 🔄 Record login timestamp
    await recordLogin(user.id);

    // 🧠 Fetch role + permissions (to send to frontend)
    const roles = await pool.query(
      `
      SELECT r.id, r.name, r.description
      FROM roles r
      LEFT JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1
      `,
      [user.id]
    );

    const perms = await pool.query(
      `
      SELECT p.id, p.name, p.code
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      WHERE rp.role_id IN (
        SELECT role_id FROM user_roles WHERE user_id = $1
      )
      `,
      [user.id]
    );

    const token = generateToken(user.id);

    // ✅ Log successful login
    await logAuditEvent({
      user_id: user.id,
      action: "LOGIN_SUCCESS",
      details: {
        email,
        ip: req.ip,
        user_agent: req.headers["user-agent"],
      },
    });

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        department: user.department,
        profile_image_url: user.profile_image_url,
        is_active: user.is_active,
        roles: roles.rows || [],
        permissions: perms.rows || [],
      },
      token,
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    await logAuditEvent({
      user_id: null,
      action: "LOGIN_ERROR",
      details: { email, error: error.message },
    });
    res.status(500).json({ message: "Server error during login" });
  }
};

// -----------------------------------------------------------------------------
module.exports = { registerUser, loginUser };
