const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  // 🧪 Tests / Analytes
  getAllTests,
  getAnalytes,
  createAnalyte,
  updateAnalyte,
  deleteAnalyte,    // ✅ Added
  toggleTestStatus, // ✅ Added

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
  createWard, // ✅ Added
  updateWard, // ✅ Added
  deleteWard, // ✅ Added
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
router.post("/wards", authorize(MODULE, "edit"), createWard);
router.put("/wards/:id", authorize(MODULE, "edit"), updateWard);
router.delete("/wards/:id", authorize(MODULE, "edit"), deleteWard);

// ============================================================
// 🧪 TESTS / ANALYTES
// ============================================================

// 📋 Full test list (Analytes + Panels)
// ✅ FIX: Changed from /tests/all to /tests to match Service File
router.get("/tests", getAllTests); 

// 🔬 Analytes only (Optional filter endpoint)
router.get("/analytes", authorize(MODULE, "view"), getAnalytes); 

// CRUD for Tests
router.post("/tests", authorize(MODULE, "edit"), createAnalyte);
router.put("/tests/:id", authorize(MODULE, "edit"), updateAnalyte);
router.delete("/tests/:id", authorize(MODULE, "edit"), deleteAnalyte); // ✅ Added Delete route

// Toggle Active Status
router.patch("/tests/:id/status", authorize(MODULE, "edit"), toggleTestStatus); // ✅ Added Toggle route

// ============================================================
// 🧩 PANELS
// ============================================================

router.get("/panels", authorize(MODULE, "view"), getPanels);
router.post("/panels", authorize(MODULE, "edit"), createPanel);
router.put("/panels/:id", authorize(MODULE, "edit"), updatePanel);
// Note: Delete panel is usually handled via deleteAnalyte if ID is passed, 
// but you can add specific deletePanel route if your controller separates them.

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