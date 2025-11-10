const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const uploadLogo = require("../middleware/uploadLogo");

const {
  getAllSettings,
  updateAllSettings,
  getLabProfile,
  updateLabProfile,
  uploadLabLogoLight,
  uploadLabLogoDark,
} = require("../controllers/settingsController");

// ✅ NEW: MRN Controller
const {
  getMRNSettings,
  updateMRNSettings,
} = require("../controllers/mrnSettingsController");

/* ==========================================================
   SYSTEM SETTINGS (Legacy global key/value)
   ========================================================== */
router.get("/", protect, authorize("settings", "view"), getAllSettings);
router.put("/", protect, authorize("settings", "edit"), updateAllSettings);

/* ==========================================================
   LAB PROFILE
   ========================================================== */
router.get("/lab-profile", protect, authorize("settings", "view"), getLabProfile);
router.put("/lab-profile", protect, authorize("settings", "edit"), updateLabProfile);

/* Upload Logo (Light) */
router.post(
  "/lab-profile/logo/light",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLabLogoLight
);

/* Upload Logo (Dark) */
router.post(
  "/lab-profile/logo/dark",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLabLogoDark
);

/* ==========================================================
   ✅ MRN CONFIGURATION
   ========================================================== */
router.get(
  "/mrn",
  protect,
  authorize("settings", "view"),
  getMRNSettings
);

router.put(
  "/mrn",
  protect,
  authorize("settings", "edit"),
  updateMRNSettings
);

module.exports = router;
