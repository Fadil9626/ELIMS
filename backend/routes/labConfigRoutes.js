const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  // 🧪 Tests / Analytes
  getAllTests,
  getAnalytes,
  createAnalyte,
  updateAnalyte,

  // 🧩 Panels
  getPanels,
  createPanel,
  updatePanel,
  recalcPanelPrice,
  getPanelAnalytes,
  addPanelAnalyte,
  removePanelAnalyte,

  // 🧠 Panel Range Overrides
  getPanelRanges,
  setPanelRangeOverride,
  deletePanelRangeOverride,

  // 🧠 Normal Ranges
  getNormalRanges,
  createNormalRange,
  updateNormalRange,
  deleteNormalRange,

  // ⚙️ Config Tables
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,

  // Departments
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,

  // Sample Types
  getSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,

  // Wards
  getWards,
} = require("../controllers/labConfigController");

const MODULE = "settings";

// ============================================================
// ✅ GLOBAL AUTH MIDDLEWARE
// ============================================================
router.use(protect);

// ============================================================
// ⚙️ CONFIG TABLES (Departments, Sample Types, Units, Wards)
// ============================================================

// 🏥 Departments
// ✅ FIX: Removed authorize() so Receptionists can see the list
router.get("/departments", getDepartments);
router.post("/departments", authorize(MODULE, "edit"), createDepartment);
router.put("/departments/:id", authorize(MODULE, "edit"), updateDepartment);
router.delete("/departments/:id", authorize(MODULE, "edit"), deleteDepartment);

// 🧫 Sample Types
// ✅ FIX: Removed authorize() for dropdowns
router.get("/sample-types", getSampleTypes);
router.post("/sample-types", authorize(MODULE, "edit"), createSampleType);
router.put("/sample-types/:id", authorize(MODULE, "edit"), updateSampleType);
router.delete("/sample-types/:id", authorize(MODULE, "edit"), deleteSampleType);

// 📏 Units
// ✅ FIX: Removed authorize()
router.get("/units", getAllUnits);
router.post("/units", authorize(MODULE, "edit"), createUnit);
router.put("/units/:id", authorize(MODULE, "edit"), updateUnit);
router.delete("/units/:id", authorize(MODULE, "edit"), deleteUnit);

// 🏨 Wards
// ✅ FIX: Removed authorize()
router.get("/wards", getWards);

// ============================================================
// 🧪 TESTS / ANALYTES
// ============================================================

// 📋 Full test list (includes analytes + panels)
// ✅ FIX: Removed authorize() so "New Request" form can load tests
router.get("/tests/all", getAllTests);

// 🔬 Analytes only
router.get("/tests", authorize(MODULE, "view"), getAnalytes); // Keeping restricted as this is usually for config view
router.post("/tests", authorize(MODULE, "edit"), createAnalyte);
router.put("/tests/:id", authorize(MODULE, "edit"), updateAnalyte);

// ============================================================
// 🧩 PANELS
// ============================================================

router.get("/panels", authorize(MODULE, "view"), getPanels);
router.post("/panels", authorize(MODULE, "edit"), createPanel);
router.put("/panels/:id", authorize(MODULE, "edit"), updatePanel);

// 🔗 Panel–Analyte Linking
router.get("/panels/:id/analytes", authorize(MODULE, "view"), getPanelAnalytes);
router.post("/panels/:id/analytes", authorize(MODULE, "edit"), addPanelAnalyte);
router.delete(
  "/panels/:id/analytes/:analyte_id",
  authorize(MODULE, "edit"),
  removePanelAnalyte
);

// 💰 Auto Recalculate Panel Price
router.post(
  "/panels/:id/recalc",
  authorize(MODULE, "edit"),
  recalcPanelPrice
);

// ============================================================
// 🧠 PANEL RANGE OVERRIDES
// ============================================================

router.get("/panels/:id/ranges", authorize(MODULE, "view"), getPanelRanges);
router.post(
  "/panels/:id/ranges/:analyte_id",
  authorize(MODULE, "edit"),
  setPanelRangeOverride
);
router.delete(
  "/panels/:id/ranges/:analyte_id",
  authorize(MODULE, "edit"),
  deletePanelRangeOverride
);

// ============================================================
// 🧠 NORMAL RANGES
// ============================================================

router.get("/tests/:id/ranges", authorize(MODULE, "view"), getNormalRanges);
router.post("/tests/:id/ranges", authorize(MODULE, "edit"), createNormalRange);
router.put("/ranges/:rangeId", authorize(MODULE, "edit"), updateNormalRange);
router.delete("/ranges/:rangeId", authorize(MODULE, "edit"), deleteNormalRange);

// ============================================================
// 🔚 EXPORT
// ============================================================
module.exports = router;