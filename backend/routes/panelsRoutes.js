const express = require("express");
const router = express.Router();

// Controllers
const {
  getPanels,
  createPanel,
  updatePanel,
  deletePanel,
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,
} = require("../controllers/panelsController");

// ✅ Minimal JWT auth (same logic used in server.js)
const jwt = require("jsonwebtoken");

const requireAuth = (req, res, next) => {
  try {
    const h = req.headers.authorization || "";
    if (!h.toLowerCase().startsWith("bearer "))
      return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(h.slice(7).trim(), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// ✅ Only Admin / Super Admin can modify panels
const adminOnly = (req, res, next) => {
  const role = req.user?.role?.toLowerCase?.();
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden: Admin Only" });
  }
  next();
};

// ============================================================
// 🔹 Panels CRUD
// ============================================================

router
  .route("/")
  .get(requireAuth, adminOnly, getPanels)
  .post(requireAuth, adminOnly, createPanel);

router
  .route("/:id")
  .put(requireAuth, adminOnly, updatePanel)
  .delete(requireAuth, adminOnly, deletePanel);

// ============================================================
// 🔹 Analytes inside a Panel
// ============================================================

router.get("/:panelId/analytes", requireAuth, adminOnly, getAnalytesForPanel);
router.post("/:panelId/analytes", requireAuth, adminOnly, addAnalyteToPanel);
router.delete(
  "/:panelId/analytes/:analyteId",
  requireAuth,
  adminOnly,
  removeAnalyteFromPanel
);

module.exports = router;
