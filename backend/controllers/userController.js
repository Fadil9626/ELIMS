// ============================================================
// USER CONTROLLER (RBAC + Multi-Role Support)
// ============================================================

const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { logAuditEvent } = require("../utils/auditLogger");

// ----------------------------------------
// Helper: Assign roles
// ----------------------------------------
async function assignRoles(userId, roleIds = []) {
  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  if (Array.isArray(roleIds) && roleIds.length > 0) {
    const values = roleIds.map((r) => `(${userId}, ${r})`).join(",");
    await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ${values}`);
  }
}

// ----------------------------------------
// GET /api/users/profile   (self)
// ----------------------------------------
const getUserProfile = async (req, res) => {
  res.json(req.user);
};

// ----------------------------------------
// GET /api/users           (list all)
// ----------------------------------------
const getAllUsers = async (req, res) => {
  const { rows } = await pool.query(`
    SELECT 
      u.id, 
      u.full_name, 
      u.email, 
      u.is_active,
      u.department,
      ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.full_name ASC
  `);
  res.json(rows);
};

// ----------------------------------------
// GET /api/users/active
// ----------------------------------------
const getActiveUsers = async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, full_name, email, department
    FROM users
    WHERE is_active = TRUE
    ORDER BY full_name ASC
  `);
  res.json(rows);
};

// ----------------------------------------
// GET /api/users/doctors
// ----------------------------------------
const getDoctors = async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.full_name, u.email
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.role_id = (SELECT id FROM roles WHERE LOWER(name) = 'doctor' LIMIT 1)
    ORDER BY u.full_name ASC
  `);
  res.json(rows);
};

// ----------------------------------------
// POST /api/users   (Create User + Assign Roles)
// ----------------------------------------
const createUser = async (req, res) => {
  const { full_name, email, password, department, role_ids } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (exists.rows.length > 0) {
    return res.status(400).json({ message: "Email already exists." });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, department, is_active, created_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     RETURNING id`,
    [full_name, email, password_hash, department || null]
  );

  const userId = result.rows[0].id;
  await assignRoles(userId, role_ids);

  await logAuditEvent({
    user_id: req.user.id,
    action: "create",
    resource: "users",
    description: `Created user ${full_name}`,
  });

  res.status(201).json({ message: "User created successfully." });
};

// ----------------------------------------
// PUT /api/users/:id   (Update User + Roles)
// ----------------------------------------
const updateUser = async (req, res) => {
  const { full_name, email, department, role_ids } = req.body;
  const userId = req.params.id;

  await pool.query(
    `UPDATE users SET full_name = $1, email = $2, department = $3 WHERE id = $4`,
    [full_name, email, department || null, userId]
  );

  await assignRoles(userId, role_ids);

  await logAuditEvent({
    user_id: req.user.id,
    action: "update",
    resource: "users",
    description: `Updated user ${full_name}`,
  });

  res.json({ message: "User updated successfully." });
};

// ----------------------------------------
// DELETE /api/users/:id
// ----------------------------------------
const deleteUser = async (req, res) => {
  const userId = req.params.id;

  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

  await logAuditEvent({
    user_id: req.user.id,
    action: "delete",
    resource: "users",
    description: `Deleted user ID ${userId}`,
  });

  res.json({ message: "User deleted." });
};

// ----------------------------------------
// User Self: Update Profile
// ----------------------------------------
const updateUserProfile = async (req, res) => {
  const { full_name, department } = req.body;
  await pool.query(
    `UPDATE users SET full_name = $1, department = $2 WHERE id = $3`,
    [full_name, department, req.user.id]
  );
  res.json({ message: "Profile updated." });
};

// ----------------------------------------
// Change Own Password
// ----------------------------------------
const changePassword = async (req, res) => {
  const { old_password, new_password } = req.body;
  const user = await pool.query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);

  if (!(await bcrypt.compare(old_password, user.rows[0].password_hash))) {
    return res.status(400).json({ message: "Old password incorrect." });
  }

  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    await bcrypt.hash(new_password, 12),
    req.user.id,
  ]);

  res.json({ message: "Password updated." });
};

// ----------------------------------------
// Admin Set Password
// ----------------------------------------
const adminSetPassword = async (req, res) => {
  const { new_password } = req.body;
  await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
    await bcrypt.hash(new_password, 12),
    req.params.id,
  ]);
  res.json({ message: "Password reset successfully." });
};

// ----------------------------------------
// Upload User Profile Picture
// ----------------------------------------
const uploadProfilePicture = async (req, res) => {
  const url = `/uploads/avatars/${req.file.filename}`;
  await pool.query(`UPDATE users SET profile_image_url = $1 WHERE id = $2`, [
    url,
    req.user.id,
  ]);
  res.json({ message: "Profile picture updated.", url });
};

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
