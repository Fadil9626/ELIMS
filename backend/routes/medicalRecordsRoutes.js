const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
// 👇 Updated import to match the new controller filename
const controller = require("../controllers/medicalRecordsController");

// Base path: /api/medical-records

// Read (View Permission)
router.get(
  "/patient/:patientId",
  protect,
  authorize(["medical_records:view", "patients:view"]), 
  controller.getPatientRecords
);

// Create (Manage Permission)
router.post(
  "/",
  protect,
  authorize("medical_records", "manage"),
  controller.createRecord
);

// Update (Manage Permission)
router.put(
  "/:id",
  protect,
  authorize("medical_records", "manage"),
  controller.updateRecord
);

// Delete (Manage Permission)
router.delete(
  "/:id",
  protect,
  authorize("medical_records", "manage"),
  controller.deleteRecord
);

module.exports = router;