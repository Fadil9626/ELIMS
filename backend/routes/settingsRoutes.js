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

/* Legacy */
router.get("/", protect, authorize("settings", "view"), getAllSettings);
router.put("/", protect, authorize("settings", "edit"), updateAllSettings);

/* Lab Profile */
router.get("/lab-profile", protect, authorize("settings", "view"), getLabProfile);
router.put("/lab-profile", protect, authorize("settings", "edit"), updateLabProfile);

/* Logo Uploads */
router.options("/lab-profile/logo/light", (_req, res) => res.sendStatus(204));
router.options("/lab-profile/logo/dark", (_req, res) => res.sendStatus(204));

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
  uploadLogo.single("file"),
  uploadLabLogoDark
);

module.exports = router;
