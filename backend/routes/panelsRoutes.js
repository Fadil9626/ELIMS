const express = require("express");
const router = express.Router();
const {
  getPanels,
  getTestsForPanel,
  addTestToPanel,
  createPanel,
  updatePanel,
  deletePanel,
  getAnalytesForPanel,
  addAnalyteToPanel,
  removeAnalyteFromPanel,
} = require("../controllers/panelsController");

const { protect, authorize } = require("../middleware/authMiddleware");
const adminOnly = authorize("settings", "view");

// ============================================================
// 🔹 Panels CRUD
// ============================================================

// Get all panels / Create new panel
router
  .route("/")
  .get(protect, adminOnly, getPanels)
  .post(protect, adminOnly, createPanel);

// Get, Update, or Delete a specific panel
router
  .route("/:id")
  .put(protect, adminOnly, updatePanel)
  .delete(protect, adminOnly, deletePanel);

// ============================================================
// 🔹 Tests (Analytes) within Panels
// ============================================================

// Get all analytes/tests in a panel
router.get("/:panelId/analytes", protect, adminOnly, getAnalytesForPanel);

// Add a new analyte to a panel
router.post("/:panelId/analytes", protect, adminOnly, addAnalyteToPanel);

// Remove an analyte from a panel
router.delete(
  "/:panelId/analytes/:analyteId",
  protect,
  adminOnly,
  removeAnalyteFromPanel
);

module.exports = router;
