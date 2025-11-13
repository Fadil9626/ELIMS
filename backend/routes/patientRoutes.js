const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientTestHistory,
  getPatientByMRN,
  searchPatients,
} = require("../controllers/patientController");

// ============================================================
// 🧱  PATIENT ROUTES (RBAC enforced)
// ============================================================

// 🔍 Search patients (requires Patients→View)
router.get("/search", protect, authorize("Patients", "View"), searchPatients);

// 📋 Get all patients (requires Patients→View)
router.get("/", protect, authorize("Patients", "View"), getAllPatients);

// 🆕 Register new patient (requires Patients→Create)
router.post("/", protect, authorize("Patients", "Create"), registerPatient);

// 🆔 Lookup by MRN (requires Patients→View)
router.get("/mrn/:mrn", protect, authorize("Patients", "View"), getPatientByMRN);

// 🧪 Patient test history (requires Patients→View)
router.get("/:id(\\d+)/history", protect, authorize("Patients", "View"), getPatientTestHistory);

// 🔍 Single patient details (requires Patients→View)
router.get("/:id(\\d+)", protect, authorize("Patients", "View"), getPatientById);

// ✏️ Update patient (requires Patients→Update)
router.put("/:id(\\d+)", protect, authorize("Patients", "Update"), updatePatient);

// 🗑️ Delete patient (requires Patients→Delete)
router.delete("/:id(\\d+)", protect, authorize("Patients", "Delete"), deletePatient);

module.exports = router;
