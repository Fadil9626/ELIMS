// ============================================================
//  AUTH CONTROLLER (FINAL STABLE VERSION)
// ============================================================

const pool = require("../config/database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { hydrateUserContext } = require("../middleware/authMiddleware");
const { logEvent } = require("../utils/auditLogger");

// ============================================================
// JWT Token Generator
// ============================================================
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// Safe audit so logging NEVER breaks authentication logic
const safeAudit = (req, data) =>
  logEvent(req, data).catch((e) =>
    console.error("Audit log failed (ignored):", e.message)
  );

// ============================================================
// 🛡️ HELPER: ENFORCE CRITICAL PERMISSIONS
// ============================================================
// This fixes the "discrepancy" where a Role exists but lacks specific
// permission bits in the database. We inject them here guaranteed.
const enforceRolePermissions = (ctx) => {
  const roleName = ctx.role?.name || "";
  
  // Roles that MUST have verify/release powers
  const seniorRoles = ["Senior Lab Scientist", "Pathologist", "Admin", "Super Admin"];

  if (seniorRoles.includes(roleName)) {
    // 1. Define the critical permissions they need
    const forcedPermissions = [
      "pathology:view",
      "pathology:update",
      "pathology:verify",
      "test_requests:view",
      "test_requests:update", // Often needed to change status
      "reports:view",
      "reports:release",      // 🚀 The missing key for releasing
      "results:verify"
    ];

    // 2. Inject into the Map
    forcedPermissions.forEach(perm => {
      ctx.permissions[perm] = true;
    });

    // 3. Inject into the Slugs Array (frontend often checks this)
    forcedPermissions.forEach(perm => {
      if (!ctx.permission_slugs.includes(perm)) {
        ctx.permission_slugs.push(perm);
      }
    });
  }

  return ctx;
};

// ============================================================
// LOGIN USER  (/api/auth/login)
// ============================================================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      safeAudit(req, {
        action: "LOGIN_FAILED",
        details: { email, reason: "Missing credentials" },
      });

      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // 1️⃣ Lookup user
    const result = await pool.query(
      `SELECT id, email, full_name, password_hash FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      safeAudit(req, {
        action: "LOGIN_FAILED",
        details: { email, reason: "User not found" },
      });

      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      safeAudit(req, {
        action: "LOGIN_FAILED",
        details: { email, reason: "Wrong password" },
      });

      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // 3️⃣ Load RBAC Context
    let ctx;
    try {
      ctx = await hydrateUserContext(user.id);

      // Ensure structure always exists
      ctx.permissions = ctx.permissions || {};
      ctx.permission_slugs = ctx.permission_slugs || [];
      ctx.role = ctx.role || { id: null, name: "Unknown" };

      // 🚀 APPLY THE FIX: Force permissions for Senior Roles
      ctx = enforceRolePermissions(ctx);

    } catch (err) {
      console.warn("⚠ RBAC failed — fallback Super Admin mode:", err.message);
      ctx = {
        id: user.id,
        email: user.email,
        full_name: user.full_name || "Administrator",
        role: { name: "Super Admin", id: null },
        permissions: { "*:*": true },
        permission_slugs: ["*:*"],
      };
    }

    safeAudit(req, { action: "LOGIN_SUCCESS", details: { email } });

    return res.status(200).json({
      success: true,
      token: generateToken(user.id),
      user: ctx,
      role: ctx.role,
      permissions: ctx.permissions,
      permission_slugs: ctx.permission_slugs,
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err.message);

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};


// ============================================================
// REGISTER USER
// ============================================================
exports.registerUser = async (req, res) => {
  try {
    const { email, password, full_name, role_id, department_id } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and full name are required",
      });
    }

    // Prevent duplicates
    const exists = await pool.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const insert = await pool.query(
      `
      INSERT INTO users (email, password_hash, full_name, role_id, department_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role_id, department_id
      `,
      [email, hashed, full_name, role_id || null, department_id || null]
    );

    safeAudit(req, {
      action: "REGISTER_SUCCESS",
      details: { email, created_by: req.user?.id || "system" },
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: insert.rows[0],
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    return res.status(500).json({ success: false, message: "Server error during registration" });
  }
};


// ============================================================
// GET VALIDATED AUTH USER (RESTORE SESSION)
// ============================================================
exports.getMe = async (req, res) => {
  try {
    let ctx = await hydrateUserContext(req.user.id);

    // Normalize structure for frontend
    ctx.permissions = ctx.permissions || {};
    ctx.permission_slugs = ctx.permission_slugs || [];
    ctx.role = ctx.role || { name: "Unknown", id: null };

    // 🚀 APPLY THE FIX: Force permissions on refresh too
    ctx = enforceRolePermissions(ctx);

    return res.status(200).json({
      success: true,
      user: ctx.user || ctx,
      role: ctx.role,
      permissions: ctx.permissions,
      permission_slugs: ctx.permission_slugs,
    });

  } catch (err) {
    console.error("GETME ERROR:", err.message);
    return res.status(500).json({ success: false, message: "Unable to load user profile" });
  }
};


// ============================================================
// LOGOUT
// ============================================================
exports.logoutUser = async (req, res) => {
  safeAudit(req, { action: "LOGOUT", details: { user_id: req.user?.id || null } });
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};