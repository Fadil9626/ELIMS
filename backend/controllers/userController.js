// ============================================================
// USER CONTROLLER (RBAC + Audit Log + Clean SQL)
// ============================================================

const bcrypt = require("bcryptjs");
const pool = require("../config/database");

// NEW Audit Logger (uses logEvent)
const { logEvent } = require("../utils/auditLogger");

// ------------------------------------------------------------
// Helper: Assign roles to user
// ------------------------------------------------------------
async function assignRoles(userId, roleIds = []) {
  // Clear old roles
  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

  if (Array.isArray(roleIds) && roleIds.length > 0) {
    const values = roleIds.map((rid) => `(${userId}, ${rid})`).join(",");
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ${values}`
    );
  }
}

// ------------------------------------------------------------
// GET /api/users/profile
// ------------------------------------------------------------
const getUserProfile = async (req, res) => {
  res.json(req.user);
};

// ------------------------------------------------------------
// GET /api/users  (List all users)
// ------------------------------------------------------------
const getAllUsers = async (req, res) => {
  const sql = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.is_active,
      d.id AS department_id,
      d.name AS department_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', r.id,
            'name', r.name
          )
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN departments d ON d.id = u.department_id
    GROUP BY u.id, d.id
    ORDER BY u.full_name ASC;
  `;

  const { rows } = await pool.query(sql);
  res.json(rows);
};

// ------------------------------------------------------------
// GET /api/users/active
// ------------------------------------------------------------
const getActiveUsers = async (req, res) => {
  const sql = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.is_active = TRUE
    ORDER BY u.full_name ASC;
  `;

  const { rows } = await pool.query(sql);
  res.json(rows);
};

// ------------------------------------------------------------
// GET /api/users/doctors
// ------------------------------------------------------------
const getDoctors = async (req, res) => {
  const sql = `
    SELECT 
      u.id, u.full_name, u.email
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE LOWER(r.name) = 'doctor'
    ORDER BY u.full_name ASC;
  `;

  const { rows } = await pool.query(sql);
  res.json(rows);
};

// ------------------------------------------------------------
// POST /api/users  (Create user)
// ------------------------------------------------------------
const createUser = async (req, res) => {
  try {
    const { full_name, email, password, department_id, role_ids } = req.body;

    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email, and password are required." });
    }

    // Check duplicate email
    const exists = await pool.query(`SELECT id FROM users WHERE email=$1`, [
      email,
    ]);

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const insert = await pool.query(
      `
      INSERT INTO users (full_name, email, password_hash, department_id, is_active, created_at)
      VALUES ($1, $2, $3, $4, TRUE, NOW())
      RETURNING id, full_name
    `,
      [full_name, email, password_hash, department_id || null]
    );

    const userId = insert.rows[0].id;

    // Assign roles
    await assignRoles(userId, role_ids || []);

    // Log event
    await logEvent(req, {
      module: "USER",
      action: "CREATE",
      severity: "INFO",
      details: { new_user_id: userId, full_name },
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user_id: userId,
    });
  } catch (err) {
    console.error("Create user error:", err.message);

    await logEvent(req, {
      module: "USER",
      action: "CREATE_ERROR",
      severity: "CRITICAL",
      details: { error: err.message },
    });

    res.status(500).json({ message: "Server error while creating user" });
  }
};

// ------------------------------------------------------------
// PUT /api/users/:id  (Update user)
// ------------------------------------------------------------
const updateUser = async (req, res) => {
  try {
    const { full_name, email, department_id, role_ids } = req.body;
    const userId = req.params.id;

    await pool.query(
      `
      UPDATE users
      SET full_name = $1, email = $2, department_id = $3
      WHERE id = $4
    `,
      [full_name, email, department_id || null, userId]
    );

    await assignRoles(userId, role_ids || []);

    await logEvent(req, {
      module: "USER",
      action: "UPDATE",
      severity: "INFO",
      details: { userId, full_name },
    });

    res.json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("Update user error:", err.message);

    await logEvent(req, {
      module: "USER",
      action: "UPDATE_ERROR",
      severity: "WARNING",
      details: { error: err.message },
    });

    res.status(500).json({ message: "Failed to update user" });
  }
};

// ------------------------------------------------------------
// DELETE /api/users/:id
// ------------------------------------------------------------
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

    await logEvent(req, {
      module: "USER",
      action: "DELETE",
      severity: "CRITICAL",
      details: { deleted_user_id: userId },
    });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err.message);

    await logEvent(req, {
      module: "USER",
      action: "DELETE_ERROR",
      severity: "CRITICAL",
      details: { error: err.message },
    });

    res.status(500).json({ message: "Failed to delete user" });
  }
};

// ------------------------------------------------------------
// PUT /api/users/profile
// ------------------------------------------------------------
const updateUserProfile = async (req, res) => {
  const { full_name, department } = req.body;

  await pool.query(
    `
    UPDATE users
    SET full_name = $1, department = $2
    WHERE id = $3
  `,
    [full_name, department || null, req.user.id]
  );

  await logEvent(req, {
    module: "USER",
    action: "PROFILE_UPDATE",
    severity: "INFO",
    details: { user_id: req.user.id },
  });

  res.json({ message: "Profile updated" });
};

// ------------------------------------------------------------
// POST /api/users/change-password
// ------------------------------------------------------------
const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;

  const result = await pool.query(
    `SELECT password_hash FROM users WHERE id=$1`,
    [req.user.id]
  );

  const user = result.rows[0];
  if (!(await bcrypt.compare(old_password, user.password_hash))) {
    return res.status(400).json({ message: "Old password incorrect" });
  }

  const newHash = await bcrypt.hash(new_password, 12);

  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [newHash, req.user.id]
  );

  await logEvent(req, {
    module: "USER",
    action: "PASSWORD_CHANGE",
    severity: "INFO",
    details: { user_id: req.user.id },
  });

  res.json({ message: "Password updated" });
};

// ------------------------------------------------------------
// Admin reset password
// ------------------------------------------------------------
const adminSetPassword = async (req, res) => {
  const { new_password } = req.body;

  const newHash = await bcrypt.hash(new_password, 12);

  await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [newHash, req.params.id]
  );

  await logEvent(req, {
    module: "USER",
    action: "ADMIN_RESET_PASSWORD",
    severity: "WARNING",
    details: { target_user: req.params.id },
  });

  res.json({ message: "Password reset successfully" });
};

// ------------------------------------------------------------
// Upload profile picture
// ------------------------------------------------------------
const uploadProfilePicture = async (req, res) => {
  const url = `/uploads/avatars/${req.file.filename}`;

  await pool.query(
    `UPDATE users SET profile_image_url = $1 WHERE id = $2`,
    [url, req.user.id]
  );

  await logEvent(req, {
    module: "USER",
    action: "PROFILE_PICTURE_UPDATE",
    severity: "INFO",
    details: { user_id: req.user.id },
  });

  res.json({ message: "Profile picture updated", url });
};

// ============================================================
module.exports = {
  getUserProfile,
  getAllUsers,
  getActiveUsers,
  getDoctors,
  createUser,
  updateUser,
  deleteUser,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
  adminSetPassword,
};
