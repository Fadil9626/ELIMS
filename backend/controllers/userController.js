const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// -----------------------------------------------------------------------------
// 🧩 Helper: Record last login timestamp (used on login success)
// -----------------------------------------------------------------------------
const recordLogin = async (userId) => {
  try {
    await pool.query(
      "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1",
      [userId]
    );
  } catch (err) {
    console.error("⚠️ Failed to update last_login_at:", err.message);
  }
};

// -----------------------------------------------------------------------------
// @desc Get profile of currently logged-in user (with roles & permissions)
// -----------------------------------------------------------------------------
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const result = await pool.query(
      `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.department,
        u.is_active,
        u.profile_image_url,
        u.created_at,
        u.last_login_at,
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT('id', r.id, 'name', r.name)
        ) FILTER (WHERE r.id IS NOT NULL) AS roles,
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT('id', p.id, 'name', p.name, 'code', p.code)
        ) FILTER (WHERE p.id IS NOT NULL) AS permissions
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = $1
      GROUP BY u.id
      `,
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "User not found." });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("getUserProfile Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Get all doctors for dropdowns
// -----------------------------------------------------------------------------
const getDoctors = async (req, res) => {
  try {
    const doctors = await pool.query(`
      SELECT u.id, u.full_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name ILIKE 'doctor'
      ORDER BY u.full_name ASC
    `);
    res.status(200).json(doctors.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Get all users (with roles)
// -----------------------------------------------------------------------------
const getAllUsers = async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.department,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', r.id, 'name', r.name)
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.full_name ASC
    `);
    res.status(200).json(users.rows);
  } catch (error) {
    console.error("getAllUsers Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Get all active users
// -----------------------------------------------------------------------------
const getActiveUsers = async (req, res) => {
  try {
    const active = await pool.query(`
      SELECT u.id, u.full_name, u.email, u.department, u.profile_image_url,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT('id', r.id, 'name', r.name)
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.is_active = TRUE
      GROUP BY u.id
      ORDER BY u.full_name ASC
    `);
    res.status(200).json(active.rows);
  } catch (error) {
    console.error("getActiveUsers Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Create new user
// -----------------------------------------------------------------------------
const createUser = async (req, res) => {
  const {
    full_name,
    fullName,
    email,
    password,
    role_ids,
    roleIds,
    department,
  } = req.body;

  const name = full_name || fullName;
  const roles = role_ids || roleIds;

  if (!name || !email || !password || !roles?.length) {
    return res
      .status(400)
      .json({ message: "Full name, email, password, and at least one role are required." });
  }

  try {
    const existing = await pool.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ message: "A user with this email already exists." });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, department, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, full_name, email, department`,
      [name, email, passwordHash, department || null]
    );

    const userId = userResult.rows[0].id;

    for (const rid of roles) {
      await pool.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [userId, rid]
      );
    }

    res.status(201).json(userResult.rows[0]);
  } catch (error) {
    console.error("createUser Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Update user
// -----------------------------------------------------------------------------
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, fullName, email, role_ids, roleIds, department } = req.body;

  const name = full_name || fullName;
  const roles = role_ids || roleIds;

  if (!name || !email)
    return res.status(400).json({ message: "Full name and email are required." });

  try {
    const updated = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2, department = $3
       WHERE id = $4
       RETURNING id, full_name, email, department`,
      [name, email, department || null, id]
    );

    if (updated.rows.length === 0)
      return res.status(404).json({ message: "User not found." });

    if (Array.isArray(roles)) {
      await pool.query("DELETE FROM user_roles WHERE user_id = $1", [id]);
      for (const rid of roles) {
        await pool.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [id, rid]
        );
      }
    }

    res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error("updateUser Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Delete user
// -----------------------------------------------------------------------------
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM user_roles WHERE user_id = $1", [id]);
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("deleteUser Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Update logged-in user profile
// -----------------------------------------------------------------------------
const updateUserProfile = async (req, res) => {
  const { full_name, fullName, email } = req.body;
  const name = full_name || fullName;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2
       WHERE id = $3
       RETURNING id, full_name, email, department, profile_image_url`,
      [name, email, userId]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505")
      return res.status(400).json({ message: "This email is already in use." });
    console.error("updateUserProfile Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Change password
// -----------------------------------------------------------------------------
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  try {
    const user = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (user.rows.length === 0)
      return res.status(404).json({ message: "User not found." });

    const valid = await bcrypt.compare(oldPassword, user.rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ message: "Incorrect old password." });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("changePassword Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Upload profile picture
// -----------------------------------------------------------------------------
const uploadProfilePicture = async (req, res) => {
  const userId = req.user.id;

  if (!req.file)
    return res.status(400).json({ message: "Please upload an image file." });

  try {
    const imageUrl = `/uploads/avatars/${req.file.filename}`;
    const result = await pool.query(
      `UPDATE users
       SET profile_image_url = $1
       WHERE id = $2
       RETURNING id, full_name, email, department, profile_image_url`,
      [imageUrl, userId]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("uploadProfilePicture Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
// @desc Admin reset password
// -----------------------------------------------------------------------------
const adminSetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword)
    return res.status(400).json({ message: "A new password is required." });

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await pool.query(
      "UPDATE users SET password_hash = $1, password_reset_required = TRUE WHERE id = $2",
      [passwordHash, id]
    );
    res.status(200).json({ message: `Password for user ${id} has been reset.` });
  } catch (error) {
    console.error("adminSetPassword Error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

// -----------------------------------------------------------------------------
module.exports = {
  getUserProfile,
  getDoctors,
  getAllUsers,
  getActiveUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserProfile,
  changePassword,
  uploadProfilePicture,
  adminSetPassword,
  recordLogin, // exported for login controller use
};
