// routes/meRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

// -------------------------------------------------------------
// /api/me
// Returns the hydrated RBAC user from protect()
// Shape: { success: true, user: { ...ctx } }
// -------------------------------------------------------------
router.get("/", protect, (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  return res.json({
    success: true,
    user: req.user, // 👈 EXACTLY what AuthContext.restoreSession expects
  });
});

module.exports = router;
