const express = require("express");
const router = express.Router();
// Ensure this matches your actual controller filename (singular vs plural)
const testRequestController = require("../controllers/testRequestController");
const { protect, authorize } = require("../middleware/authMiddleware");

// ============================================================
// 🔢 Validate numeric route params
// ============================================================
router.param("id", (req, res, next, id) => {
  if (!/^\d+$/.test(String(id))) {
    return res.status(400).json({ message: "Invalid ID (must be numeric)" });
  }
  next();
});

router.param("patientId", (req, res, next, patientId) => {
  if (!/^\d+$/.test(String(patientId))) {
    return res
      .status(400)
      .json({ message: "Invalid Patient ID (must be numeric)" });
  }
  next();
});

// ============================================================
// 🧪 Test Request Routes
// ============================================================

// 🔹 ⚡ NEW: Get Popular Tests (Quick Access)
// ⚠️ MUST be defined BEFORE /:id to prevent "stats" being treated as an ID
router.get(
  "/stats/popular",
  protect,
  // Open to anyone who can create tests (Reception, Admin, etc.)
  authorize(["test_requests:create", "test_requests:view"]), 
  testRequestController.getPopularTests
);

// 🔹 List all requests
router.get(
  "/",
  protect,
  authorize(["test_requests:view", "tests:view"]),
  testRequestController.getAllTestRequests
);

// 🔹 Create a new request
router.post(
  "/",
  protect,
  authorize(["test_requests:create", "tests:create"]),
  testRequestController.createTestRequest
);

// 🔹 Get all test requests for a specific patient
router.get(
  "/patient/:patientId",
  protect,
  authorize(["patients:view", "test_requests:view"]),
  testRequestController.getTestRequestsByPatientId
);

// 🔹 Get one test request
router.get(
  "/:id",
  protect,
  authorize(["test_requests:view", "tests:view"]),
  testRequestController.getTestRequestById
);

// 🔹 🚀 NEW: Update Request (Edit Order)
// Allows adding/removing tests if status is still Pending
router.put(
  "/:id",
  protect,
  authorize(["test_requests:update", "tests:update"]),
  testRequestController.updateTestRequest
);

// 🔹 🚀 NEW: Delete Request (Cancel Order)
// Only allowed if status is Pending
router.delete(
  "/:id",
  protect,
  authorize(["test_requests:delete", "tests:delete"]),
  testRequestController.deleteTestRequest
);

// 🔹 Update request status (Verified / Released)
// ✅ ONLY people who can VERIFY in Pathology can flip the overall request status
router.patch(
  "/:id/status",
  protect,
  authorize("pathology", "verify"), // 👈 key line
  testRequestController.updateTestRequestStatus
);

// 🔹 Result Entry (Pathology)
router.get(
  "/:id/results",
  protect,
  authorize(["pathology:view", "test_requests:view"]),
  testRequestController.getResultEntry
);

router.post(
  "/:id/results",
  protect,
  authorize("pathology", "update"),
  testRequestController.saveResultEntry
);

// 🔹 Verify or Reject on legacy endpoint (if still used)
router.post(
  "/:id/verify",
  protect,
  authorize(["pathology:verify", "pathology:update"]),
  testRequestController.verifyResults
);

// 💳 PAYMENT
router.post(
  "/:id/payment",
  protect,
  authorize(["billing:create", "test_requests:update"]),
  testRequestController.processPayment
);

module.exports = router;