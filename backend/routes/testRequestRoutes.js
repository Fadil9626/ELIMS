// routes/testRequestRoutes.js
const express = require("express");
const router = express.Router();
const testRequestController = require("../controllers/testRequestController");
const { protect, authorize } = require("../middleware/authMiddleware");

// ============================================================
// 🔢 Validate numeric route params
// ============================================================
router.param("id", (req, res, next, id) => {
  if (!/^\d+$/.test(String(id)))
    return res.status(400).json({ message: "Invalid ID (must be numeric)" });
  next();
});

router.param("patientId", (req, res, next, patientId) => {
  if (!/^\d+$/.test(String(patientId)))
    return res.status(400).json({ message: "Invalid Patient ID (must be numeric)" });
  next();
});

// ============================================================
// 🧪 Test Request Routes
// ============================================================

// 🔹 List all requests
router.get("/", protect, authorize("tests", "view"), testRequestController.getAllTestRequests);

// 🔹 Create a new request
router.post("/", protect, authorize("tests", "create"), testRequestController.createTestRequest);

// 🔹 Get all test requests for a specific patient
router.get(
  "/patient/:patientId",
  protect,
  authorize("patients", "view"),
  testRequestController.getTestRequestsByPatientId
);

// 🔹 Get one test request
router.get("/:id", protect, authorize("tests", "view"), testRequestController.getTestRequestById);

// 🔹 Update request status
router.patch(
  "/:id/status",
  protect,
  authorize("tests", "update"),
  testRequestController.updateTestRequestStatus
);

// 🔹 Result Entry (Pathology)
router.get(
  "/:id/results",
  protect,
  authorize("pathology", "view"),
  testRequestController.getResultEntry
);
router.post(
  "/:id/results",
  protect,
  authorize("pathology", "update"),
  testRequestController.saveResultEntry
);

// 🔹 Verify or Reject
router.post(
  "/:id/verify",
  protect,
  authorize("pathology", "verify"),
  testRequestController.verifyResults
);

// 💳 PAYMENT — DEBUGGING (Middleware temporarily disabled)
router.post(
  "/:id/payment",
  // protect, // <-- Temporarily disabled for testing
  // authorize("billing", "create"), // <-- Temporarily disabled for testing
  testRequestController.processPayment
);

module.exports = router;