const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

// --- FIX ---
// Import the controller functions instead of writing logic in the router
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleUsers,
  assignRoleToUser,
  removeRoleFromUser,
  getPermissionsCatalog,
  setRolePermissions,
} = require("../controllers/rolesController");

// We still need pool for the *one* route the controller didn't export
const pool = require("../config/database");

// guard: only roles:manage can use these
const guard = [protect, authorize("roles", "manage")];

/** GET /api/roles/permissions — catalog */
router.get("/permissions", guard, getPermissionsCatalog);

/** GET /api/roles?search=&limit=&offset= */
router.get("/", guard, getRoles);

/** POST /api/roles — create role */
router.post("/", guard, createRole);

/** PUT /api/roles/:id — rename/describe/set permissions */
//
// *** THIS IS THE MAIN FIX ***
// This now points to the controller's `updateRole` function,
// which correctly saves name, description, AND permissions.
// The old router logic only saved name and description.
//
router.put("/:id", guard, updateRole);

/** DELETE /api/roles/:id */
router.delete("/:id", guard, deleteRole);

/** GET /api/roles/:id/permissions — list role’s grants */
// The controller didn't export this specific function,
// so we'll keep the simple, read-only logic from the old router.
// This does not cause the "restore" bug.
router.get("/:id/permissions", guard, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.resource, p.action
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.resource, p.action`,
      [id]
    );
    res.json(rows);
  } catch (e) {
    console.error("getRolePermissions error:", e);
    res.status(500).json({ message: "Failed to get permissions for role" });
  }
});

/** POST /api/roles/:id/permissions — replace grants with list */
// This route is supported by the controller, so we wire it up.
// Note: The `PUT /api/roles/:id` route is better as it does everything.
router.post("/:id/permissions", guard, setRolePermissions);

/** POST /api/roles/:roleId/users/:userId — assign role */
router.post("/:roleId/users/:userId", guard, assignRoleToUser);

/** DELETE /api/roles/:roleId/users/:userId — unassign role */
router.delete("/:roleId/users/:userId", guard, removeRoleFromUser);

/** GET /api/roles/:id/users — list users with role */
router.get("/:id/users", guard, getRoleUsers);

module.exports = router;
