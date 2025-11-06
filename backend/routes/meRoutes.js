// routes/meRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

// This route only formats what protect() already put on req.user
router.get("/", protect, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const u = req.user || {};
  const roleId = Number(u.role_id || 0);
  const roleName = String(u.role_name || "");

  const map    = u.permissions_map    || {};
  const matrix = u.permissions_matrix || {};
  const slugs  = Array.isArray(u.permission_slugs) ? u.permission_slugs : [];

  // Elevated if wildcard or role name matches SA/Admin
  const elevated =
    map["*:*"] === true ||
    /^(super\s?admin|superadmin|admin)$/i.test(roleName);

  const effective_permissions = elevated ? { __all: true } : matrix;
  const legacyPermissions     = elevated ? { __all: true } : matrix;
  const legacySlugs           = elevated ? ["*"]           : slugs;

  return res.json({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role_id: roleId,
    role_name: roleName,
    department: u.department,
    profile_image_url: u.profile_image_url || null,

    // legacy + normalized for older guards
    permissions: legacyPermissions,
    permission_slugs: legacySlugs,

    // canonical
    effective_permissions,

    is_super_admin: /^(super\s?admin|superadmin)$/i.test(roleName),
    is_admin: /^admin$/i.test(roleName),
  });
});

module.exports = router;
