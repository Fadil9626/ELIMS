// ============================================================
// AUDIT LOG ROUTES
// /api/audit-logs/
// Protected + RBAC required
// Requires permission: audit:view
// ============================================================

const express = require("express");
const router = express.Router();

const { getAuditLogs } = require("../controllers/auditController");
const { protect, authorize } = require("../middleware/authMiddleware");

// ------------------------------------------------------------
// GET /api/audit-logs
// Fetch all audit logs (with optional search/filter/pagination)
//
// RBAC permission required: audit:view
// ------------------------------------------------------------
router.get(
  "/",
  protect,
  authorize("audit", "view"),
  getAuditLogs
);

module.exports = router;
