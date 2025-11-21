const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const uploadLogo = require("../middleware/uploadLogo");

// ───────────────────────────────────────────
// Controllers
// ───────────────────────────────────────────
const {
  getAllSettings,
  updateAllSettings,

  // Branding
  getLoginBranding,
  updateLoginBranding,
  uploadLoginLogo,

  getSidebarBranding,
  updateSidebarBranding,
  uploadSidebarLogo,

  getLegalBranding,
  updateLegalBranding,
  uploadLegalLogo,
  uploadLegalSignature,

  // Legacy
  getLabProfile,
  updateLabProfile,
  uploadLabLogoLight,
  uploadLabLogoDark,
} = require("../controllers/settingsController");

const {
  getMRNSettings,
  updateMRNSettings,
} = require("../controllers/mrnSettingsController"); // ✅ FIXED: Removed the "Both" typo


// ───────────────────────────────────────────
// ⚙️ SYSTEM SETTINGS (General)
// ───────────────────────────────────────────

// ✅ FIXED: This route is now PUBLIC so the login page can load branding.
router.get("/", getAllSettings);

// The PUT route remains protected
router.put("/", protect, authorize("settings", "edit"), updateAllSettings);


// ───────────────────────────────────────────
// 🧪 LAB PROFILE
// (Legacy still allowed, but not used for branding UI anymore)
// ───────────────────────────────────────────
// ✅ FIXED: This route is now PUBLIC for login page branding
router.get("/lab-profile", getLabProfile); 
router.put("/lab-profile", protect, authorize("settings", "edit"), updateLabProfile);

router.post(
  "/lab-profile/logo/light",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLabLogoLight
);

router.post(
  "/lab-profile/logo/dark",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"), // ✅ BUG FIX: Removed extra dot
  uploadLabLogoDark
);


// ───────────────────────────────────────────
// 🆔 MRN SETTINGS
// ───────────────────────────────────────────
router.get("/mrn", protect, authorize("settings", "view"), getMRNSettings);
router.put("/mrn", protect, authorize("settings", "edit"), updateMRNSettings);


// ───────────────────────────────────────────
// 🎨 BRANDING — LOGIN
// ───────────────────────────────────────────
router.get("/branding/login", protect, authorize("settings", "view"), getLoginBranding);
router.put("/branding/login", protect, authorize("settings", "edit"), updateLoginBranding);

router.post(
  "/branding/login/logo",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLoginLogo
);


// ───────────────────────────────────────────
// 🧭 BRANDING — SIDEBAR
// ───────────────────────────────────────────
router.get("/branding/sidebar", protect, authorize("settings", "view"), getSidebarBranding);
router.put("/branding/sidebar", protect, authorize("settings", "edit"), updateSidebarBranding);

router.post(
  "/branding/sidebar/logo",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadSidebarLogo
);


// ───────────────────────────────────────────
// 📄 BRANDING — LEGAL (Reports & Invoice)
// ───────────────────────────────────────────
router.get("/branding/legal", protect, authorize("settings", "view"), getLegalBranding);
router.put("/branding/legal", protect, authorize("settings", "edit"), updateLegalBranding);

router.post(
  "/branding/legal/logo",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLegalLogo
);

router.post(
  "/branding/legal/signature",
  protect,
  authorize("settings", "edit"),
  uploadLogo.single("file"),
  uploadLegalSignature
);

module.exports = router;