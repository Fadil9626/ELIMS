// routes/sampleTypeRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const {
  getSampleTypes,
  createSampleType,
  updateSampleType,
  deleteSampleType,
  restoreSampleType,
} = require("../controllers/sampleTypeController");

const MODULE = "settings";

router
  .route("/")
  .get(protect, authorize(MODULE, "view"), getSampleTypes)
  .post(protect, authorize(MODULE, "edit"), createSampleType);

router
  .route("/:id")
  .put(protect, authorize(MODULE, "edit"), updateSampleType)
  .delete(protect, authorize(MODULE, "edit"), deleteSampleType);

router.patch("/:id/restore", protect, authorize(MODULE, "edit"), restoreSampleType);

module.exports = router;
